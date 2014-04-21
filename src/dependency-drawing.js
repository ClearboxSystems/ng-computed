/*global angular*/
var dependencyDrawingFunction = function($rootScope, $computed) {
    var setUpForce = function(d3, root, width, height) {
        var force = d3.layout.force()
                .charge(-300)
                .gravity(0.1)
                .distance(50)
        //.linkDistance(40)
                .size([width, height]);

        force.on('tick', function() {
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
        });

        return force;
    };

    var setUpElement = function(d3, element, width, height) {
        var svg = d3.select(element)
                .attr("width", width)
                .attr("height", height);
        var root = svg.append("g");
        root.append("defs")
            .call(function(defs) {
                defs.append("marker")
                    .attr("id", "arrowhead")
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
                x: lastNode.x, y: lastNode.y
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

    return function(d3, element, options) {
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

        d3.select(element)
            .append("rect")
            .attr({
                "fill": "#FFF",
                "width": width,
                "height": height
            })
            .call(zoom);

        var root = setUpElement(d3, element, options.width, options.height);
        var force = setUpForce(d3, root, options.width, options.height);

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
                        "marker-end": "url(#arrowhead)"
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
                // .on('click', function(d) {
                //     d.displayLabel = !d.displayLabel;
                // })
                    .on('mousedown', function(d) {
                        d.displayLabel = true;
                    })
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
                    .on('mouseup', function(d) {
                        d.displayLabel = false;
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
                    .call(force.drag);
                nodes.exit().remove();

                force
                    .nodes(nodesAndEdges.nodeList)
                    .links(nodesAndEdges.edges)
                    .start();
            }
        });

        return deregister;
    };
};
