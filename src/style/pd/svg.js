;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

Rpd.style('pd', 'svg', (function() {

var d3 = d3 || d3_tiny;

// we need this canvas to be shared between all instances of a function below,
// it is used to measure node header width, since it contains text, we need
// some hidden element to measure string width in pixels
var globalLastCanvas;

var socketPadding = 25, // distance between inlets/outlets in SVG units
    socketsMargin = 15; // distance between first/last inlet/outlet and body edge
var headerWidth = 0; // width of a node header in SVG units

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

function roundedRect(x, y, width, height, rtl, rtr, rbr, rbl) {
    return "M" + x + "," + y
         + (rtl ? ("v" + rtl
                 + "a" + rtl + "," + rtl + " 0 0 1 " +  rtl + "," + -rtl) : "")
         + "h" + (width  - (rtl ? rtl : 0) - (rtr ? rtr : 0))
         + (rtr ? ("a" + rtr + "," + rtr + " 0 0 1 " +  rtr + "," +  rtr) : "")
         + "v" + (height - (rtr ? rtr : 0) - (rbr ? rbr : 0))
         + (rbr ? ("a" + rbr + "," + rbr + " 0 0 1 " + -rbr + "," +  rbr) : "")
         + "h" + ((rbr ? rbr : 0) + (rbl ? rbl : 0) - width)
         + (rbl ? ("a" + rbl + "," + rbl + " 0 0 1 " + -rbl + "," + -rbl) : "")
         + "v" + ((rbl ? rbl : 0) + (rtl ? rtl : 0) - height)
         + "z";
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

        // it is required to know the header size before constructing the node itself
        var fakeName = d3.select(_createSvgElement('text'))
                         .attr('class', 'rpd-fake-name')
                         .text(node.def.title || node.type).attr('x', -1000).attr('y', -1000);
        globalLastCanvas.append(fakeName.node());
        var headerWidth = fakeName.node().getBBox().width + 12;
        fakeName.remove();

        var minContentSize = render.size ? { width: render.size.width || 100,
                                             height: render.size.height || 40 }
                                         : { width: 100, height: 40 };

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
        nodeElm.append('text').attr('class', 'rpd-name').text(node.def.title || node.type)
                              .attr('x', 5).attr('y', height / 2)
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
                           .attr('transform', 'translate(' + (width-12) + ',1)')
               .call(function(button) {
                   button.append('path').attr('d', roundedRect(0, 0, 11, 11, 2, 2, 2, 3))
                                        .attr('class', 'rpd-remove-button-handle');
                   button.append('text').text('x').attr('x', 3).attr('y', 2)
                                        .style('pointer-events', 'none');
               });

        // append placeholders for inlets, outlets and a target element to render body into
        nodeElm.append('g').attr('class', 'rpd-inlets').data({ position: { x: 0, y: 0 } });
        nodeElm.append('g').attr('class', 'rpd-process').attr('transform', 'translate(' + (headerWidth + ((width - headerWidth) / 2)) + ',' + (height / 2) + ')');
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
                'translate(' + (headerWidth + ((newSize.width - headerWidth) / 2)) + ',' + (newSize.height / 2) + ')');
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
            group.append('circle').attr('class', 'rpd-connector')
                                  .attr('cx', 0).attr('cy', 0).attr('r', 2.5);
            group.append('g').attr('class', 'rpd-value-holder')
                 .attr('transform', 'translate(0,-30)')
                 .append('text').attr('class', 'rpd-value');
            group.append('text').attr('class', 'rpd-name').text(inlet.def.label || inlet.alias)
                                .attr('x', 0).attr('y', -15);
        });
        listeners[inlet.node.id].inlet(inletElm);
        inletToConnector[inlet.id] = inletElm.select('.rpd-connector');
        return { element: inletElm.node() };
    },

    createOutlet: function(outlet, render) {
        var outletElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-outlet');
        outletElm.call(function(group) {
            //group.attr('transform', 'translate(' + outletPos.x + ',' + outletPos.y + ')')
            group.append('circle').attr('class', 'rpd-connector')
                                  .attr('cx', 0).attr('cy', 0).attr('r', 2.5);
            group.append('g').attr('class', 'rpd-value-holder')
                 .append('text').attr('class', 'rpd-value')
                                .attr('x', 0).attr('y', 30)
                                .style('pointer-events', 'none');
            group.append('text').attr('class', 'rpd-name').text(outlet.def.label || outlet.alias)
                                .attr('x', 0).attr('y', 15);
        });
        listeners[outlet.node.id].outlet(outletElm);
        outletToConnector[outlet.id] = outletElm.select('.rpd-connector');
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
        globalLastCanvas = lastCanvas;
    },

    onNodeRemove: function(node) {
        listeners[node.id] = null;
    }


};

} })());

})(this);
