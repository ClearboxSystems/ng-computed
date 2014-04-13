/*global angular*/

angular.module('ng-computed')
    .provider('$computed', [function() {
        var extractorProvider = ['$q', function($q) {
            return function(value, callback) {
                return $q.when(value)
                    .then(callback,
                          callback,
                          callback);
            };
        }];

        this.provideExtractor = function(provider) {
            extractorProvider = provider;
        };

        this.$get = ['$injector', '$parse', '$batchedWatch', function($injector, $parse, $batchedWatch) {
            var extractor = $injector.invoke(extractorProvider);

            var readVars = null;
            var runWithDeps = function(f, args) {
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

            var val = function(expr, deep) {
                if (angular.isFunction(expr))
                    throw new Error("Function used in $computed.$val. Instead, call the function and use $computed.$val internally.");
                deep = (arguments.length < 2 || !!deep);
                if (readVars)
                    readVars[this.$id + "|" + expr + "|" + deep] = {
                        scope: this,
                        expr: expr,
                        deep: deep
                    };
                return $parse(expr)(this);
            };


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
                        // register the new dependency
                        result[key] = spec;
                        spec.deregister = $batchedWatch.call(
                            spec.scope, spec.expr, updateFn, spec.deep);
                    }
                });
                return result;
            };

            var dependentFn = function(fn, initialArgs, callback) {
                var args = initialArgs, deps = {};
                var run = function() {
                    var result = runWithDeps(fn, args);
                    if (result.thrown === undefined)
                        extractor(result.value, callback);
                    deps = fixWatches(deps, result.dependencies, run);
                    if (result.thrown !== undefined)
                        throw result.thrown;
                };
                run();
                var deregister = function() {
                    fixWatches(deps, {}, null);
                };
                deregister.setArgs = function(newArgs) {args = newArgs; run();};
                return deregister;
            };

            var computed = function(expr, fn) {
                var self = this;
                var assign = $parse(expr).assign;
                return dependentFn(fn, [], function(value) {
                    assign(self, value);
                });
            };

            return {
                $val: val,
                $computed: computed
            };
        }];
    }]);
