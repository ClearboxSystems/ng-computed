# ng-computed

Computed properties for [AngularJS][1], à la [Knockout JS][2].

[1]: http://angularjs.org/
[2]: http://knockoutjs.com/

## Summary

`ng-computed` lets you write computed properties without worrying
about which values to register a `$watch` on and when.

```javascript
$scope.string = "hello";
$scope.$computed('computedValue', function() {
    return $scope.$eval('string') + " world!";
});
```

In this case, `$scope.computedValue` will take on the value `"hello
world!"`, while also reacting to changes to `$scope.string`. While
this case is almost trivial, the more complex cases are made more
complex only by the complexity of the computing function.

## Setup

At the top level we can add our functions to the root scope, even
going so far as to replace the functions there:

```javascript
angular.module('app', ['ngComputed', 'ng'])
    .run(['$rootScope', '$trackedEval', '$computed', function($rootScope, $trackedEval, $computed) {
        $rootScope.$eval = $trackedEval;
        $rootScope.$computed = $computed;
    }]);
```
For the majority of the documentation we will assume this setup,
although it is also possible to bind to different names on the root
scope, or to bind these values on any sub-scope.

## Average use

For an average use case there shouldn't be much need to think
particularly hard about how you write computed properties. Just write
a function to calculate the value from other values on the scope,
using `$eval` to read from the scope instead of doing so yourself.

As a relatively meaningless example:

```javascript
$scope.$computed('computedValue', function() {
    switch ($scope.$eval('operation')) {
    case 'addition':
        return $scope.$eval('add1') + $scope.$eval('add2');
    case 'subtraction':
        return $scope.$eval('sub1') - $scope.$eval('sub2');
    case 'multiplication':
        return $scope.$eval('mul1') * $scope.$eval('mul2');
    case 'division':
        if ($scope.$eval('div2') == 0) {
            return null;
        } else {
            return $scope.$eval('div1') / $scope.$eval('div2');
        }
    }
});
```

From this, `ng-computed` will work out all the details of what needs
to be watched, and when. So, if `$scope.operation == "division"` and
`scope.div2 == 0` then you'll only have watches registered on those
two values, but if `scope.div2 != 0` then you'll have three watches:
`scope.operation`, `scope.div1` and `scope.div2`.

# Watches

By default, `$trackedEval` tracks all dependencies as deep equality
watches. This can be quite inefficient, especially for dependencies on
large objects, so `ng-computed` provides two tools to help:

1. `$watch` batching

    Shipped along with `ng-computed` is a service called
    `$batchedWatch`. It's a drop-in replacement for `Scope.$watch`
    which can be used as `$watch` on the top level (or on any
    sub-scope) and will batch together expression watches where
    possible. This can mean that multiple deep watches on the same
    large object will only incur one `angular.copy`/`angular.equals`
    per change.

2. `$eval{Reference,Equal,Collection`

    The `$trackedEval` service is not just a simple function, there
    are in fact three variations of `$trackedEval` which each track
    the dependency as one of the varieties of watch:

    * `$evalReference`, as a reference watch
    * `$evalEqual`, as a deep equality watch
    * `$evalCollection`, as a collection watch

    These can be placed on a scope and used as normal:

    ```javascript
$scope.$evalReference = $trackedEval.$evalReference;
$scope.$computed('computedValue', function() {
    return $scope.$evalReference('shallowWatchedValue');
});
    ```

    By default `$trackedEval` is the `$evalEquals` function, but it
    can be configured using angular's configuration mechanism:

    ```javascript
angular.module('app', ['ngComputed', 'ng'])
    .config(['$trackedEvalProvider', function($trackedEvalProvider) {
        $trackedEvalProvider.setDefaultWatchType('equal' /* or 'reference' or 'collection'*/);
    }]);
    ```
