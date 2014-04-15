/*global angular*/
angular.module('app', ['ng', 'ngComputed'])
    .run(['$rootScope', '$trackedEval', '$computed', '$batchedWatch', function($rootScope, $trackedEval, $computed, $batchedWatch) {
        console.log($rootScope);
        angular.extend($rootScope.constructor.prototype, {
            $eval: $trackedEval,
            $computed: $computed,
            $watch: $batchedWatch
        });
    }])
    .directive('computingDirective', function() {
        return {
            restrict: "E",
            scope: {},
            template: "ar: {{ computedValue }}",
            controller: ['$scope', function($scope) {
                $scope.value = 10;
                $scope.$computed('computedValue', function() {
                    return 10 * $scope.$eval('value');
                });
            }]
        };
    })
    .controller('ExampleCtrl', ['$scope', function($scope) {
        $scope.$computed('computedValue', function() {
            if ($scope.$eval('useCustom')) {
                return $scope.$eval('customValue');
            } else {
                return "default value";
            }
        });
    }]);
