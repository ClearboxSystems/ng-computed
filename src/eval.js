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
                obj.trackDependencies = trackDependencies;
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
