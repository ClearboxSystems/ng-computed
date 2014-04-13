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

    it('should deregister watches which are no longer used', function() {
        var watchCounts = {};
        scope.$watch = (function($watch) {
            return function(expr) {
                watchCounts[expr] = (watchCounts[expr]|0) + 1;
                var deregister = $watch.apply(this, arguments);
                return function() {
                    watchCounts[expr] = (watchCounts[expr]|0) - 1;
                    return deregister();
                };
            };
        })(scope.$watch);

        var deregister;
        scope.$apply(function() {
            scope.cond = true;
            scope.ifTrue = 10;
            deregister = scope.$computed('result', function() {
                if (scope.$val('cond')) {
                    return scope.$val('ifTrue');
                } else {
                    return 'ten';
                }
            });
        });
        expect(scope.result).toBe(10);
        expect(watchCounts.cond).toBe(1);
        expect(watchCounts.ifTrue).toBe(1);

        scope.$apply(function() {
            scope.cond = false;
        });
        expect(scope.result).toBe('ten');
        expect(watchCounts.cond).toBe(1);
        expect(watchCounts.ifTrue).toBe(0);

        deregister();
        expect(scope.result).toBe('ten');
        expect(watchCounts.cond).toBe(0);
        expect(watchCounts.ifTrue).toBe(0);
    });

});
