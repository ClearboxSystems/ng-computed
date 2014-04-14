/*global angular*/
angular.module('app', ['ng', 'ng-computed'])
    .controller('ExampleCtrl', ['$scope', '$computed', function($scope, $computed) {
        $scope.$computed = $computed.$computed;
        $scope.$val = $computed.$val;

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
            if ($scope.$val('useCustom')) {
                return $scope.$val('customValue');
            } else {
                return "default value";
            }
        });
    }]);
