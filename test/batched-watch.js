/*global angular,describe,it,beforeEach,expect,module,inject*/

'use strict';

describe('$batchedWatch', function() {

    var scope, originalWatch;
    beforeEach(module('ngComputed'));
    beforeEach(inject(function($batchedWatch, $rootScope) {
        originalWatch = $rootScope.$watch;
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

    it('should run an initialisation run, even when the value hasn\'t changed', function() {
        var runs = 0;
        scope.value = 0;

        scope.$apply(function() {
            scope.$watch('value', function(a, b) {
                runs++;
            });
            expect(runs).toBe(0);
        });
        expect(runs).toBe(1);

        runs = 0;
        scope.$apply(function() {
            scope.$watch('value', function(a, b) {
                runs++;
            });
        });
        expect(runs).toBe(1);

        runs = 0;
        scope.$apply(function() {
            scope.value = 10;
            scope.$watch('value', function(a, b) {
                runs++;
            });
        });
        expect(runs).toBe(3);
    });

    it('should act (mostly) like a normal $watch function', function() {
        var batchedRuns = 0, normalRuns = 0;
        scope.value = 0;

        scope.$apply(function() {
            scope.$watch('value', function(a, b) {
                batchedRuns++;
            });
            originalWatch.call(scope, 'value', function(a, b) {
                normalRuns++;
            });
            expect(batchedRuns).toBe(0);
            expect(normalRuns).toBe(0);
        });
        expect(batchedRuns).toBe(1);
        expect(normalRuns).toBe(1);

        batchedRuns = 0, normalRuns = 0;
        var batchedRuns2 = 0, normalRuns2 = 0;
        scope.$apply(function() {
            scope.value = 10;
            scope.$watch('value', function(a, b) {
                expect(a).toBe(b); // initialisation run of this watch
                batchedRuns2++;
            });
            originalWatch.call(scope, 'value', function(a, b) {
                expect(a).toBe(b); // initialisation run of this watch
                normalRuns2++;
            });
        });
        expect(batchedRuns).toBe(1);
        expect(normalRuns).toBe(1);
        expect(batchedRuns2).toBe(1);
        expect(normalRuns2).toBe(1);
    });

});
