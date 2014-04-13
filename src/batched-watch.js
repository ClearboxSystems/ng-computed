/*global angular,setTimeout*/

angular.module('ng-computed')
    .factory('$batchedWatch', ['$rootScope', function($rootScope) {
        var watch = $rootScope.$watch;

        var run = function(f) {
            try {
                return f();
            } catch (e) {
                setTimeout(function(){throw e;}, 0);
                return null;
            }
        };

        var nextWatchId = 1;
        var registerWatch = function(watchers, expr, deep, f) {
            var watchersForDepth = watchers[deep];
            var watchersForExpr = watchersForDepth[expr];
            if (watchersForExpr) {
                var lastArgs = watchersForExpr.lastArgs;
                if (lastArgs)
                    f.apply(lastArgs.self, lastArgs.args);
            } else {
                watchersForExpr = {
                    fns: {}
                };
                watchersForExpr.deregister = watch.call(this, expr, function() {
                    var self = this;
                    var args = arguments;
                    angular.forEach(watchersForExpr.fns, function(fn) {
                        fn.apply(self, args);
                    });
                    watchersForExpr.lastArgs = {
                        self: self,
                        args: args
                    };
                }, deep);
                watchersForDepth[expr] = watchersForExpr;
            }

            var id = nextWatchId++;
            watchers[deep][expr].fns[id] = f; 
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
