import {ascending, min, sum} from "d3-array";
import {map, nest} from "d3-collection";
import {justify} from "./align";
import constant from "./constant";

function ascendingSourceBreadth(a, b) {
  return ascendingBreadth(a.source, b.source) || a.index - b.index;
}

function ascendingTargetBreadth(a, b) {
  return ascendingBreadth(a.target, b.target) || a.index - b.index;
}

function ascendingBreadth(a, b) {
  if (a.partOfCycle === b.partOfCycle) {
     return a.y0 - b.y0
   } else {
     if (a.circularLinkType === 'top' || b.circularLinkType === 'bottom') {
       return -1
     } else {
       return 1
     }
   }
}

function value(d) {
  return d.value;
}

function nodeCenter(node) {
  return (node.y0 + node.y1) / 2;
}

function weightedSource(link) {
  return nodeCenter(link.source) * link.value;
}

function weightedTarget(link) {
  return nodeCenter(link.target) * link.value;
}

function defaultId(d) {
  return d.index;
}

function defaultNodes(graph) {
  return graph.nodes;
}

function defaultLinks(graph) {
  return graph.links;
}

function find(nodeById, id) {
  var node = nodeById.get(id);
  if (!node) throw new Error("missing: " + id);
  return node;
}

/// /////////////////////////////////////////////////////////////////////////////////
  // Cycle functions

  // Identify circles in the link objects
  function identifyCircles (graph) {
    var addedLinks = []
    var circularLinkID = 0
    graph.links.forEach(function (link) {
      if (createsCycle(link.source, link.target, addedLinks)) {
        link.circular = true
        link.circularLinkID = circularLinkID
        circularLinkID = circularLinkID + 1
      } else {
        link.circular = false
        addedLinks.push(link)
      }
    })
  }

  function selectCircularLinkTypes (graph) {
    graph.links.forEach(function (link) {
      //console.log(link.target.circularLinkType)

      if (link.circular) {
        //if either souce or target has type already use that
        if ( link.source.circularLinkType || link.target.circularLinkType) {
          //default to source type if available
          link.circularLinkType = link.source.circularLinkType ? link.source.circularLinkType : link.target.circularLinkType;

        }
        else {
          link.circularLinkType = link.circularLinkID % 2 == 0
            ? 'bottom'
            : 'top'
        }




        graph.nodes.forEach(function (node) {
          if (node.name == link.source.name || node.name == link.target.name) {
            node.circularLinkType = link.circularLinkType
          }
        })
      }

      // if the target and source have the same circularLinkType, use that
      /* if (
        link.source.circularLinkType &&
        link.source.circularLinkType === link.target.circularLinkType
      ) {
        console.log(link.circularLinkID + ' reusing')
        return link.source.circularLinkType
      } else if (link.source.circularLinkType) {
        // if only one of the target/source has a circularLinkType, use that
        console.log(link.circularLinkID + ' reusing source')
        return link.source.circularLinkType
      } else {
        // assign random?
        console.log(link.circularLinkID + ' random')
        return
      } */
    })
  }

  // Checks if link creates a cycle
  function createsCycle (originalSource, nodeToCheck, graph) {
    if (graph.length == 0) {
      return false
    }

    var nextLinks = findLinksOutward(nodeToCheck, graph)
    // leaf node check
    if (nextLinks.length == 0) {
      return false
    }

    // cycle check
    for (var i = 0; i < nextLinks.length; i++) {
      var nextLink = nextLinks[i]

      if (nextLink.target === originalSource) {
        return true
      }

      // Recurse
      if (createsCycle(originalSource, nextLink.target, graph)) {
        return true
      }
    }

    // Exhausted all links
    return false
  }

  /* Given a node, find all links for which this is a source
     in the current 'known' graph  */
  function findLinksOutward (node, graph) {
    var children = []

    for (var i = 0; i < graph.length; i++) {
      if (node == graph[i].source) {
        children.push(graph[i])
      }
    }

    return children
  }

  // create a path for circle paths
  /* function computeCirclePath (d) {

    //distance back to target node
    let circularLinkDistance =  d.source.depth - d.target.depth;

    //distance out from the node
    var leftNodeBuffer = 40 - (40 * (d.y0/height));
    var rightNodeBuffer = 40 - (40 * (d.y1/height));

    //how far below the nodes the path will go, more so for longer distances
    var verticalBuffer = 20 * circularLinkDistance;

    //radius of the corners of the path
    var arcRadius = d.width + 10;

    var leftInnerExtent = d.source.x1 + leftNodeBuffer;
    var leftFullExtent = d.source.x1 + arcRadius + leftNodeBuffer;
    var rightInnerExtent = d.target.x0 - rightNodeBuffer;
    var rightFullExtent = d.target.x0 - arcRadius - rightNodeBuffer;
    var bottomInnerExtent = height + verticalBuffer;
    var bottomFullExtent = height + verticalBuffer + arcRadius;

    let path =
      // start at the right of the source node
      "M" + d.source.x1 + " " + d.y0 + " " +

      // line right to buffer point
      "L" + leftInnerExtent + " " + d.y0 + " " +

      //Arc around: Centre of arc X and  //Centre of arc Y
      "A" + arcRadius + " " + arcRadius + " 0 0 1 " +
      //End of arc X //End of arc Y
      leftFullExtent + " " + (d.y0 + arcRadius) + " " + //End of arc X

      // line down to buffer point
      "L" + leftFullExtent + " " + bottomInnerExtent + " " +

      //Arc around: Centre of arc X and  //Centre of arc Y
      "A" + arcRadius + " " + arcRadius + " 0 0 1 " +
      //End of arc X //End of arc Y
      leftInnerExtent + " " + bottomFullExtent + " " + //End of arc X

      // line left to buffer point
      "L" + rightInnerExtent + " " + bottomFullExtent + " " +

      //Arc around: Centre of arc X and  //Centre of arc Y
      "A" + arcRadius + " " + arcRadius + " 0 0 1 " +
      //End of arc X //End of arc Y
      rightFullExtent + " " + bottomInnerExtent + " " + //End of arc X

      // line up
      "L" + rightFullExtent + " " + (d.y1 + arcRadius) + " " +

      //Arc around: Centre of arc X and  //Centre of arc Y
      "A" + arcRadius + " " + arcRadius + " 0 0 1 " +
      //End of arc X //End of arc Y
      rightInnerExtent + " " + d.y1 + " " + //End of arc X

      //line to end
      "L" +  d.target.x0 + " " + d.y1;

    return path
  } */

  /// /////////////////////////////////////////////////////////////////////////////////

  /* var curveSankeyLink = function () {
    return function (d) {
      let path = ''
      if (d.circular) {
        path = computeCirclePath(d)
      } else {
        var normalPath = d3Shape
          .linkHorizontal()
          .source(function (d) {
            return [d.source.x1, d.y0]
          })
          .target(function (d) {
            return [d.target.x0, d.y1]
          })
        path = normalPath(d)
      }
      return path
    }
  } */


export default function() {
  var x0 = 0, y0 = 0, x1 = 1, y1 = 1, // extent
      dx = 24, // nodeWidth
      py = 8, // nodePadding
      id = defaultId,
      align = justify,
      nodes = defaultNodes,
      links = defaultLinks,
      iterations = 32;

  //var padding =  Infinity;
  var paddingRatio = 0.1;

  function sankey() {
    var graph = {nodes: nodes.apply(null, arguments), links: links.apply(null, arguments)};
    computeNodeLinks(graph);
    identifyCircles(graph)
    selectCircularLinkTypes(graph)
    computeNodeValues(graph);
    computeNodeDepths(graph);
    computeNodeBreadths(graph, iterations);
    computeLinkBreadths(graph);
    return graph;
  }

  sankey.update = function(graph) {
    computeLinkBreadths(graph);
    return graph;
  };

  sankey.nodeId = function(_) {
    return arguments.length ? (id = typeof _ === "function" ? _ : constant(_), sankey) : id;
  };

  sankey.nodeAlign = function(_) {
    return arguments.length ? (align = typeof _ === "function" ? _ : constant(_), sankey) : align;
  };

  sankey.nodeWidth = function(_) {
    return arguments.length ? (dx = +_, sankey) : dx;
  };

  sankey.nodePadding = function(_) {
    return arguments.length ? (py = +_, sankey) : py;
  };

  sankey.nodes = function(_) {
    return arguments.length ? (nodes = typeof _ === "function" ? _ : constant(_), sankey) : nodes;
  };

  sankey.links = function(_) {
    return arguments.length ? (links = typeof _ === "function" ? _ : constant(_), sankey) : links;
  };

  sankey.size = function(_) {
    return arguments.length ? (x0 = y0 = 0, x1 = +_[0], y1 = +_[1], sankey) : [x1 - x0, y1 - y0];
  };

  sankey.extent = function(_) {
    return arguments.length ? (x0 = +_[0][0], x1 = +_[1][0], y0 = +_[0][1], y1 = +_[1][1], sankey) : [[x0, y0], [x1, y1]];
  };

  sankey.iterations = function(_) {
    return arguments.length ? (iterations = +_, sankey) : iterations;
  };

  sankey.nodePaddingRatio = function (_) {
      return arguments.length ? ((paddingRatio = +_), sankey) : paddingRatio
    }

  // Populate the sourceLinks and targetLinks for each node.
  // Also, if the source and target are not objects, assume they are indices.
  function computeNodeLinks(graph) {
    graph.nodes.forEach(function(node, i) {
      node.index = i;
      node.sourceLinks = [];
      node.targetLinks = [];
    });
    var nodeById = map(graph.nodes, id);
    graph.links.forEach(function(link, i) {
      link.index = i;
      if (typeof link.source !== "object") {
        link.source = find(nodeById, link.source);
      }
      if (typeof link.target !== "object") {
        link.target = find(nodeById, link.target);
      }
      link.source.sourceLinks.push(link);
      link.target.targetLinks.push(link);
    });
  }

  // Compute the value (size) and cycleness of each node by summing the associated links.
  function computeNodeValues(graph) {
    graph.nodes.forEach(function(node) {
      node.partOfCycle = false;
      node.value = Math.max(
        sum(node.sourceLinks, value),
        sum(node.targetLinks, value)
      );
      node.sourceLinks.forEach(function (link) {
        if (link.circular) {
          node.partOfCycle = true
          node.circularLinkType = link.circularLinkType
        }
      });
      node.targetLinks.forEach(function (link) {
        if (link.circular) {
          node.partOfCycle = true
          node.circularLinkType = link.circularLinkType
        }
      });
    });
  }

  // Iteratively assign the depth (x-position) for each node.
  // Nodes are assigned the maximum depth of incoming neighbors plus one;
  // nodes with no incoming links are assigned depth zero, while
  // nodes with no outgoing links are assigned the maximum depth.
  function computeNodeDepths(graph) {

    var nodes, next, x;
    for (nodes = graph.nodes, next = [], x = 0; nodes.length; ++x, nodes = next, next = []) {
      nodes.filter(n => n.name != undefined).forEach(function(node) {

        node.depth = x;
        node.sourceLinks.forEach(function(link) {
          if (next.indexOf(link.target) < 0 && !link.circular) {
            next.push(link.target);
          }
        });
      });
    }

    for (nodes = graph.nodes, next = [], x = 0; nodes.length; ++x, nodes = next, next = []) {
      nodes.forEach(function(node) {
        node.height = x;
        node.targetLinks.forEach(function(link) {
          if (next.indexOf(link.source) < 0 && !link.circular) {
            next.push(link.source);
          }
        });
      });
    }

    var kx = (x1 - x0 - dx) / (x - 1);
    graph.nodes.forEach(function(node) {
      node.x1 = (node.x0 = x0 + Math.max(0, Math.min(x - 1, Math.floor(align.call(null, node, x)))) * kx) + dx;
    });
  }

  function computeNodeBreadths(graph) {
    var columns = nest()
        .key(function(d) { return d.x0; })
        .sortKeys(ascending)
        .entries(graph.nodes)
        .map(function(d) { return d.values; });

    //
    initializeNodeBreadth();
    resolveCollisions();
    for (var alpha = 1, n = iterations; n > 0; --n) {
      relaxRightToLeft(alpha *= 0.99);
      resolveCollisions();
      relaxLeftToRight(alpha);
      resolveCollisions();
    }

    function initializeNodeBreadth() {
     //console.log(paddingRatio);

      // columns.forEach(function(nodes){
      //   let thisPadding = (y1 * paddingRatio) / (nodes.length + 1)
      //   padding = thisPadding < padding ? thisPadding : padding;
      // })
      //
      // py = padding;
      //console.log(py);
      var ky = min(columns, function(nodes) {
        return (y1 - y0 - (nodes.length - 1) * py) / sum(nodes, value);
      });

      //ky = ky / 2 ;

      columns.forEach(function(nodes) {
        var nodesLength = nodes.length
          nodes.forEach(function (node, i) {
            if (node.partOfCycle) {
              if (node.circularLinkType == 'top') {
                node.y0 = y0 + i
                node.y1 = node.y0 + node.value * ky
              } else {
                node.y0 = y1 - node.value - i
                node.y1 = node.y0 + node.value * ky
              }
            } else {
              // node.y1 = (node.y0 = i) + node.value * ky
              node.y0 = (y1 - y0) / 2 - nodesLength / 2 + i
              node.y1 = node.y0 + node.value * ky
            }
          });
      });

      graph.links.forEach(function(link) {
        link.width = link.value * ky;
      });
    }

    function relaxLeftToRight(alpha) {

        columns.forEach(function (nodes) {
          let n = nodes.length;

          nodes.forEach(function (node) {
            if (node.targetLinks.length) {
               if (node.partOfCycle && (n > 1) /*&& (i > 0) && (i < columnsLength) */) {
              //
              //   //do nothing for now
              //
               } else {
                var dy =
                  (sum(node.targetLinks, weightedSource) /
                    sum(node.targetLinks, value) -
                    nodeCenter(node)) *
                  alpha
                node.y0 += dy
                node.y1 += dy
              }
            }
          })
        })
    }

    function relaxRightToLeft(alpha) {

        columns.slice().reverse().forEach(function (nodes) {
          let n = nodes.length;
          nodes.forEach(function (node) {
            if (node.sourceLinks.length) {
               if (node.partOfCycle && (n > 1)/* && (i > 0) && (i < columnsLength) */) {
              //   //do nothing for now
               } else {
                var dy =
                  (sum(node.sourceLinks, weightedTarget) /
                    sum(node.sourceLinks, value) -
                    nodeCenter(node)) *
                  alpha
                node.y0 += dy
                node.y1 += dy
              }
            }
          })
        })
    }

    function resolveCollisions() {
      columns.forEach(function(nodes) {
        var node,
            dy,
            y = y0,
            n = nodes.length,
            i;

        // Push any overlapping nodes down.
        nodes.sort(ascendingBreadth);
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dy = y - node.y0;
          if (dy > 0) {
             node.y0 += dy
             node.y1 += dy
           }
          y = node.y1 + py;
        }

        // If the bottommost node goes outside the bounds, push it back up.
        dy = y - py - y1;
        if (dy > 0) {
          y = (node.y0 -= dy), node.y1 -= dy;

          // Push any overlapping nodes back up.
          for (i = n - 2; i >= 0; --i) {
            node = nodes[i];
            dy = node.y1 + py - y;
            if (dy > 0) node.y0 -= dy, node.y1 -= dy;
            y = node.y0;
          }
        }
      });
    }
  }

  function computeLinkBreadths(graph) {
    graph.nodes.forEach(function(node) {
      node.sourceLinks.sort(ascendingTargetBreadth);
      node.targetLinks.sort(ascendingSourceBreadth);
    });
    graph.nodes.forEach(function(node) {
      var y0 = node.y0, y1 = y0;

      // start from the bottom of the node for cycle links
      var y0cycle = node.y1
      var y1cycle = y0cycle

      node.sourceLinks.forEach(function(link) {
        if (link.circular) {
            link.y0 = y0cycle - link.width / 2
            y0cycle = y0cycle - link.width
          } else {
            link.y0 = y0 + link.width / 2
            y0 += link.width
          }
      });
      node.targetLinks.forEach(function(link) {
        if (link.circular) {
            link.y1 = y1cycle - link.width / 2
            y1cycle = y1cycle - link.width
          } else {
            link.y1 = y1 + link.width / 2
            y1 += link.width
          }
      });
    });
  }

  return sankey;
}
