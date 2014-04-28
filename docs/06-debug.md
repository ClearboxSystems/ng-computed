# Debug

**Note: the debug API is likely to change in future, so it's best not
  to rely on its current state**

`ng-computed`, in the process of managing dependencies, builds an
implicit dependency graph of your expressions. This dependency graph
can be made explicit by enabling the debug mode on `$computed`:

```javascript
angular.module('app', ['ng', 'ngComputed'])
    .config(function($computedProvider) {
        $computedProvider.useDebug(true);
    })
```

This enables the `$computed.dependencyGraph()` function, which will
return a javascript object mapping each expression to another object
mapping from each of its dependencies' expressions to their values. An
example will make this clear:

```javascript
$scope.firstName = "George";
$scope.surname = "Clooney";
$scope.$computed("fullName", function() {
    return $scope.$eval("firstName") + " " + $scope.$eval("surname");
});
```

This example will create a dependency graph like the following (assume
`$scope.$id = 01C`):

```javascript
{
    "01C|fullName#0": {
        "01C|firstName|equal": "George",
        "01C|surname|equal": "Clooney"
    }
}
```

Top level expressions are encoded as `scopeId|expression#number`,
where `scopeId` is the id of the scope it's created on, `expression`
is the expression that is being written to, and `number` is the step
in the transformation sequence for this expression (see
[the section on transformations][1] for more details).

Dependencies are encoded as "scopeId|expression|type", where `scopeId`
is the id of the scope being watched, `expression` is the expression,
and `type` is the type of watch this dependency is (equal, reference
or collection).

The value at the end is the value which was taken last time
`$computed` evaluated that body. This should correspond to the value
it took at the last `$digest` cycle.

## Drawing dependencies

On the `$computed` service there is a method `drawDependencies` which
will draw a dependency graph for you. This function uses [d3][2] to
draw a force-directed graph of the current state of the dependencies
in your application (and it will update in real-time as dependencies
change). This is a global view of all dependencies, not a view of any
one particular scope.

In order to avoid explicitly depending on `d3`, you must provide the
`d3` object to this method when you call it. An example invocation can
be found in the [basic example][3] provided with `ng-computed`.

```javascript
$scope.$computed.drawDependencies(d3, $element.find('svg')[0], {
    width: 500,
    height: 100
});
```

At present the element provided as the second argument must be an
`svg` element, and the only options in the options map which are
meaningful are `width` and `height`. This function may be improved in
future, but it is not a priority.

[1]: ./05-transformations.md
[2]: http://d3js.org/
[3]: https://raw.githack.com/ClearboxSystems/ng-computed/master/examples/basic-example/index.html
