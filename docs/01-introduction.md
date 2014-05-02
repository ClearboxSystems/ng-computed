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


## A comparative example

In order to compare the `ng-computed` approach with vanilla AngularJS,
let's build a simple application.

For this example we're going to be leveraging `ng-computed`'s
automatic promise unwrapping and transformation functions to
demonstrate a simple and easily understood implementation of a simple
specification.

### Specification

Our application will be a little toy application to display a file and
filter the lines which are shown. The user will be able to do five
things:

* Select a file to display from a list of files (static list of
  arbitrary files)
* Enter a string to filter the file's lines by
* Toggle whether the string match will be case sensitive (on the
  original file) or not
* Change the output case of the file (unchanged, upper, lower)
* Freeze the filter output so future modifications to the form won't
  change the matching lines output

We're going to be working with a DOM that looks like this:

```html
<div>
  <h2>pure AngularJS</h2>
  <div><label>Data:
    <select ng-model="url">
      <option value="./index.html">index.html</option>
      <option value="./names.txt">names</option>
      <option value="./nouns.txt">nouns</option>
    </select>
  </label></div>
  <div><label>Search: <input type="text" ng-model="search"></label></div>
  <div><label><input type="checkbox" ng-model="caseSensitive"> case sensitive</label></div>
  <div><label>Output case:
    <select ng-model="outputCase">
      <option value="default" selected>Leave unchanged</option>
      <option value="lower">Lowercase</option>
      <option value="upper">Uppercase</option>
    </select>
  </label></div>
  <div><button ng-click="stop()">Freeze output!</button></div>
  <div>
    <h2>Matching lines:</h2>
    <pre>
      <div ng-repeat="line in matchingLines track by $index">{{ line }}</div>
    </pre>
  </div>
</div>
```

### Using pure AngularJS

To give some idea of how this could look, let's start by implementing
our specification in pure AngularJS. No `ng-computed` stuff here!

```javascript
module.controller("PureController", function($scope, $http) {
        var fixCase = function(string) {
            if ($scope.caseSensitive)
                return string;
            return string.toLocaleLowerCase();
        };

        var recalculateMatches = function() {
            $scope.lines = $scope.lines || [];
            var term = fixCase($scope.search || "");
            $scope.matchingLines = $scope.lines.filter(function(line) {
                return fixCase(line).indexOf(term) > -1;
            }).map(function(line) {
                switch($scope.outputCase) {
                case "lower": return line.toLocaleLowerCase();
                case "upper": return line.toLocaleUpperCase();
                default: return line;
                };
            });
        };

        $scope.url = "./index.html";
        $scope.outputCase = "default";
        var watches = [
            $scope.$watch("url", function(url) {
                if (!url) {
                    $scope.lines = [];
                    recalculateMatches();
                } else  {
                    $http.get(url).then(function(response) {
                        $scope.lines = response.data.split("\n");
                        recalculateMatches();
                    });
                }
            }),
            $scope.$watch("search", recalculateMatches),
            $scope.$watch("caseSensitive", recalculateMatches),
            $scope.$watch("outputCase", recalculateMatches)
        ];
        $scope.stop = function() {
            watches.forEach(function(deregister) {
                deregister();
            });
        };
    });
```

This implements our specification, but it's not really pretty. All the
processing takes place in the `recalculateMatches` function, which
might have to do a bit more work than necessary because it doesn't
know which value has been updated. In particular, changing the value
of `$scope.outputCase` would require `recalculateMatches` to reprocess
the entire file from scratch.

In this case the cost of processing is relatively small, but that
extra work is being performed nonetheless.

### Using `ng-computed`

Now, let's have a look at what an implementation might look like with
`ng-computed`.

```javascript
module.controller("ComputedController", function($scope, $http, $computed, $trackedEval) {
        angular.extend($scope, {$computed: $computed, $eval: $trackedEval});
        var fixCase = function(string) {
            if ($scope.$eval("caseSensitive"))
                return string;
            return string.toLocaleLowerCase();
        };

        $scope.url = "./index.html";
        $scope.outputCase = "default";
        $scope.stop = $scope.$computed("matchingLines", [function() {
            var url = $scope.$eval("url");
            if (!url) return {data: ""};
            return $http.get(url);
        }, function(response) {
            var lines = (response.data || "").split("\n");
            var term = fixCase($scope.$eval("search") || "");
            return lines.filter(function(line) {
                return fixCase(line).indexOf(term) > -1;
            });
        }, function(lines) {
            switch ($scope.$eval("outputCase")) {
            case "lower": return lines.map(function(line){return line.toLocaleLowerCase();});
            case "upper": return lines.map(function(line){return line.toLocaleUpperCase();});
            default: return lines;
            }
        }]);
    })
```

This has a few advantages over the pure AngularJS implementation:

* The only values which are stored on the scope are the values being
  used in the actual view. In particular, `response` and `lines` are
  both kept out of the scope (in the pure AngularJS the `lines` are
  stored on the scope as a temporary storage location)
* Dependencies are tracked automatically, so the function processing
  the `$http` response doesn't need to know that `fixCase` uses
  `$scope.caseSensitive` internally; this also avoids needing to
  explicitly register the watches separately to the computation itself
* Each of the functions given to `$computed` is only run if its
  dependencies (or arguments) have changed, meaning we can avoid
  reprocessing the entire file if we just want to change the case of
  the output
* A single deregistration function removes the entire computation
  (this makes implementing the last point in the specification much
  easier)

A pure AngularJS implementation could be written to fix some of these
issues, but particularly the point of automatic dependency management
is difficult to solve without an implementation similar to
`ng-computed`. As a practical note, writing this example with
`ng-computed` was relatively simple and had few errors, whereas
writing it in pure AngularJS resulted in a number of minor mistakes
which had to be corrected (forgetting to register watches, in
particular).

This example can be seen in practice at
[/examples/comparison/index.html][3].

For more of an explanation of how `ng-computed` works, please see
[/docs][4].

[3]: https://raw.githack.com/ClearboxSystems/ng-computed/master/examples/comparison/index.html
[4]: ../docs
