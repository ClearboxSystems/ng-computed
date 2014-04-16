# Introduction

`ng-computed` is a library providing computed scope properties for
[AngularJS][1], similarly to [Knockout JS][2]. Computed properties
hide the majority of the complexity of managing watches for complex
calculations.

[1]: http://angularjs.org/
[2]: http://knockoutjs.com/

## Hello, world!

```javascript
$scope.hello = "hello";
$scope.world = "world";
$scope.$computed("helloWorld", function() {
    return $scope.$eval("hello") + " " + $scope.$eval("world") + "!";
});
```

`$scope.helloWorld` will be kept updated by the usual AngularJS watch
mechanisms, and it will be recalculated whenever the values of
`$scope.hello` or `$scope.world` change.
