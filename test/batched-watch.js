/*global angular,describe,it,beforeEach,expect,module,inject*/

'use strict';

describe('$batchedWatch', function() {

    var scope;
    beforeEach(module('ngComputed'));
    beforeEach(inject(function($batchedWatch, $rootScope) {
        $rootScope.$watch = $batchedWatch;
        scope = $rootScope.$new();
    }));

    var testRegistrationAndDeregistration = function(type, depth, number) {
        it(
            'should allow ' + depth + 
                ' watch registration with a' + (type == 'function' ? ' ' : 'n ') + type +
                (number > 1 ? ' and ' + number + ' watchers' : ''),
            function() {
                var watchRuns = 0, deregister = [];
                scope.value = 0; 

                scope.$apply(function() {
                    // the watch runs once here
                    for (var i = 0; i < number; ++i) {
                        deregister[i] = scope.$watch(
                            (type == 'expression' ? "value" : function(){ return scope.value; }),
                            function(value) {
                                watchRuns++;
                            }, (depth == "deep"));
                    }
                });

                if (type == "expression") // our optimisation only works for expressions
                    expect(scope.$$watchers.length).toBe(1); // we should only have one angular watch

                scope.$apply(function() {
                    scope.value++; // runs the watch a second time
                });
                expect(watchRuns).toBe(2 * number);

                watchRuns = 0;
                // clear out half of the registered things (rounding up)
                for (var i = 0; i < Math.ceil(number / 2); ++i) {
                    deregister[i]();
                }
                scope.$apply(function() {
                    scope.value++; // doesn't run the watch a third time
                });

                // we expect half to still be running (rounding down)
                expect(watchRuns).toBe(Math.floor(number / 2));
            });
    };

    // test by running 11 watches of each type, and seeing how they go
    testRegistrationAndDeregistration("expression", "deep", 11);
    testRegistrationAndDeregistration("expression", "shallow", 11);
    testRegistrationAndDeregistration("function", "deep", 11);
    testRegistrationAndDeregistration("function", "shallow", 11); 

    it('should add a new $$batchedWatchers key, even if one exists on the prototype chain', function() {
        var subscope = scope.$new();

        scope.$apply(function() {
            scope.$watch('value', function() {});
        });
        expect(subscope.$$batchedWatchers).toBe(scope.$$batchedWatchers);

        subscope.$apply(function() {
            subscope.$watch('value', function() {});
        });
        expect(subscope.$$batchedWatchers).toNotBe(scope.$$batchedWatchers); // new $$batchedWatchers
    });

    it('should not blow up if passed a non-function listener', function() {
        scope.$apply(function() {
            scope.$watch('value', undefined);
        });
    });

    it('should run as an expression if a string listener is provided', function() {
        var x = 0;
        scope.$apply(function() {
            scope.value = 0;
            scope.incCounter = function() { x++; };
            scope.$watch('value', 'incCounter()');
        });
        expect(x).toBe(1);

        scope.$apply(function() {
            scope.value = 100;
        });
        expect(x).toBe(2);
    });

});
