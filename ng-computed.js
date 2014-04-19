(function(window, document) {

/*global angular, setTimeout*/

'use strict';

angular.module('ngComputed', ['ng']);
/*global angular,setTimeout*/

angular.module('ngComputed')
    .factory('$batchedWatch', ['$rootScope', '$exceptionHandler', function($rootScope, $exceptionHandler) {
        var watch = $rootScope.$watch;

        var nextWatchId = 1;
        var registering = false;
        var registerWatch = function(watchers, expr, deep, f) {
            var watchersForDepth = watchers[deep];
            var watchersForExpr = watchersForDepth[expr];
            if (watchersForExpr) {
                var lastArgs = watchersForExpr.lastArgs;
                if (lastArgs && !lastArgs.registering) {
                    lastArgs.registering = true;
                    try {
                        f.apply(lastArgs.self, lastArgs.args);
                    } catch (e) { $exceptionHandler(e); }
                    delete lastArgs.registering;
                }
            } else {
                watchersForExpr = {fns: {}};
                watchersForExpr.deregister = watch.call(this, expr, function() {
                    var self = this;
                    var args = arguments;
                    angular.forEach(watchersForExpr.fns, function(fn) {
                        try {
                            fn.apply(self, args);
                        } catch (e) { $exceptionHandler(e); }
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
/*global angular*/
angular.module('ngComputed')
    .provider('$computed', [function() {
        var extractorProvider = ['$q', function($q) {
            return function(value, callback) {
                $q.when(value)
                    .then(callback, callback);
            };
        }];
        var debug = false;

        this.provideExtractor = function(provider) {
            extractorProvider = provider;
        };

        this.useDebug = function(debugValue) {
            debug = debugValue;
        };

        this.$get = ['$injector', '$parse', '$trackedEval', '$log', '$exceptionHandler', function($injector, $parse, $trackedEval, $log, $exceptionHandler) {
            var extractor = $injector.invoke(extractorProvider);

            var dependencyGraph = {}; // only used in debug mode

            var fixWatches = function(lastResult, newDependencies, updateFn, debugName) {
                var result = {};
                angular.forEach(lastResult, function(spec, key) {
                    if (key in newDependencies) {
                        result[key] = spec; // just copy the stable dependency
                        if (debugName) // debug mode: update the value in the deps graph
                            dependencyGraph[debugName][key] = spec.scope.$eval(spec.expr);
                    } else {
                        spec.deregister(); // deregister the obsolete dependency
                        if (debugName && dependencyGraph[debugName]) // debug mode: delete the dependency
                            delete dependencyGraph[debugName][key];
                    }
                });
                angular.forEach(newDependencies, function(spec, key) {
                    if (key in lastResult) {
                        // this was already covered in the "older" loop
                    } else {
                        var onUpdate = function(val, old) {updateFn();};
                        // register the new dependency
                        result[key] = spec;
                        switch (spec.type) {
                        case "equal":
                        case "reference":
                            spec.deregister = spec.scope.$watch(spec.expr, onUpdate, spec.type == "equal");
                            break;
                        case "collection":
                            spec.deregister = spec.scope.$watchCollection(spec.expr, onUpdate);
                            break;
                        default:
                            console.error("Unknown watch type: ", spec.type, " Not tracking dependency on: ", spec.expr);
                        }
                        if (debugName) // debug mode: put the value in the deps graph
                            dependencyGraph[debugName][key] = spec.scope.$eval(spec.expr);
                    }
                });
                return result;
            };

            var dependentFn = function(self, fn, initialArgs, callback, debugName) {
                var args = initialArgs, deps = {};
                if (debugName)
                    dependencyGraph[debugName] = {};
                var run = function() {
                    var result = $trackedEval.trackDependencies.call(self, fn, args);
                    if (result.thrown === undefined) {
                        extractor(result.value, callback);
                    } else {
                        extractor(undefined, callback);
                        $exceptionHandler(result.thrown);
                    }
                    deps = fixWatches(deps, result.dependencies, run, debugName);
                };
                run();
                var deregistrationHandle = function() {
                    if (angular.isFunction(fn.destroy))
                        fn.destroy();
                    fixWatches(deps, {}, null, debugName);
                    if (debugName)
                        delete dependencyGraph[debugName];
                };
                deregistrationHandle.setArgs = function(newArgs) {
                    if (!angular.equals(args, newArgs)) { // same args, don't re-evaluate
                        args = angular.copy(newArgs);
                        run();
                    }
                };
                return deregistrationHandle;
            };

            var dependentChain = function(self, fns, finish, i, args, debugName) {
                if (fns.length - i == 1) {
                    // base case
                    return dependentFn(self, fns[i], args, function(value) {
                        finish(value);
                    }, (debugName && debugName + "#" + i));
                } else {
                    var subHandle = null;
                    var thisHandle = dependentFn(self, fns[i], args, function(value) {
                        if (subHandle === null) {
                            subHandle = dependentChain(self, fns, finish, i+1, [value], debugName);
                        } else {
                            subHandle.setArgs([value]);
                        }
                    }, (debugName && debugName + "#" + i));
                    var dependentHandle = function() {
                        if (subHandle)
                            subHandle();
                        thisHandle();
                    };
                    dependentHandle.setArgs = function(args) { thisHandle.setArgs(args); };
                    return dependentHandle;
                }
            };

            var $computed = function(expr, fn) {
                var self = this;
                var assign = $parse(expr).assign;
                var fns = (angular.isArray(fn) ? fn : [fn]);
                var deregister = dependentChain(self, fns, function(value) {
                    assign(self, value);
                }, 0, [], (debug ? this.$id + "|" + expr : null));
                var deregisterOn = this.$on('$destroy', function() {
                    deregister();
                });
                return function() {
                    deregisterOn();
                    deregister();
                };
            };

            $computed.dependencyGraph = function() {
                return (debug ? dependencyGraph : null);
            };

            return $computed;
        }];
    }]);
})(window, document);/*global angular*/
angular.module('ngComputed')
    .provider('$trackedEval', [function() {
        var defaultType = "equal";
        this.setDefaultWatchType = function(type) {
            if (type == "equal" || type == "reference" || type == "collection") {
                defaultType = type;
            } else {
                throw new Error("Cannot default to watch of type '" + type + "': unknown type");
            }
        };

        this.$get = ['$parse', function($parse) {
            var readVars = null;
            var trackDependencies = function(f, args) {
                var old = readVars;
                readVars = {};
                try {
                    return {
                        value: f.apply(this, args),
                        dependencies: readVars
                    };
                } catch (e) {
                    return {
                        thrown: e,
                        dependencies: readVars
                    };
                } finally {
                    readVars = old;
                }
            };

            var dependencyTrackingEval = function(expr, type, locals) {
                if (readVars) {
                    if (angular.isFunction(expr))
                        throw new Error("Function used in $trackedEval while tracking dependencies. Instead, call the function and use $trackedEval internally.");
                    readVars[this.$id + "|" + expr + "|" + type] = {
                        scope: this,
                        expr: expr,
                        type: type
                    };
                }
                return $parse(expr)(this, locals);
            };

            var $evalEqual = function(expr, locals) {
                return dependencyTrackingEval.call(this, expr, "equal", locals);
            };
            var $evalReference = function(expr, locals) {
                return dependencyTrackingEval.call(this, expr, "reference", locals);
            };
            var $evalCollection = function(expr, locals) {
                return dependencyTrackingEval.call(this, expr, "collection", locals);
            };

            var addAllToExportObject = function(obj) {
                obj.$evalEqual = $evalEqual;
                obj.$evalReference = $evalReference;
                obj.$evalCollection = $evalCollection;
                obj.trackDependencies = trackDependencies;
                Object.defineProperty(obj, 'trackDependencies', {enumerable: false});
            };

            addAllToExportObject($evalEqual);
            addAllToExportObject($evalReference);
            addAllToExportObject($evalCollection);

            if (defaultType == "equal") {
                return $evalEqual;
            } else if (defaultType == "reference") { 
                return $evalReference;
            } else if (defaultType == "collection") {
                return $evalCollection;
            } else {
                throw new Error("Cannot create watch of default type '" + defaultType + "': unknown type");
            }
        }];
    }]);
