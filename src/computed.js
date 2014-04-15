/*global angular*/
angular.module('ng-computed')
    .provider('$computed', [function() {
        var extractorProvider = ['$q', function($q) {
            return function(value, callback) {
                $q.when(value)
                    .then(callback, callback);
            };
        }];

        this.provideExtractor = function(provider) {
            extractorProvider = provider;
        };

        this.$get = ['$injector', '$parse', '$eval', function($injector, $parse, $eval) {
            var extractor = $injector.invoke(extractorProvider);

            var fixWatches = function(lastResult, newDependencies, updateFn) {
                var result = {};
                angular.forEach(lastResult, function(spec, key) {
                    if (key in newDependencies) {
                        result[key] = spec; // just copy the stable dependency
                    } else {
                        spec.deregister(); // deregister the obsolete dependency
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
                        
                    }
                });
                return result;
            };

            var dependentFn = function(fn, initialArgs, callback) {
                var args = initialArgs, deps = {};
                var run = function() {
                    var result = $eval.trackDependencies(fn, args);
                    if (result.thrown === undefined)
                        extractor(result.value, callback);
                    deps = fixWatches(deps, result.dependencies, run);
                    if (result.thrown !== undefined)
                        throw result.thrown;
                };
                run();
                var handle = function() {
                    fixWatches(deps, {}, null);
                };
                handle.setArgs = function(newArgs) {args = newArgs; run();};
                return handle;
            };

            var dependentChain = function(self, fns, finish, i, args) {
                if (fns.length - i == 1) {
                    // base case
                    return dependentFn(fns[i], args, function(value) {
                        finish(value);
                    });
                } else {
                    var subHandle = null;
                    var thisHandle =  dependentFn(fns[i], args, function(value) {
                        if (subHandle === null) {
                            subHandle = dependentChain(self, fns, finish, i+1, [value]);
                        } else {
                            subHandle.setArgs([value]);
                        }
                    });
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
                return dependentChain(self, fns, function(value) {
                    assign(self, value);
                    if (!self.$$phase)
                        self.$digest();
                }, 0, []);
            };

            return $computed;
        }];
    }]);
