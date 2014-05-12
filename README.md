# ng-computed

Computed properties for [AngularJS][1], à la [Knockout JS][2].

    bower install ng-computed

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

As an example, this is a simple translation of the KnockoutJS [computed
observable example][3]:

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
    });
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

[See this example on plunker][4]


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

`ng-computed` will do the work of managing watches for you. See
[this example][5] to see it in action.

[3]: http://knockoutjs.com/documentation/computedObservables.html
[4]: http://plnkr.co/edit/dtK8nqK72fBiGYNNE5x8?p=preview
[5]: http://plnkr.co/edit/12Z9ppZCpHcfpigXulPy?p=preview

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

## Documentation

See [/docs/complete.org][6] for our current documentation.

[6]: ./docs/complete.org
