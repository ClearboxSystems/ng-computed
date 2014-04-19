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
