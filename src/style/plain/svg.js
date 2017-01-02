;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

Rpd.style('plain', 'svg', (function() {

var d3 = d3 || d3_tiny;

var socketPadding = 30, // distance between inlets/outlets in SVG units
    socketsMargin = 5; // distance between first/last inlet/outlet and body edge

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

function getPos(elm) { var bounds = elm.getBoundingClientRect();
                       return { x: bounds.left, y: bounds.top } };

return function(config) {

var lastCanvas;

var inletToConnector = {},
    outletToConnector = {},
    nodeToInlets = {},
    nodeToOutlets = {};

return {

    edgePadding: { horizontal: 20, vertical: 40 },
    boxPadding:  { horizontal: 20, vertical: 80 },

    createCanvas: function(patch, parent) {
        return {
            element: d3.select(_createSvgElement('g'))
                       .classed('rpd-patch', true).node()
        };
    },

    createNode: function(node, render, description, icon) {
        var contentSize = render.size ? { width: render.size.width || 60,
                                          height: render.size.height || 25 }
                                         : { width: 60, height: 25 };

        var width = contentSize.width, height = contentSize.height;

        var pivot = render.pivot || { x: 0.5, y: 0.5 };

        var nodeElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-node');

        // append node header
        nodeElm.append('rect').attr('class', 'rpd-header')
                              .attr('x', 0).attr('y', -20)
                              .attr('width', 50).attr('height', 20);
        if (node.def.title || node.type) {
            nodeElm.append('g').attr('class', 'rpd-name-holder')
                   .append('text').attr('class', 'rpd-name').text(node.def.title || node.type)
                                  .attr('x', 0).attr('y', -22)
                                  .style('pointer-events', 'none');
        }

        // append node body
        nodeElm.append('rect').attr('class', 'rpd-body')
                              .classed('rpd-drag-handle', true)
                              .attr('width', width).attr('height', height);

        // append tooltip with description
        nodeElm.select('.rpd-header')
               .append(_createSvgElement('title'))
               .text(description ? (description + ' (' + node.type + ')') : node.type);

        // append remove button
        nodeElm.append('g').attr('class', 'rpd-remove-button')
                           .attr('transform', 'translate(' + (width-12) + ',-12)')
               .call(function(button) {
                   button.append('rect').attr('width', 12).attr('height', 12)
                                        .attr('class', 'rpd-remove-button-handle');
                   button.append('text').text('x').attr('x', 12).attr('y', 2)
                                        .style('pointer-events', 'none');
               });

        // append placeholders for inlets, outlets and a target element to render body into
        nodeElm.append('g').attr('class', 'rpd-inlets').data({ position: { x: 0, y: 0 } });
        nodeElm.append('g').attr('class', 'rpd-process').attr('transform', 'translate(' + (width * pivot.x) + ',' + (height * pivot.y) + ')');
        nodeElm.append('g').attr('class', 'rpd-outlets').attr('transform', 'translate(' + 0 + ',' + height + ')')
                                                        .data({ position: { x: 0, y: height } });

        nodeElm.classed('rpd-'+node.type.slice(0, node.type.indexOf('/'))+'-toolkit-node', true)
               .classed('rpd-'+node.type.replace('/','-'), true);

        nodeToInlets[node.id] = [];
        nodeToOutlets[node.id] = [];

        return {
            element: nodeElm.node(),
            size: contentSize
        };

    },

    createInlet: function(inlet, render) {
        var inletElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-inlet');
        var nextX = socketsMargin + (nodeToInlets[inlet.node.id].length * socketPadding);
        inletElm.call(function(group) {
            group.attr('transform', 'translate(' + nextX + ',' + 0 + ')');
            group.append('circle').attr('class', 'rpd-connector').attr('r', 3);
            group.append('g').attr('class', 'rpd-value-holder')
                 .attr('transform', 'translate(-3,-13)')
                 .append('text').attr('class', 'rpd-value');
            group.append('text').attr('class', 'rpd-name').text(inlet.def.label || inlet.alias)
                                .attr('x', -3).attr('y', -6);
        });
        inletToConnector[inlet.id] = inletElm.select('.rpd-connector');
        nodeToInlets[inlet.node.id].push(inlet);
        return { element: inletElm.node() };
    },

    createOutlet: function(outlet, render) {
        var outletElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-outlet');
        var nextX = socketsMargin + (nodeToOutlets[outlet.node.id].length * socketPadding);
        outletElm.call(function(group) {
            group.attr('transform', 'translate(' + nextX + ',' + 0 + ')');
            group.append('circle').attr('class', 'rpd-connector').attr('r', 3);
            group.append('g').attr('class', 'rpd-value-holder')
                 .append('text').attr('class', 'rpd-value')
                                .attr('x', 0).attr('y', 18)
                                .style('pointer-events', 'none');
            group.append('text').attr('class', 'rpd-name').text(outlet.def.label || outlet.alias)
                                .attr('x', 0).attr('y', 10);
        });
        outletToConnector[outlet.id] = outletElm.select('.rpd-connector');
        nodeToOutlets[outlet.node.id].push(outlet);
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
        var connectorPos = getPos(inletToConnector[inlet.id].node());
        return { x: connectorPos.x + 3, y: connectorPos.y + 3 };
    },

    getOutletPos: function(outlet) {
        var connectorPos = getPos(outletToConnector[outlet.id].node());
        return { x: connectorPos.x + 3, y: connectorPos.y + 3 };
    },

    getLocalPos: function(pos) {
        if (!lastCanvas) return pos;
        // calculate once on patch switch?
        var canvasPos = getPos(lastCanvas.node());
        return { x: pos.x - canvasPos.x, y: pos.y - canvasPos.y };
    },

    onPatchSwitch: function(patch, canvas) {
        lastCanvas = d3.select(canvas);
    }

};

} })());

})(this);
