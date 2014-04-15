/*global angular*/
angular.module('app', ['ng', 'ngComputed'])
    .run(['$rootScope', '$eval', '$computed', function($rootScope, $eval, $computed) {
        $rootScope.$eval = $eval;
        $rootScope.$computed = $computed;
    }])
    .controller('ExampleCtrl', ['$scope', function($scope) {
        $scope.$watch = (function($watch) {
            return function(expr, fn, deep) {
                var scope = this;
                scope.logs = scope.logs || [];
                if (expr == 'useCustom' || expr == 'customValue')
                    scope.logs.unshift("Registering " + (deep ? 'deep' : 'shallow') + " watch on expression: " + expr);
                var deregister = $watch.apply(scope, arguments);
                return function() {
                    if (expr == 'useCustom' || expr == 'customValue')
                        scope.logs.unshift("Deregistering " + (deep ? 'deep' : 'shallow') + " watch on expression: " + expr);
                    deregister();
                };
            };
        })($scope.$watch);
        
        $scope.$computed('computedValue', function() {
            if ($scope.$eval('useCustom')) {
                return $scope.$eval('customValue');
            } else {
                return "default value";
            }
        });
    }]);
