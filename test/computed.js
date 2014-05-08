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

    [true, false].forEach(function(debug) {
        describe('with debug ' + (debug ? 'on' : 'off'), function() {

            var scope, q, timeout, extractor;
            beforeEach(module('ngComputed'));
            beforeEach(function() {
                angular.module('ngComputed')
                    .config(function($computedProvider) {
                        $computedProvider.useDebug(debug);
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

            it('should only run ones on initialisation', function() {
                var deregister, runs = 0;
                scope.$apply(function() {
                    scope.value = 0;
                    deregister = scope.$computed('computedValue', function() {
                        runs++;
                        return scope.$eval('value');
                    });
                });
                expect(runs).toBe(1);
            });

            it('should re-run $computed function on update', function() {
                var deregister, runs = 0;
                scope.$apply(function() {
                    scope.value = 0;
                    deregister = scope.$computed('computedValue', function() {
                        runs++;
                        return scope.$eval('value');
                    });
                });
                expect(runs).toBe(1);

                runs = 0;
                scope.$apply(function() {
                    scope.value = 1;
                });
                expect(runs).toBe(1);
            });

            it('should re-run $computed function only once on dependency change', function() {
                var deregister, runs = 0;
                scope.$apply(function() {
                    scope.cond = false;
                    scope.value = 0;
                    deregister = scope.$computed('computedValue', function() {
                        runs++; 
                        return scope.$eval('cond') ? scope.$eval('value') : null;
                    });
                });
                expect(runs).toBe(1);

                runs = 0;
                scope.$apply(function() {
                    scope.value = 1;
                });
                expect(runs).toBe(0);

                runs = 0;
                scope.$apply(function() {
                    scope.cond = true;
                });
                expect(runs).toBe(1);

                runs = 0;
                scope.$apply(function() {
                    scope.value = 2;
                });
                expect(runs).toBe(1);
            });

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

            it('should do what is expected in the transformation documentation example', function() {
                var run1 = 0, run2 = 0, run3 = 0, run4 = 0;
                scope.$apply(function() {
                    scope.a = 3;
                    scope.b = 5;
                    scope.c = 23;
                    scope.$computed('sumIsEven', [function() {
                        run1++;
                        return scope.$eval('a') % 2; /* 1 */
                    }, function(prev) {
                        run2++;
                        return (prev + scope.$eval('b')) % 2; /* 2 */
                    }, function(prev) {
                        run3++;
                        return (prev + scope.$eval('c')) % 2; /* 3 */
                    }, function(val) {
                        run4++;
                        return val == 0; /* 4 */
                    }]);
                });

                expect(scope.sumIsEven).toBe(false);
                expect(run1).toBe(1);
                expect(run2).toBe(1);
                expect(run3).toBe(1);
                expect(run4).toBe(1);

                run1 = run2 = run3 = run4 = 0;
                scope.$apply(function() {
                    scope.a = 5;
                });
                expect(scope.sumIsEven).toBe(false);
                expect(run1).toBe(1);
                expect(run2).toBe(0);
                expect(run3).toBe(0);
                expect(run4).toBe(0);

                run1 = run2 = run3 = run4 = 0;
                scope.$apply(function() {
                    scope.b = 6;
                });
                expect(scope.sumIsEven).toBe(true);
                expect(run1).toBe(0);
                expect(run2).toBe(1);
                expect(run3).toBe(1);
                expect(run4).toBe(1);
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
                expect(topRuns).toBe(1);
                expect(aRuns).toBe(1);
                expect(bRuns).toBe(1);

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
                    expect(extractorRunCount).toBe(1);
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
                    expect(extractorRunCount).toBe(2);
                    scope.$apply(function() {
                        scope.a = 10;
                    });
                    expect(extractorRunCount).toBe(4);
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

            it('shouldn\'t use old promise if a new one is returned before resolution', function() {
                var def1 = q.defer(), def2 = q.defer();
                scope.$apply(function() {
                    scope.returnFirst = true;
                    scope.$computed('computed', function() {
                        return (scope.$eval('returnFirst') ? def1.promise : def2.promise);
                    });
                });

                scope.$apply(function() {
                    scope.returnFirst = false;
                });
                expect(scope.computed).toBeUndefined();

                // now both promises have been returned for scope.computed,
                // but def1.promise has been superceded by def2.promise

                scope.$apply(function() {
                    def2.resolve(100);
                });
                expect(scope.computed).toBe(100);

                scope.$apply(function() {
                    def1.resolve(0); // this should be ignored now
                });
                expect(scope.computed).toBe(100);
            });

            it('shouldn\'t use promise if deregistered before resolution', function() {
                var deferred = q.defer();
                var deregister;
                scope.$apply(function() {
                    deregister = scope.$computed('computed', function() {
                        return deferred.promise;
                    });
                });
                expect(scope.computed).toBeUndefined();

                deregister();
                expect(scope.computed).toBeUndefined();

                scope.$apply(function() {
                    deferred.resolve(10);
                });
                expect(scope.computed).toBeUndefined();
            });

            var pairsToObject = function() {
                var result = {};
                for (var i = 0, len = arguments.length; i < len; ++i) {
                    result[arguments[i][0]] = arguments[i][1];
                }
                return result;
            };

            if (debug) {
                it('should populate the dependency graph when running', function() {
                    var deregister;
                    scope.$apply(function() {
                        scope.a = 10;
                        scope.b = 20;
                        deregister = scope.$computed('value', [function() {
                            return scope.$eval('a');
                        }, function(a) {
                            return a + scope.$eval('b');
                        }]);
                    });

                    var id = scope.$id;
                    var dependencyGraph = scope.$computed.dependencyGraph();

                    expect(dependencyGraph).toEqual(pairsToObject(
                        [id + "|value#0", pairsToObject([id + "|a|equal", 10])],
                        [id + "|value#1", pairsToObject([id + "|b|equal", 20])]
                    ));
                    deregister();
                    expect(dependencyGraph).toEqual({});
                });
            } else {
                it('should not populate the dependency graph when running', function() {
                    var deregister;
                    scope.$apply(function() {
                        scope.a = 10;
                        scope.b = 20;
                        deregister = scope.$computed('value', [function() {
                            return scope.$eval('a');
                        }, function(a) {
                            return a + scope.$eval('b');
                        }]);
                    });
                    var dependencyGraph = scope.$computed.dependencyGraph();

                    expect(dependencyGraph).toBe(null);
                    deregister();
                    expect(dependencyGraph).toBe(null);
                });
            }
        });
    });
});
