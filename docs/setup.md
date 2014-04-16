# Setup

There are a few options for how to set up `ng-computed` in your
project.

## Globally available

We can add the `$computed` and `$trackedEval` at the top-level of our
application, on the `Scope` prototype, in order to have it readily
available to any scopes in our program. (We have to put it on the
`Scope` prototype rather than on the `$rootScope`, because isolate
scopes don't inherit from the `$rootScope`.)

### Override `$eval`

The `$trackedEval` service gives you a drop-in replacement for
`Scope.$eval`, so it's possible to replace `Scope.$eval` without
breaking anything.

```javascript
angular.module('app', ['ngComputed', 'ng'])
    .run(function($rootScope, $trackedEval, $computed) {
        // we have to use the prototype, otherwise isolate scopes miss out
        angular.extend($rootScope.constructor.prototype, {
            $eval: $trackedEval,
            $computed: $computed
        });
    });
```

### Don't override `$eval`

If you don't want to override `Scope.$eval` then you can bind it to a
different name instead. `ng-computed` makes no assumptions about what
name you use for `$trackedEval` (or for `$computed`).

```javascript
angular.module('app', ['ngComputed', 'ng'])
    .run(function($rootScope, $trackedEval, $computed) {
        // we have to use the prototype, otherwise isolate scopes miss out
        angular.extend($rootScope.constructor.prototype, {
            getExpressionValue: $trackedEval,
            computedProperty: $computed
        });
    });
```

## Locally available

If you don't want to add `$computed` or `$trackedEval` to the `Scope`
prototype then you are still able to use `$computed`
expressions. Within any scope you can add `$computed` and
`$trackedEval` to the scope and they will function equivalently to if
you had added them to the `Scope` prototype.

```javascript
angular.module('app', ['ngComputed', 'ng'])
    .controller('ExampleController', function($scope, $trackedEval, $computed) {
        $scope.$eval = $trackedEval;
        $scope.$computed = $computed;
    });
```
