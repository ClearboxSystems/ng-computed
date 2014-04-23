# Watches

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

2. `$eval{Reference,Equal,Group,Collection}`

    The `$trackedEval` service is not just a simple function, there
    are in fact three variations of `$trackedEval` which each track
    the dependency as one of the varieties of watch:

    * `$evalReference`, as a reference watch
    * `$evalEqual`, as a deep equality watch
    * `$evalGroup`, as a group watch (expects an array of exprs)
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
            $trackedEvalProvider.setDefaultWatchType('equal' /* or 'reference' or 'group' or 'collection'*/);
    }]);
    ```
