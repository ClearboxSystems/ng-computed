# ng-computed - 0.0.2

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
world!"`, while also reacting to changes to `$scope.string`.

## Example

As an example, this is a simple translation of the KnockoutJS computed
observable example:

```javascript
angular.module("example", ["ngComputed", "ng"])
    .controller("ExampleController", function($scope, $computed, $trackedEval) {
        $scope.$computed = $computed;
        $scope.$eval = $trackedEval;
    
        $scope.firstName = "George";
        $scope.surname = "Clooney";
        $scope.$computed("fullName", function() {
            return $scope.$eval("firstName") + " " + $scope.$eval("surname");
        });
    })'
```

```html
<html ng-app="example">
    ...
    <div ng-controller="ExampleController">
        <div>
            <input ng-model="firstName">
            <input ng-model="surname">
        </div>
        <div>Hello, {{fullName}}</div>
    </div>
    ...
</html>
```

[See this example on plunker][3]

[3]: http://plnkr.co/edit/dtK8nqK72fBiGYNNE5x8

To do this in plain AngularJS would require us to manage our watches
explicitly:

```javascript
angular.module("example", ["ng"])
    .controller("ExampleController", function($scope) {
        $scope.firstName = "George"; 
        $scope.surname = "Clooney";

        $scope.$watch("firstName", function(firstName) {
            $scope.fullName = firstName + " " + $scope.surname;
        });
        $scope.$watch("surname", function(surname) {
            $scope.fullName = $scope.firstName + " " + surname;
        });
    });
```

## Setup

At the top level we can add our functions to the root scope, even
going so far as to replace the functions there:

```javascript
angular.module('app', ['ngComputed', 'ng'])
    .run(['$rootScope', '$trackedEval', '$computed', function($rootScope, $trackedEval, $computed) {
        // we have to use the prototype, otherwise isolate scopes miss out
        angular.extend($rootScope.constructor.prototype, {
            $eval: $trackedEval,
            $computed: $computed
        });
    }]);
```

For the majority of the documentation we will assume this setup,
although you can also bind to different names on the scope prototype,
or bind them on any sub-scope.

## Basic use

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
`$scope.div2 == 0` then you'll only have watches registered on
`$scope.operation` and `$scope.div2` values, but if `$scope.div2 != 0`
then you'll have three watches: `$scope.operation`, `$scope.div1` and
`$scope.div2`.

## Watches

By default, `$trackedEval` tracks all dependencies as deep equality
watches. This can be quite inefficient, especially for dependencies on
large objects, so `ng-computed` provides two tools to help:

1. `$watch` batching

    Shipped along with `ng-computed` is a service called
    `$batchedWatch`. It's a drop-in replacement for `Scope.$watch`
    which can be used as `$watch` on the root scope (or on any
    sub-scope) and will batch together expression watches where
    possible. This can mean that multiple deep watches on the same
    large object will only incur one `angular.copy`/`angular.equals`
    per change.

2. `$eval{Reference,Equal,Collection}`

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

## Extractors

By default, `$computed` will extract a value from a `$q` promise if
it's returned from the computed function:

```javascript
$scope.$computed('extracted', function() {
    var deferred = $q.defer();
    deferred.resolve('a value'); // could happen later
    return deferred.promise;
});
```

This behaviour of "extracting" a value from the result of a
`$computed` function is open for customisation through angular's
configuration mechanism. This is how the default extractor is
implemented:

```javascript
angular.module('app', ['ngComputed', 'ng'])
    .config(['$computedProvider', function($computedProvider) {
        $computedProvider.provideExtractor(['$q', function($q) {
            return function(value, callback) {
                $q.when(value).then(callback, callback);
            };
        }]);
    }]);
```

It's the extractor's responsibility to ensure that any changes are
`$digest`ed after extraction. This can usually be achieved by calling
`$rootScope.$apply()` after invoking `callback(value)` for async code.

## Transformations

Thus far we have seen `$computed` called with a function in the second
argument, but it is also valid to call it with an array of
functions. Each of these functions will be called in sequence, with
each being given the result returned by the previous function
(post-extraction).

```javascript
$scope.$computed('transformedValue', [function() {
    return $scope.$eval('baseValue');
}, function(previous) {
    return previous + $scope.$eval('valueA');
}, function(previous) {
    return previous + $scope.$eval('valueB');
}]);
```

Each of these transformation functions may have a separate set of
dependencies. If a function's dependencies change then that function
will be re-evaluated, which may trigger the evaluation of the
following functions if the return value has changed.

