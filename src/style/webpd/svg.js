;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

Rpd.style('webpd', 'svg', (function() {

var d3 = d3 || d3_tiny;

var socketPadding = 10; // distance between inlets/outlets in SVG units

var nodeHeight = 18;
var connectorWidth = 7;

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

function getPos(elm) { var bounds = elm.getBoundingClientRect();
                       return { x: bounds.left, y: bounds.top } };

return function(config) {

var lastCanvas;

var nodeToProcessElm = {};

var nodeToInlets = {},
    nodeToOutlets = {};

var inletToElm = {},
    outletToElm = {};

function redistributeInlets(node) {
    var inlets = nodeToInlets[node.id];
    var inlet_count = inlets.length;
    if (inlet_count <= 1) return;
    var bodyWidth = nodeToProcessElm[node.id].node().getBBox().width;
    inlets.forEach(function(inlet, idx) {
        var xPos = idx * (bodyWidth / (inlet_count - 1))
                 - idx * (connectorWidth / (inlet_count - 1));
        inletToElm[inlet.id].attr('transform', 'translate(' + xPos + ',0)');
    });
}

function redistributeOutlets(node) {
    var outlets = nodeToOutlets[node.id];
    var outlet_count = outlets.length;
    if (outlet_count <= 1) return;
    var bodyWidth = nodeToProcessElm[node.id].node().getBBox().width;
    outlets.forEach(function(outlet, idx) {
        var xPos = idx * (bodyWidth / (outlet_count - 1))
                 - idx * (connectorWidth / (outlet_count - 1));
        outletToElm[outlet.id].attr('transform', 'translate(' + xPos + ',0)');
    });
}

return {

    createCanvas: function(patch, parent) {
        return { element: d3.select(_createSvgElement('g'))
                            .classed('rpd-patch', true).node() };
    },

    createNode: function(node, render, description, icon) {

        var size = render.size ? { width: render.size.width || 50,
                                   height: render.size.height || 18 }
                               : { width: 18, height: 18 };

        var nodeElm = d3.select(_createSvgElement('g'))
                        .attr('class', 'rpd-node');

        nodeElm.classed('rpd-'+node.type.slice(0, node.type.indexOf('/'))+'-toolkit-node', true)
               .classed('rpd-'+node.type.replace('/','-'), true);

        var isPdNode = (node.type.indexOf('wpd/') === 0);
        if (!isPdNode) {
            nodeElm.append('rect').classed('rpd-background').classed('rpd-drag-handle', true)
                                  .attr('width', size.width).attr('height', size.height);
        }
        nodeElm.append('g').classed('rpd-process', true).classed('rpd-drag-handle', isPdNode);
        nodeElm.append('g').classed('rpd-inlets', true);
        nodeElm.append('g').classed('rpd-outlets', true)
                           .attr('transform', 'translate(0,' + (nodeHeight - 2) + ')');

        nodeToProcessElm[node.id] = nodeElm.select('.rpd-process');

        nodeToInlets[node.id] = [];
        nodeToOutlets[node.id] = [];

        return {
            element: nodeElm.node(),
            size: size
        };

    },

    createInlet: function(inlet, render) {
        var inletElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-inlet');
        inletElm.append('g').attr('class', 'rpd-connector')
                .append('rect').attr('width', 7).attr('height', 2);
        inletToElm[inlet.id] = inletElm;
        nodeToInlets[inlet.node.id].push(inlet);
        redistributeInlets(inlet.node);
        return { element: inletElm.node() };
    },

    createOutlet: function(outlet, render) {
        var outletElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-outlet');
        outletElm.append('g').attr('class', 'rpd-connector')
                 .append('rect').attr('width', 7).attr('height', 2);
        outletToElm[outlet.id] = outletElm;
        nodeToOutlets[outlet.node.id].push(outlet);
        redistributeOutlets(outlet.node);
        return { element: outletElm.node() };
    },

    createLink: function(link) {
        var linkElm = d3.select(_createSvgElement('line'))
                        .attr('class', 'rpd-link');
        return { element: linkElm.node(),
                 rotate: function(x0, y0, x1, y1) {
                     linkElm.attr('x1', x0).attr('y1', y0)
                            .attr('x2', x1).attr('y2', y1);
                 },
                 noPointerEvents: function() {
                     linkElm.style('pointer-events', 'none');
                 } };
    },

    getInletPos: function(inlet) {
        var connectorPos = getPos(inletToElm[inlet.id].select('.rpd-connector').node());
        return { x: connectorPos.x + 3, y: connectorPos.y + 1 };
    },

    getOutletPos: function(outlet) {
        var connectorPos = getPos(outletToElm[outlet.id].select('.rpd-connector').node());
        return { x: connectorPos.x + 3, y: connectorPos.y + 1 };
    },

    getLocalPos: function(pos) {
        if (!lastCanvas) return pos;
        // calculate once on patch switch?
        var canvasPos = getPos(lastCanvas.node());
        return { x: pos.x - canvasPos.x, y: pos.y - canvasPos.y };
    },

    onPatchSwitch: function(patch, canvas) {
        lastCanvas = d3.select(canvas);
    },

    onInletRemove: function(inlet) {
        var nodeId = inlet.node.id;
        nodeToInlets[nodeId] = nodeToInlets[nodeId].filter(function(other) {
            return other.id !== inlet.id;
        });
    },

    onOutletRemove: function(outlet) {
        var nodeId = outlet.node.id;
        nodeToOutlets[nodeId] = nodeToOutlets[nodeId].filter(function(other) {
            return other.id !== outlet.id;
        });
    }

};

} })());

})(this);
