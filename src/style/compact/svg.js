;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

Rpd.style('compact', 'svg', (function() {

var d3 = d3 || d3_tiny;

var socketPadding = 25, // distance between inlets/outlets in SVG units
    socketsMargin = 20; // distance between first/last inlet/outlet and body edge
var headerWidth = 10; // width of a node header in SVG units

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

function getPos(elm) { var bounds = elm.getBoundingClientRect();
                       return { x: bounds.left, y: bounds.top } };

return function(config) {

var lastCanvas;

var listeners = {};

var inletToConnector = {},
    outletToConnector = {};

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
        var minContentSize = render.size ? { width: render.size.width || 60,
                                             height: render.size.height || 25 }
                                         : { width: 60, height: 25 };
        var pivot = render.pivot || { x: 0.5, y: 0.5 };

        function findBestNodeSize(numInlets, numOutlets, minContentSize) {
           var requiredContentWidth = (2 * socketsMargin) + ((Math.max(numInlets, numOutlets) - 1) * socketPadding);
           return { width: headerWidth + Math.max(requiredContentWidth, minContentSize.width),
                    height: minContentSize.height };
        }

        var initialSize = findBestNodeSize(node.def.inlets  ? Object.keys(node.def.inlets).length  : 0,
                                           node.def.outlets ? Object.keys(node.def.outlets).length : 0,
                                           minContentSize);

        var width = initialSize.width, height = initialSize.height;
        var bodyWidth = width - headerWidth,
            bodyHeight = height;

        var nodeElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-node');

        // append shadow
        nodeElm.append('rect').attr('class', 'rpd-shadow')
                              .attr('width', width).attr('height', height)
                              .attr('x', 5).attr('y', 6).attr('rx', 3).attr('ry', 3);

        // append node header
        nodeElm.append('rect').attr('class', 'rpd-header').classed('rpd-drag-handle', true)
                              .attr('x', 0).attr('y', 0)
                              .attr('width', headerWidth).attr('height', height);
        nodeElm.append('g').attr('class', 'rpd-name-holder')
               .attr('transform', 'translate(3, ' + (height + 2) + ') rotate(-90)')
               .append('text').attr('class', 'rpd-name').text(node.def.name || '')
                              .attr('x', 5).attr('y', 5)
                              .style('pointer-events', 'none');
        // append node body
        nodeElm.append('rect').attr('class', 'rpd-content')
                              .attr('x', headerWidth).attr('y', 0)
                              .attr('width', width - headerWidth).attr('height', height);
        nodeElm.append('rect').attr('class', 'rpd-body')
                              .attr('width', width).attr('height', height)
                              .style('pointer-events', 'none');

        // append tooltip with description
        nodeElm.select('.rpd-header')
               .append(_createSvgElement('title'))
               .text(description ? (description + ' (' + node.type + ')') : node.type);

        // append remove button
        nodeElm.append('g').attr('class', 'rpd-remove-button')
                           .attr('transform', 'translate(' + (width-11) + ',1)')
               .call(function(button) {
                   button.append('rect').attr('width', 10).attr('height', 11)
                                        .attr('class', 'rpd-remove-button-handle');
                   button.append('text').text('x').attr('x', 3).attr('y', 2)
                                        .style('pointer-events', 'none');
               });

        // append placeholders for inlets, outlets and a target element to render body into
        nodeElm.append('g').attr('class', 'rpd-inlets').data({ position: { x: 0, y: 0 } });
        nodeElm.append('g').attr('class', 'rpd-process').attr('transform', 'translate(' + (headerWidth + (width * pivot.x)) + ','
                                                                                        + (pivot.y * height) + ')');
        nodeElm.append('g').attr('class', 'rpd-outlets').attr('transform', 'translate(' + 0 + ',' + height + ')')
                                                        .data({ position: { x: 0, y: height } });

        nodeElm.classed('rpd-'+node.type.slice(0, node.type.indexOf('/'))+'-toolkit-node', true)
               .classed('rpd-'+node.type.replace('/','-'), true);

        var numInlets = 0, numOutlets = 0;
        var inletElms = [], outletElms = [];
        var lastSize = initialSize;

        function checkNodeSize() {
            var curSize = lastSize;
            var newSize = findBestNodeSize(numInlets, numOutlets, minContentSize);
            if ((newSize.width === curSize.width) && (newSize.height === curSize.height)) return;
            nodeElm.select('rect.rpd-shadow').attr('height', newSize.height).attr('width', newSize.width);
            nodeElm.select('rect.rpd-body').attr('height', newSize.height).attr('width', newSize.width);
            nodeElm.select('rect.rpd-content').attr('width', newSize.width - headerWidth);
            nodeElm.select('g.rpd-process').attr('transform',
                'translate(' + (headerWidth + ((newSize.width - headerWidth) * pivot.x)) + ',' + (newSize.height * pivot.y) + ')');
            nodeElm.select('.rpd-remove-button').attr('transform', 'translate(' + (newSize.width-12) + ',1)');
            lastSize = newSize;
        }

        function recalculateSockets() {
            inletElms.forEach(function(inletElm, idx) {
                var inletPos = findInletPos(idx);
                inletElm.attr('transform',  'translate(' + inletPos.x + ',' + inletPos.y + ')');
                //inletElm.data().position = inletPos;
            });
            outletElms.forEach(function(outletElm, idx) {
                var outletPos = findOutletPos(idx);
                outletElm.attr('transform',  'translate(' + outletPos.x + ',' + outletPos.y + ')');
                //outletElm.data().position = outletPos;
            });
        }

        function notifyNewInlet(elm) {
            numInlets++; inletElms.push(elm); checkNodeSize();
            recalculateSockets();
        }

        function notifyNewOutlet(elm) {
            numOutlets++; outletElms.push(elm); checkNodeSize();
            recalculateSockets();
        }

        function findInletPos(idx) { // index from left to right
            return { x: socketsMargin + (socketPadding * idx), y: 0 };
        }

        function findOutletPos(idx) { // index from left to right
            return { x: socketsMargin + (socketPadding * idx), y: 1 };
        }

        listeners[node.id] = {
            inlet: notifyNewInlet,
            outlet: notifyNewOutlet
        };

        return {
            element: nodeElm.node(),
            size: initialSize
        };

    },

    createInlet: function(inlet, render) {
        var inletElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-inlet');
        inletElm.call(function(group) {
            //group.attr('transform', 'translate(' + inletPos.x + ',' + inletPos.y + ')')
            group.append('rect').attr('class', 'rpd-connector')
                                .attr('x', -2).attr('y', -2)
                                .attr('width', 4).attr('height', 4);
            group.append('g').attr('class', 'rpd-value-holder')
                 .attr('transform', 'translate(0,-20)')
                 .append('text').attr('class', 'rpd-value');
            group.append('text').attr('class', 'rpd-name').text(inlet.def.label || inlet.alias)
                                .attr('x', 0).attr('y', -10);
        });
        listeners[inlet.node.id].inlet(inletElm);
        inletToConnector[inlet.id] = inletElm.select('.rpd-connector');
        return { element: inletElm.node() };
    },

    createOutlet: function(outlet, render) {
        var outletElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-outlet');
        outletElm.call(function(group) {
            //group.attr('transform', 'translate(' + outletPos.x + ',' + outletPos.y + ')')
            group.append('rect').attr('class', 'rpd-connector')
                                .attr('x', -2).attr('y', -2)
                                .attr('width', 4).attr('height', 4);
            group.append('g').attr('class', 'rpd-value-holder')
                 .append('text').attr('class', 'rpd-value')
                                .attr('x', 0).attr('y', 20)
                                .style('pointer-events', 'none');
            group.append('text').attr('class', 'rpd-name').text(outlet.def.label || outlet.alias)
                                .attr('x', 0).attr('y', 10);
        });
        listeners[outlet.node.id].outlet(outletElm);
        outletToConnector[outlet.id] = outletElm.select('.rpd-connector');
        return { element: outletElm.node() };
    },

    createLink: function(link) {
        var linkElm = d3.select(_createSvgElement(
                            (config.linkForm && (config.linkForm == 'curve')) ? 'path' : 'line'
                        )).attr('class', 'rpd-link');
        return { element: linkElm.node(),
                 rotate: function(x0, y0, x1, y1) {
                     if (config.linkForm && (config.linkForm == 'curve')) {
                        linkElm.attr('d', bezierByV(x0, y0, x1, y1));
                    } else {
                        linkElm.attr('x1', x0).attr('y1', y0)
                               .attr('x2', x1).attr('y2', y1);
                    }
                 },
                 noPointerEvents: function() {
                     linkElm.style('pointer-events', 'none');
                 } };
    },

    getInletPos: function(inlet) {
        var connectorPos = getPos(inletToConnector[inlet.id].node());
        return { x: connectorPos.x + 2, y: connectorPos.y + 2};
    },

    getOutletPos: function(outlet) {
        var connectorPos = getPos(outletToConnector[outlet.id].node());
        return { x: connectorPos.x + 2, y: connectorPos.y + 2 };
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

    onNodeRemove: function(node) {
        listeners[node.id] = null;
    }


};

function bezierByV(x0, y0, x1, y1) {
    var mx = x0 + (x1 - x0) / 2;
    var my = y0 + (y1 - y0) / 2;

    return 'M' + x0 + ' ' + y0 + ' '
         + 'C' + x0 + ' ' + my + ' '
               + x1 + ' ' + my + ' '
               + x1 + ' ' + y1;
}

} })());

})(this);
