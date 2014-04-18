# Extractors

Often when a value is returned for a `$computed` property there is
some more work to be done. In times like this it's helpful to extract
a value from some sort of a container. To this end `ng-computed` has a
concept of an *extractor*.

An extractor is a function which is called to retrieve a value from a
container. The function is given the value returned to `$computed` and
a callback with which to deliver the value. This callback may be
called as many times as desired, and each time it is called it will
continue the computation (whether that be setting a property on the
scope or calling the next function in line - see the section on
transformations).

## A note about the `$digest` cycle

It's the extractor's responsibility to ensure that any changes are
`$digest`ed after extraction. The extractor may assume that it will
have been invoked in either the `$apply` or `$digest` phase, and it
should only invoke `callback` in either of those phases.

If `callback` is invoked synchronously then nothing further needs to
be done, but if `callback` is invoked asynchronously, and outside the
angular `$digest` cycle, then you must wrap the invocation of
`callback` with a `$rootScope.apply` call, like this:

```javascript
$rootScope.$apply(function() {
    callback(value);
});
```

This is usually not a problem when using angular services (such as
`$q` or `$timeout`), but when using third-party promises or other
callback mechanisms it must be considered.

## Default configuration

By default, `$computed` will extract a value from a `$q` promise if
it's returned from the computed function:

```javascript
$scope.$computed('extracted', function() {
    var deferred = $q.defer();
    deferred.resolve('a value'); // could happen later
    return deferred.promise;
});
```

As an example for how to specify custom extractors, this is equivalent
to how the default extractor is implemented:

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

## Example custom configuration

One possible form of an extractor will attempt to extract values from
"thunks". A thunk can be modelled as a function with zero arguments,
which must be invoked to retrieve the value it contains.

An extractor which dereferences thunks for `$computed` properties can
be easily implemented:

```javascript
angular.module('app', ['ngComputed', 'ng'])
    .config(['$computedProvider', function($computedProvider) {
        $computedProvider.provideExtractor([function() {
            return function(value, callback) {
                // because these are each called synchronously,
                // they are already in a $digest cycle
                if (angular.isFunction(value)) {
                    callback(value());
                } else {
                    callback(value);
                }
            };
        }]);
    }]);
```

If our application is configured with this extractor then the
following `$computed` property will be set to the value `10`.

```javascript
$scope.$computed('extracted', function() {
    return function() {return 10;};
});
```

