(function(window, document) {

/*global angular, setTimeout*/

'use strict';

angular.module('ngComputed', ['ng']);
/*global angular*/
var dependencyDrawingFunction = function($rootScope, $computed) {
    var tickFn = function(root) {
        return function() {
            root.selectAll('line.edge')
                .attr({
                    "x1": function(d) { return d.source.x; },
                    "y1": function(d) { return d.source.y; },
                    "x2": function(d) { return d.target.x; },
                    "y2": function(d) { return d.target.y; }
                });
            root.selectAll('g.node')
                .attr('transform', function(d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });
        };
    };

    var setUpForce = function(d3, tick, width, height) {
        var force = d3.layout.force()
                .charge(-300)
                .gravity(0.1)
                .distance(50)
        //.linkDistance(40)
                .size([width, height]);

        force.on('tick', tick);

        return force;
    };

    var setUpElement = function(svg, id) {
        var root = svg.append("g");
        root.append("defs")
            .call(function(defs) {
                defs.append("marker")
                    .attr("id", "arrowhead" + id)
                    .attr("viewBox", "0 -5 10 10")
                    .attr("refX", 15)
                    .attr("markerWidth", 6)
                    .attr("markerHeight", 6)
                    .attr("orient", "auto")
                    .call(function(marker) {
                        marker.append("path")
                            .attr("d", "M0,-5L10,0L0,5");
                    });
            });
        return root;
    };

    var calculateNodes = function(graph) {
        var nodes = {};
        for (var expr in graph) {
            var realExpr = expr.substr(0, expr.lastIndexOf("#"));
            nodes[realExpr] = true;
            for (var dep in graph[expr]) {
                var realDep = dep.substr(0, dep.lastIndexOf("|"));
                nodes[realDep] = true;
            }
        }
        return nodes;
    };

    var calculateEdges = function(graph, nodeList) {
        var edges = [];
        for (var expr in graph) {
            var realExpr = expr.substr(0, expr.lastIndexOf("#"));
            for (var dep in graph[expr]) {
                var realDep = dep.substr(0, dep.lastIndexOf("|"));
                edges.push({
                    source: nodeList.indexOf(realDep),
                    target: nodeList.indexOf(realExpr)
                });
            }
        }
        return edges;
    };

    var calculateNodesAndEdges = function(graph, lastNodes) {
        var nodes = calculateNodes(graph);
        var nodeIds = Object.keys(nodes);
        var edges = calculateEdges(graph, nodeIds);

        var nodeList = nodeIds.map(function(id) {
            var lastNode = lastNodes[id] || {};
            nodes[id] = {
                id: id, name: id,
                x: lastNode.x, y: lastNode.y,
                fixed: lastNode.fixed
            };
            return nodes[id];
        });

        return {
            nodes: nodes,
            nodeList: nodeList,
            edges: edges
        };
    };

    var trimDependencyValues = function(graph) {
        var result = {};
        for (var expr in graph) {
            var subResult = {};
            for (var dep in graph[expr]) {
                subResult[dep] = true;
            }
            result[expr] = subResult;
        }
        return result;
    };

    var lastId = 0;
    return function(d3, element, options) {
        var id = ++lastId;
        var width = options.width;
        var height = options.height;

        var zoom = d3.behavior.zoom()
                .on("zoom", function() {
                    var trans = d3.event.translate;
                    var scale = d3.event.scale;
                    root.attr("transform",
                              "translate(" + trans + ") " +
                              "scale(" + scale + ")");
                });

        var selection = d3.select(element)
                .attr({"width": width, "height": height});

        var background = selection
            .append("rect")
            .attr({
                "fill": "#FFF",
                "width": width,
                "height": height
            })
            .call(zoom);

        var root = setUpElement(selection, id);
        var tick = tickFn(root);
        var force = setUpForce(d3, tick, options.width, options.height);

        var dragMove = d3.behavior.drag()
                .on("dragstart", function() {
                    force.stop();
                })
                .on("drag", function(d) {
                    d.px += d3.event.dx;
                    d.py += d3.event.dy;
                    d.x += d3.event.dx;
                    d.y += d3.event.dy;
                    d.fixed = true;
                    tick();
                })
                .on("dragend", function(d) {
                    force.resume();
                });

        var lastTrimmed = null, lastNodes = {};
        var deregister = $rootScope.$watch(function() {
            var trimmed = trimDependencyValues($computed.dependencyGraph());
            if (!angular.equals(lastTrimmed, trimmed)) {
                lastTrimmed = angular.copy(trimmed);

                var nodesAndEdges = calculateNodesAndEdges($computed.dependencyGraph(), lastNodes);
                lastNodes = nodesAndEdges.nodes;

                var edges = root.selectAll("line.edge")
                        .data(nodesAndEdges.edges);
                edges.enter().append("line")
                    .attr({
                        "class": "edge",
                        "marker-end": "url(#arrowhead" + id + ")"
                    })
                    .style({
                        "stroke": "rgb(200, 200, 200)",
                        "stroke-width": "1.5px",
                        "fill": "none"
                    });
                edges.exit().remove();

                var nodes = root.selectAll("g.node")
                        .data(nodesAndEdges.nodeList, function(node) {
                            return node.id;
                        });
                nodes.enter().append("g")
                    .attr({"class": "node"})
                    .on('mouseover', function() {
                        d3.select(this)
                            .select("text")
                            .style({"display": "block"});
                    })
                    .on('mouseout', function(d) {
                        if (!d.displayLabel) {
                            d3.select(this)
                                .select("text")
                                .style({"display": "none"});
                        }
                    })
                    .call(function(selection) {
                        selection.append("text")
                            .style({"display": "none"})
                            .attr({"dx": 5, "dy": 5})
                            .text(function(d){return d.name;});
                        selection.append("circle")
                            .attr({"r": 5})
                            .style({"fill": "#aaa"});
                    })
                    .call(dragMove);
                nodes.exit().remove();

                force
                    .nodes(nodesAndEdges.nodeList)
                    .links(nodesAndEdges.edges)
                    .start();
            }
        });

        deregister.resize = function(width, height) {
            selection.style({"width": width, "height": height});
            background.attr({width: width, height: height});
            force.size([width, height]);
        };

        return deregister;
    };
};
/*global angular,setTimeout*/

angular.module('ngComputed')
    .factory('$batchedWatch', ['$rootScope', '$parse', '$exceptionHandler', '$timeout', function($rootScope, $parse, $exceptionHandler, $timeout) {
        var watch = $rootScope.$watch;

        var nextWatchId = 1;
        var registering = false;
        var registerWatch = function(watchers, expr, deep, f) {
            var watchersForDepth = watchers[deep];
            var watchersForExpr = watchersForDepth[expr];
            if (!watchersForExpr) {
                watchersForExpr = {
                    fns: {},
                    deregister: watch.call(this, expr, function(value, oldValue, scope) {
                        var self = this;
                        var args = arguments;
                        angular.forEach(watchersForExpr.fns, function(fn) {
                            try {
                                fn.run.call(self, value, (fn.hasRun ? oldValue : value), scope);
                                fn.hasRun = true;
                            } catch (e) { $exceptionHandler(e); }
                        });
                    }, deep)
                };
                watchersForDepth[expr] = watchersForExpr;
            }

            var id = nextWatchId++;
            watchersForExpr.fns[id] = {
                run: f,
                hasRun: false
            };
            var deregister = watch.call(this, expr, function(value, oldValue, scope) {
                var fn = watchersForExpr.fns[id];
                if (fn && !fn.hasRun) {
                    fn.run.call(this, value, oldValue, scope);
                    fn.hasRun = true;
                }
                deregister(); // only ever do the initialisation part of this
            });
            return id;
        };

        var isEmpty = function(obj) {
            for (var name in obj)
                return false;
            return true;
        };

        var deregisterWatch = function(watchers, expr, deep, id) {
            var watchersForDepth = watchers[deep];
            if (watchersForDepth[expr]) {
                var watchersForExpr = watchersForDepth[expr];
                var fns = watchersForExpr.fns;
                delete fns[id];
                if (isEmpty(fns)) {
                    watchersForExpr.deregister(); 
                    delete watchers[deep][expr];
                }
            }
        };

        var batchedWatch = function(expr, f, deep) {
            var scope = this;
            deep = !!deep; // deep is a boolean, so normalise it
            if (angular.isFunction(expr)) {
                // we can't do much meaningful with a function,
                // so fallback to a normal watch
                return watch.call(this, expr, f, deep);
            } else {
                if (!angular.isFunction(f)) {
                    var parsed = $parse(f);
                    f = function(val, old, scope){ parsed(scope); }; // we need it to be a function
                }
                var watchers;
                if (this.hasOwnProperty('$$batchedWatchers')) {
                    watchers = this.$$batchedWatchers;
                } else {
                    watchers = {true: {}, false: {}};
                }
                var id = registerWatch.call(scope, watchers, expr, deep, f);
                var deregister = function() {deregisterWatch.call(scope, watchers, expr, deep, id);};

                this.$$batchedWatchers = watchers;
                return deregister;
            }
        };

        return batchedWatch;
    }]);
/*global angular,dependencyDrawingFunction*/
angular.module('ngComputed')
    .provider('$computed', [function() {
        var extractorProvider = ['$q', function($q) {
            return function(value, callback) {
                $q.when(value)
                    .then(callback, callback);
            };
        }];
        var debug = false;

        this.provideExtractor = function(provider) {
            extractorProvider = provider;
        };

        this.useDebug = function(debugValue) {
            debug = debugValue;
        };

        this.$get = ['$injector', '$parse', '$trackedEval', '$log', '$exceptionHandler', '$rootScope', function($injector, $parse, $trackedEval, $log, $exceptionHandler, $rootScope) {
            var extractor = $injector.invoke(extractorProvider);

            var dependencyGraph = {}; // only used in debug mode

            var fixWatches = function(lastResult, newDependencies, updateFn, debugName) {
                var result = {};
                angular.forEach(lastResult, function(spec, key) {
                    if (key in newDependencies) {
                        result[key] = spec; // just copy the stable dependency
                        if (debugName) // debug mode: update the value in the deps graph
                            dependencyGraph[debugName][key] = spec.scope.$eval(spec.expr);
                    } else {
                        spec.deregister(); // deregister the obsolete dependency
                        if (debugName && dependencyGraph[debugName]) // debug mode: delete the dependency
                            delete dependencyGraph[debugName][key];
                    }
                });
                angular.forEach(newDependencies, function(spec, key) {
                    if (key in lastResult) {
                        // this was already covered in the "older" loop
                    } else {
                        // register the new dependency
                        result[key] = spec;
                        switch (spec.type) {
                        case "equal":
                        case "reference":
                            spec.deregister = spec.scope.$watch(spec.expr, updateFn, spec.type == "equal");
                            break;
                        case "collection":
                            spec.deregister = spec.scope.$watchCollection(spec.expr, updateFn);
                            break;
                        default:
                            console.error("Unknown watch type: ", spec.type, " Not tracking dependency on: ", spec.expr);
                        }
                        if (debugName) // debug mode: put the value in the deps graph
                            dependencyGraph[debugName][key] = spec.scope.$eval(spec.expr);
                    }
                });
                return result;
            };

            var dependentFn = function(self, fn, initialArgs, callback, debugName) {
                var args = initialArgs, deps = {};
                if (debugName)
                    dependencyGraph[debugName] = {};
                var updateCount = 0;
                var incUpdates = function(){updateCount++;};
                var run = function() {
                    var result = $trackedEval.trackDependencies.call(self, fn, args);
                    if (result.thrown === undefined) {
                        extractor(result.value, callback);
                    } else {
                        extractor(undefined, callback);
                        $exceptionHandler(result.thrown);
                    }
                    deps = fixWatches(deps, result.dependencies, incUpdates, debugName);
                };
                var deregisterTrigger = self.$watch(function(){return updateCount;}, run);
                var deregistrationHandle = function() {
                    if (angular.isFunction(fn.destroy))
                        fn.destroy();
                    fixWatches(deps, {}, null, debugName);
                    deregisterTrigger();
                    if (debugName)
                        delete dependencyGraph[debugName];
                };
                deregistrationHandle.setArgs = function(newArgs) {
                    if (!angular.equals(args, newArgs)) { // same args, don't re-evaluate
                        args = angular.copy(newArgs);
                        run();
                    }
                };
                return deregistrationHandle;
            };

            var dependentChain = function(self, fns, finish, i, args, debugName) {
                if (fns.length - i == 1) {
                    // base case
                    return dependentFn(self, fns[i], args, function(value) {
                        finish(value);
                    }, (debugName && debugName + "#" + i));
                } else {
                    var subHandle = null;
                    var thisHandle = dependentFn(self, fns[i], args, function(value) {
                        if (subHandle === null) {
                            subHandle = dependentChain(self, fns, finish, i+1, [value], debugName);
                        } else {
                            subHandle.setArgs([value]);
                        }
                    }, (debugName && debugName + "#" + i));
                    var dependentHandle = function() {
                        if (subHandle)
                            subHandle();
                        thisHandle();
                    };
                    dependentHandle.setArgs = function(args) { thisHandle.setArgs(args); };
                    return dependentHandle;
                }
            };

            var $computed = function(expr, fn) {
                var self = this;
                var assign = $parse(expr).assign;
                var fns = (angular.isArray(fn) ? fn : [fn]);
                var deregister = dependentChain(self, fns, function(value) {
                    assign(self, value);
                }, 0, [], (debug ? this.$id + "|" + expr : null));
                var deregisterOn = this.$on('$destroy', function() {
                    deregister();
                });
                return function() {
                    deregisterOn();
                    deregister();
                };
            };

            $computed.dependencyGraph = function() {
                return (debug ? dependencyGraph : null);
            };

            $computed.drawDependencies = dependencyDrawingFunction($rootScope, $computed);

            return $computed;
        }];
    }]);
})(window, document);/*global angular*/
angular.module('ngComputed')
    .provider('$trackedEval', [function() {
        var defaultType = "equal";
        this.setDefaultWatchType = function(type) {
            defaultType = type;
        };

        this.$get = ['$parse', function($parse) {
            var readVars = null;
            var trackDependencies = function(f, args) {
                var old = readVars;
                readVars = {};
                try {
                    return {
                        value: f.apply(this, args),
                        dependencies: readVars
                    };
                } catch (e) {
                    return {
                        thrown: e,
                        dependencies: readVars
                    };
                } finally {
                    readVars = old;
                }
            };

            var dependencyTrackingEval = function(expr, type, locals) {
                if (readVars) {
                    if (angular.isFunction(expr))
                        throw new Error("Function used in $trackedEval while tracking dependencies. Instead, call the function and use $trackedEval internally.");
                    readVars[this.$id + "|" + expr + "|" + type] = {
                        scope: this,
                        expr: expr,
                        type: type
                    };
                }
                return $parse(expr)(this, locals);
            };

            var $evalEqual = function(expr, locals) {
                return dependencyTrackingEval.call(this, expr, "equal", locals);
            };
            var $evalReference = function(expr, locals) {
                return dependencyTrackingEval.call(this, expr, "reference", locals);
            };
            var $evalCollection = function(expr, locals) {
                return dependencyTrackingEval.call(this, expr, "collection", locals);
            };

            var addAllToExportObject = function(obj) {
                obj.$evalEqual = $evalEqual;
                obj.$evalReference = $evalReference;
                obj.$evalCollection = $evalCollection;
                obj.trackDependencies = trackDependencies;
                Object.defineProperty(obj, 'trackDependencies', {enumerable: false});
            };

            addAllToExportObject($evalEqual);
            addAllToExportObject($evalReference);
            addAllToExportObject($evalCollection);

            if (defaultType == "equal") {
                return $evalEqual;
            } else if (defaultType == "reference") { 
                return $evalReference;
            } else if (defaultType == "collection") {
                return $evalCollection;
            } else {
                throw new Error("Cannot create watch of default type '" + defaultType + "': unknown type");
            }
        }];
    }]);
