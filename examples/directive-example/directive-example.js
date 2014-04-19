/*global angular*/
angular.module('app', ['ng', 'ngComputed'])
    .config(function($computedProvider) {
        $computedProvider.useDebug(true);
    })
    .run(['$rootScope', '$trackedEval', '$computed', '$batchedWatch', function($rootScope, $trackedEval, $computed, $batchedWatch) {
        angular.extend($rootScope.constructor.prototype, {
            $eval: $trackedEval,
            $computed: $computed,
            $watch: $batchedWatch
        });
    }])
    .directive('computingDirective', function() {
        return {
            restrict: "E",
            scope: {
                value: "="
            },
            template: "|| value: {{ computedValue }} ||",
            controller: ['$scope', function($scope) {
                $scope.$computed('computedValue', function() {
                    return 10
                        + $scope.$eval('value')
                        + $scope.$parent.$eval('readByDirective');
                    // using $scope.$parent is bad form, but will still work
                    // the watch will be registered on the $parent scope,
                    // but will trigger an update of this computed value
                });
            }]
        };
    })
    .controller('ExampleCtrl', ['$scope', function($scope) {
        $scope.inputValue = 10;
        $scope.readByDirective = 100;
    }]);
