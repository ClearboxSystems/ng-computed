/*global angular*/

angular.module('ng-computed')
    .provider('$eval', [function() {
        var defaultType = "equal";
        this.defaultWatchType = function(type) {
            if (type == "equal" || type == "reference" || type == "collection") {
                defaultType = type;
            } else {
                throw new Error("Cannot default to watch of type '" + type + "': unknown type");
            }
        };

        this.$get = ['$parse', function($parse) {
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

            var dependencyTrackingEval = function(expr, type, locals) {
                if (readVars) {
                    if (angular.isFunction(expr))
                        throw new Error("Function used in $eval while tracking dependencies. Instead, call the function and use $eval internally.");
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
                obj.trackDependencies = runWithDeps;
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
    }])
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
                        // register the new dependency
                        result[key] = spec;
                        switch (spec.type) {
                        case "equal":
                        case "reference":
                            spec.deregister = spec.scope.$watch(spec.expr, updateFn, spec.type == "equal");
                            break;
                        case "collection":
                            spec.deregister = spec.scope.$watchCollection(spec.expr, updateFn);
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
                var deregister = function() {
                    fixWatches(deps, {}, null);
                };
                deregister.setArgs = function(newArgs) {args = newArgs; run();};
                return deregister;
            };

            var $computed = function(expr, fn) {
                var self = this;
                var assign = $parse(expr).assign;
                return dependentFn(fn, [], function(value) {
                    assign(self, value);
                });
            };

            return $computed;
        }];
    }]);
