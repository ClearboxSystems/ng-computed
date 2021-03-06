/*global angular,setTimeout*/

angular.module('ngComputed')
    .factory('$batchedWatch', ['$rootScope', '$parse', '$exceptionHandler', function($rootScope, $parse, $exceptionHandler) {
        var watch = $rootScope.$watch;

        var nextWatchId = 1;
        var registering = false;
        var registerWatch = function(watchers, expr, deep, f) {
            var watchersForDepth = watchers[deep];
            var watchersForExpr = watchersForDepth[expr];
            var registerRealWatch = !watchersForExpr;
            if (registerRealWatch) {
                watchersForExpr = {
                    fns: {},
                    deregister: watch.call(this, expr, function(value, oldValue, scope) {
                        var self = this;
                        var args = arguments;
                        angular.forEach(watchersForExpr.fns, function(fn) {
                            try {
                                fn.run.call(self, value, (fn.hasRun ? oldValue : value), scope);
                                fn.hasRun = true;
                            } catch (e) { $exceptionHandler(e); }
                        });
                    }, deep)
                };
                watchersForDepth[expr] = watchersForExpr;
            }

            var id = nextWatchId++;
            watchersForExpr.fns[id] = {
                run: f,
                hasRun: false
            };
            if (!registerRealWatch) {
                // note the shallow watch: no sense incurring the copy when we don't care
                // this watch will get fired once, then deregistered, so just do a shallow watch
                var deregister = watch.call(this, expr, function(value, oldValue, scope) {
                    var fn = watchersForExpr.fns[id];
                    if (fn && !fn.hasRun) {
                        fn.run.call(this, value, oldValue, scope);
                        fn.hasRun = true;
                    }
                    deregister(); // only ever do the initialisation part of this
                }, false);
            }
            return id;
        };

        var isEmpty = function(obj) {
            for (var name in obj)
                return false;
            return true;
        };

        var deregisterWatch = function(watchers, expr, deep, id) {
            var watchersForDepth = watchers[deep];
            if (watchersForDepth[expr]) {
                var watchersForExpr = watchersForDepth[expr];
                var fns = watchersForExpr.fns;
                delete fns[id];
                if (isEmpty(fns)) {
                    watchersForExpr.deregister(); 
                    delete watchers[deep][expr];
                }
            }
        };

        var batchedWatch = function(expr, f, deep) {
            var scope = this;
            deep = !!deep; // deep is a boolean, so normalise it
            if (angular.isFunction(expr)) {
                // we can't do much meaningful with a function,
                // so fallback to a normal watch
                return watch.call(this, expr, f, deep);
            } else {
                if (!angular.isFunction(f)) {
                    var parsed = $parse(f);
                    f = function(val, old, scope){ parsed(scope); }; // we need it to be a function
                }
                var watchers;
                if (this.hasOwnProperty('$$batchedWatchers')) {
                    watchers = this.$$batchedWatchers;
                } else {
                    watchers = {true: {}, false: {}};
                }
                var id = registerWatch.call(scope, watchers, expr, deep, f);
                var deregister = function() {deregisterWatch.call(scope, watchers, expr, deep, id);};

                this.$$batchedWatchers = watchers;
                return deregister;
            }
        };

        return batchedWatch;
    }]);
