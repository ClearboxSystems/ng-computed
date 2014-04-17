/*global angular*/
angular.module("app", ["ngComputed", "ng"])
    .controller("ComputedController", function($scope, $http, $computed, $trackedEval) {
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
            console.log(url);
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
        }]); // lines 4-30 : 26 lines, 1 white
    })
    .controller("PureAngularController", function($scope, $http) {
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
        }; // lines 33-75 : 42 lines, 2 white
    });
