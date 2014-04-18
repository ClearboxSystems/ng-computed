/*global angular,describe,it,beforeEach,expect,module,inject,runs,waitsFor*/

'use strict';

describe('$computed', function() {

    beforeEach(function() {
        // we'd like our own custom matcher, please
        this.addMatchers({
            toBeOneOf: function(expecteds) {
                var actual = this.actual;
                return expecteds.some(function(expected) {
                    return actual === expected;
                });
            }
        });
    });

    var scope, q, timeout, extractor;
    beforeEach(module('ngComputed'));
    beforeEach(function() {
        angular.module('ngComputed')
            .config(function($computedProvider) {
                $computedProvider.provideExtractor(function($q) {
                    return function(value, callback) {
                        extractor(value, callback);
                    };
                });
            });
    });
    beforeEach(inject(function($computed, $trackedEval, $rootScope, $q, $timeout) {
        $rootScope.$eval = $trackedEval;
        $rootScope.$computed = $computed;
        scope = $rootScope.$new();
        q = $q;
        timeout = $timeout;
        extractor = function(value, callback) {
            $q.when(value).then(callback, callback);
        };
    }));

    it('should run transformation functions in sequence', function() {
        var inc = function(x){return x+1;};
        var deregister;
        scope.$apply(function() {
            scope.val = 10;
            deregister = scope.$computed('value', [function() {
                return scope.$eval('val');
            }, inc, inc]);
        });
        expect(scope.value).toBe(12);

        scope.$apply(function() {
            scope.val = 25;
        });
        expect(scope.value).toBe(27);

        deregister();
        scope.$apply(function() {
            scope.val = 325;
        });
        expect(scope.value).toBe(27);
    });

    it('should only re-run relevant steps in a transformation sequence after an update', function() {
        var deregister, topRuns = 0, aRuns = 0, bRuns = 0;
        scope.$apply(function() {
            scope.val = 10;
            scope.a = 1;
            scope.b = 2;
            deregister = scope.$computed('value', [function() {
                topRuns++;
                return scope.$eval('val');
            }, function(x) {
                aRuns++;
                return x + scope.$eval('a');
            }, function(x) {
                bRuns++;
                return x + scope.$eval('b');
            }]);
        });
        expect(scope.value).toBe(13);
        expect(topRuns).toBe(2);
        expect(aRuns).toBe(2);
        expect(bRuns).toBe(2);

        topRuns = 0, aRuns = 0, bRuns = 0;
        scope.$apply(function() {
            scope.a = 2;
        });
        expect(scope.value).toBe(14);
        expect(topRuns).toBe(0);
        expect(aRuns).toBe(1);
        expect(bRuns).toBe(1);

        aRuns = 0, bRuns = 0;
        scope.$apply(function() {
            scope.b = 1;
        });
        expect(scope.value).toBe(13);
        expect(topRuns).toBe(0);
        expect(aRuns).toBe(0);
        expect(bRuns).toBe(1);

        aRuns = 0, bRuns = 0;
        scope.$apply(function() {
            scope.val = 0;
        });
        expect(scope.value).toBe(3);
        expect(topRuns).toBe(1);
        expect(aRuns).toBe(1);
        expect(bRuns).toBe(1);

        deregister();
        topRuns = 0, aRuns = 0, bRuns = 0;
        scope.$apply(function() {
            scope.val = 325;
            scope.a = 0;
            scope.b = 0;
        });
        expect(scope.value).toBe(3);
        expect(topRuns).toBe(0);
        expect(aRuns).toBe(0);
        expect(bRuns).toBe(0);
    });

    it("should, by default, extract values from promises", function(done) {
        var deregister, deferred;
        scope.$apply(function() {
            deregister = scope.$computed('value', function() {
                deferred = q.defer();
                return deferred.promise;
            });
        });
        expect(scope.value).toBeUndefined();

        scope.$apply(function() {
            deferred.resolve(10); // we can resolve in a digest cycle and it'll propagate immediately
        });
        expect(scope.value).toBe(10);
    });

    describe("running extractors", function() {
        var extractorRunCount;
        beforeEach(function() {
            extractorRunCount = 0;
            extractor = function(value, callback) {
                extractorRunCount++;
                // expect to always be run in a digest cycle, somehow
                expect(scope.$$phase).toBeOneOf(["$digest", "$apply"]); 
                q.when(value).then(callback);
            };
        });

        it("should run simple extractors in a $digest", function() {
            scope.$apply(function() {
                scope.x = 0;
                scope.$computed("value", function() {
                    return scope.$eval("x") + 1;
                });
            });
            expect(extractorRunCount).toBe(2);
        });

        it("should run promise extractors in a $digest", function() {
            var deferred = q.defer();
            scope.$apply(function() {
                scope.$computed("value2", function() {
                    return deferred.promise;
                });
            });
            // don't need to resolve, because the extractor runs immediately
            expect(extractorRunCount).toBe(1);
        });

        it("should run extractors on transformations in a $digest", function() {
            scope.$apply(function() {
                scope.a = 1;
                scope.b = 2;
                scope.$computed("sum", [function() {
                    return scope.$eval("a");
                }, function(val) {
                    return scope.$eval("b");
                }]);
            });
            expect(extractorRunCount).toBe(4);
            scope.$apply(function() {
                scope.a = 10;
            });
            expect(extractorRunCount).toBe(6);
        });

        it("should run extractors on transformations from promises in a $digest", function() {
            var deferred = q.defer();
            scope.$apply(function() {
                scope.$computed("sum", [function() {
                    return deferred.promise;
                }, function(val) {
                    return val + 1;
                }]);
            });
            expect(extractorRunCount).toBe(1);
            scope.$apply(function() {
                deferred.resolve(10);
            });
            expect(extractorRunCount).toBe(2);
        });
        
    });

    it('should update dependent values transitively in a single digest cycle (if values are available)', function() {
        var deregister1, deregister2;
        scope.$apply(function() {
            scope.val = 10;
            deregister1 = scope.$computed('value', function() {
                var d = q.defer();
                d.resolve(scope.$eval('val'));
                return d.promise;
            });
            deregister2 = scope.$computed('value2', function() {
                return scope.$eval('value');
            });
        });
        expect(scope.value).toBe(10);
        scope.$apply();
        expect(scope.value2).toBe(10);

        scope.$apply(function() {
            scope.val = 25;
        });
        expect(scope.value).toBe(25);
        expect(scope.value2).toBe(25);

        deregister1();
        deregister2();
        scope.$apply(function() {
            scope.val = 325;
        });
        expect(scope.value).toBe(25);
        expect(scope.value2).toBe(25);
    });

    it('should update dependent values until deregistration', function() {
        var deregister;
        scope.$apply(function() {
            scope.val = 10;
            deregister = scope.$computed('value', function() {
                return scope.$eval('val');
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
                if (scope.$eval('cond')) {
                    return scope.$eval('ifTrue');
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

    it('should deregister the computing function itself, if it requests it', function() {
        var registered = false, deregister = null;
        var computingFn = function() {
            registered = true;
            return true;
        };
        computingFn.destroy = function() {
            registered = false;
        };

        scope.$apply(function() {
            deregister = scope.$computed('value', computingFn);
        });
        expect(registered).toBe(true);

        deregister();
        expect(registered).toBe(false);
    });

    it('should deregister itself when the scope is destroyed', function() {
        var deregister, destroyed = false;
        var computeFn = function() {return 10;};
        computeFn.destroy = function() { destroyed = true; };
        scope.$apply(function() {
            deregister = scope.$computed('value', computeFn);
        });

        expect(destroyed).toBe(false);
        scope.$destroy();
        expect(destroyed).toBe(true);
    });

});
