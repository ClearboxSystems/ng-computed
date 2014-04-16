# Transformations

The `$computed` method is usually called with a single function as
it's second argument. This function is used to calculate the value
which is eventually used as the scope's property. Another valid form
is to call `$computed` with an array of functions as the second
argument. Each of these functions will be called in sequence, with
each being given the result returned by the previous function
(post-extraction).

## Synchronous code

```javascript
$scope.$computed('transformedValue', [function() {
    return $scope.$eval('baseValue');
}, function(previous) {
    return previous + $scope.$eval('valueA');
}, function(previous) {
    return previous + $scope.$eval('valueB');
}]);
```

Each of these transformation functions will have its dependencies
tracked independently. If a function's dependencies change then that
function will be re-evaluated, which may trigger the evaluation of the
following functions if the return value has changed. In any case,
`ng-computed` will attempt to re-evaluate the minimal number of
functions necessary to calculate an updated final value.

## Asynchronous benefits

When used for synchronous code the benefit of extractors is not
particularly clear. While it can provide some benefits in terms of
dependency tracking it is usually clearer to simply write one function
to perform the composition of each of the functions.

For async code transformations become far more useful. Each function
result goes through an extraction (see the section on extractors)
prior to being passed to the next function in the chain. This means,
with the default extractor, that the next function will be run with
the resolution of a promise if one is returned.

```javascript
$scope.$computed("foundInPage", [function() {
    return $http.get($scope.$eval("url"));
}, function(page) {
    if ($scope.$eval("isShouting"))
        return page.data.toUpperCase(); // I like shouting HTML
    return page.data;
}, function(html) {
    return html.indexOf($scope.$eval("searchTerm")) > -1;
}]);
```
