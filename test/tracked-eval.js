/*global angular,describe,it,beforeEach,expect,module,inject*/

'use strict';

describe('$computed', function() {

    ["equal", "reference", "collection"].forEach(function(type) {
        describe('with ' + type + ' watch', function() {
            var scope, run, rootScope;
            beforeEach(module('ngComputed'));
            beforeEach(function() {
                angular.module('ngComputed')
                    .config(function($trackedEvalProvider) {
                        $trackedEvalProvider.setDefaultWatchType(type);
                    });
            });

            beforeEach(inject(function($computed, $trackedEval, $rootScope) {
                $rootScope.$eval = $trackedEval;
                angular.extend($rootScope, $trackedEval);
                expect($rootScope.trackDependencies).toBeUndefined(); // should be non-enumerable
                $rootScope.$computed = $computed;
                rootScope = $rootScope;
                scope = $rootScope.$new();

                run = function(args) {
                    return $trackedEval.trackDependencies
                        .call(this, arguments[0], Array.prototype.slice.call(arguments, 1));
                };
            }));

            var findDependency = function(dependencies, expr, scope) {
                for (var key in dependencies)
                    if (dependencies[key] &&
                        dependencies[key].expr === expr &&
                        (scope == null || dependencies[key].scope === scope))
                        return dependencies[key];
                return null;
            };

            it('should behave like eval', function() {
                scope.v = 'v';
                var result = run(function() {
                    return scope.$eval("v")
                        + scope.$eval("v", {v: 'al'})
                        + scope.$eval("w", {w: 'ue'});
                });
                expect(result.value).toBe('value');
                expect(result.thrown).toBeUndefined();

                var dep = findDependency(result.dependencies, 'v');
                expect(dep).toBeDefined();
                expect(dep.type).toBe(type);
                expect(dep.scope).toBe(scope);

                // this dependency on 'w' shouldn't exist, but is hard to detect
                dep = findDependency(result.dependencies, 'w');
                expect(dep).toBeDefined();
                expect(dep.type).toBe(type);
                expect(dep.scope).toBe(scope);
            });

            it('should report accessed variables directly', function() {
                scope.dependent = 'value';
                var result = run(function() {
                    return scope.$eval("dependent");
                });
                expect(result.value).toBe('value');
                expect(result.thrown).toBeUndefined();

                var dep = findDependency(result.dependencies, 'dependent');
                expect(dep).toBeDefined();
                expect(dep.type).toBe(type);
                expect(dep.scope).toBe(scope);
            });

            it('should report accessed variables directly with correct watch type', function() {
                scope.dependent = 'value';
                var result, dep;
                result = run(function() {
                    return scope.$evalEqual("dependent");
                });
                dep = findDependency(result.dependencies, 'dependent');
                expect(dep.type).toBe('equal');

                result = run(function() {
                    return scope.$evalReference("dependent");
                });
                dep = findDependency(result.dependencies, 'dependent');
                expect(dep.type).toBe('reference');

                result = run(function() {
                    return scope.$evalCollection("dependent");
                });
                dep = findDependency(result.dependencies, 'dependent');
                expect(dep.type).toBe('collection');
            });


            it('should report multiple accessed variables', function() {
                scope.first = 10; scope.second = 20;
                var result = run(function() {
                    return scope.$eval("first") + scope.$eval("second");
                });
                expect(result.value).toBe(30);
                expect(result.thrown).toBeUndefined();

                ["first", "second"].forEach(function(expr) {
                    var dep = findDependency(result.dependencies, expr);
                    expect(dep).toBeDefined();
                    expect(dep.type).toBe(type);
                    expect(dep.scope).toBe(scope);
                });
            });

            it('should not report variables not actually accessed', function() {
                scope.first = false;
                scope.second = 10;
                var result = run(function() {
                    if (scope.$eval('first')) {
                        return scope.$eval('second');
                    } else {
                        return null;
                    }
                });
                expect(result.value).toBe(null);
                expect(result.thrown).toBeUndefined();

                var dep = findDependency(result.dependencies, 'first');
                expect(dep).toBeDefined();
                expect(dep.type).toBe(type);
                expect(dep.scope).toBe(scope);

                dep = findDependency(result.dependencies, 'second');
                expect(dep).toBeNull();
            });

            it('should report variables accessed within other functions', function() {
                var fn = function() {
                    return scope.$eval('first');
                };

                scope.first = 'value';
                var result = run(function() {
                    return fn();
                });
                expect(result.value).toBe('value');
                expect(result.thrown).toBeUndefined();

                var dep = findDependency(result.dependencies, 'first');
                expect(dep).toBeDefined();
                expect(dep.type).toBe(type);
                expect(dep.scope).toBe(scope);

                dep = findDependency(result.dependencies, 'second');
                expect(dep).toBeNull();
            });


            it('should still report dependencies if the function throws', function() {
                scope.first = 'value';
                var result = run(function() {
                    scope.$eval('first');
                    throw new Error("something");
                });
                expect(result.value).toBeUndefined();
                expect(result.thrown).toBeDefined();

                var dep = findDependency(result.dependencies, 'first');
                expect(dep).toBeDefined();
                expect(dep.type).toBe(type);
                expect(dep.scope).toBe(scope);
            });

            it('should track which scope the variable comes from', function() {
                var scope2 = rootScope.$new();
                scope2.first = 'shmalue';

                scope.first = 'value';
                var result = run(function() {
                    return scope.$eval('first') + scope2.$eval('first');
                });
                expect(result.value).toBe('valueshmalue');
                expect(result.thrown).toBeUndefined();

                var dep = findDependency(result.dependencies, 'first', scope);
                expect(dep).toBeDefined();
                expect(dep.type).toBe(type);
                expect(dep.scope).toBe(scope);

                dep = findDependency(result.dependencies, 'first', scope2);
                expect(dep).toBeDefined();
                expect(dep.type).toBe(type);
                expect(dep.scope).toBe(scope2);
            });
        });
    });
});
