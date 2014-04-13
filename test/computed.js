/*global angular,describe,it,beforeEach,expect,module,inject*/

'use strict';

describe('$computed', function() {

    var scope;
    beforeEach(module('ng-computed'));
    /*beforeEach(function() {
        angular.module('ng-computed')
            .config(function($computedProvider) {
                $computedProvider.provideExtractor(['$q', function() {
                    return function(value, callback) {
                        callback(value + 1);
                    };
                }]);
            });
    });*/
    beforeEach(inject(function($computed, $rootScope) {
        $rootScope.$val = $computed.$val;
        $rootScope.$computed = $computed.$computed;
        scope = $rootScope.$new();
    }));

    it('should update dependent values until deregistration', function() {
        var deregister;
        scope.$apply(function() {
            scope.val = 10; 
            deregister = scope.$computed('value', function() {
                return scope.$val('val');
            });
        });
        expect(scope.value).toBe(10);

        scope.$apply(function() {
            scope.val = 25;
        });
        expect(scope.value).toBe(25);

        deregister();
        scope.$apply(function() {
            scope.val = 325;
        });
        expect(scope.value).toBe(25);
    });

});
