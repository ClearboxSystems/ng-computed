/*global angular*/
angular.module('app', ['ng', 'ngComputed'])
    .config(function($computedProvider) {
        $computedProvider.useDebug(true);
    })
    .run(function($rootScope, $trackedEval, $computed) {
        $rootScope.$eval = $trackedEval;
        $rootScope.$computed = $computed;
    })
    .controller('ExampleCtrl', ['$scope', function($scope) {
        $scope.useCustomValue = false;
        $scope.customValue = "";
        $scope.$computed('computedValue', function() {
            if ($scope.$eval('useCustomValue')) {
                return $scope.$eval('customValue');
            } else {
                return "default value";
            }
        });
    }]);
