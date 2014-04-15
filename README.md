# ng-computed

Computed properties for [AngularJS][1].

[1]: http://angularjs.org/


## Summary

`ng-computed` lets you write computed properties without worrying
about which values to register a `$watch` on and when. You just write
some code like this:

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

and `ng-computed` will work out all the details of what needs to be
watched. So, if `$scope.operation == "division"` and `scope.div2 == 0`
then you'll only have watches registered on those two values, but if
`scope.div2 != 0` then you'll have three watches: `scope.operation`,
`scope.div1` and `scope.div2`.

We achieve this by providing a drop-in replacement for `Scope.$eval`
in our `$trackedEval` service. It behaves exactly the same as `$eval`
in most contexts, but also allows us to track which values are
accessed within a `$computed` block.
