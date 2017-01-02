;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

Rpd.style('ableton', 'svg', function(config) {

var d3 = d3 || d3_tiny;

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

var lastCanvas = null;

var socketPadding = 25, // distance between inlets/outlets in SVG units
    socketsMargin = 15; // distance between first/last inlet/outlet and body edge
var bodySizePadding = 30;
var headerHeight = 20; // height of a node header in SVG units

var letterWidth = 7;

var listeners = {};
var inletToConnector = {},
    outletToConnector = {};

/*
var AbletonTheme = {
    _palette: [
        '#3AFDAA',
        '#1EBEAF',
        '#65FEE8',
        '#FEEDA3',
        '#BB6118',
        '#FEEE4A',
        '#FDA43A',
        '#BFB96E',
        '#31E7FB',
        '#8BFD70',
        '#A24FAB',
        '#7661C3',
        '#CDBCE3',
        '#B9C2E2',
        '#FC43B2',
        '#FD95A7',
        '#BACF79',
        '#FDA378',
        '#E2F134',
        '#84FFFF'
    ],
    'one': {
        background: '#12181C',
        header: '#939EA8',
        headerSelection: '#DADDE2',
        highlight: '#DADDE2',
        highlight2: '#E6E947',
        controls0: '#12181C',
        controls1: '#22282F',
        controls2: '#6F7783',
        controls3: '#6495B4',
        nodeBody: '#ABB3B8',
        nodeBody2: '#999999',
        selection: '#FACE3E',
        border: '#808C94',
        border2: '#ADADAD',
        signal: '#59FD39',
        error: '#F87829',
    },
    'two': {
        background: '#767676',
        header: '#727272',
        headerSelection: '#31E9FD',
        highlight: '#B5B2B1',
        highlight2: '#FACE3E',
        controls0: '#767676',
        controls1: '#161616',
        controls2: '#D6692C',
        controls3: '#4286BA',
        nodeBody: '#8D8D8D',
        nodeBody2: '#999999',
        selection: '#9CD1C9',
        border: '#5A5A5A',
        border2: '#ADADAD',
        signal: '#59FD39',
        error: '#FC151B',
    }
};

var theme = AbletonTheme.one; */

var roundness = 6;

var defs = d3.select(_createSvgElement('defs'));

return {

    edgePadding: { horizontal: 30, vertical: 20 },
    boxPadding:  { horizontal: 20, vertical: 30 },

    createCanvas: function(patch, parent) {
        var canvas = d3.select(_createSvgElement('g'))
                       .classed('rpd-patch', true);
        canvas.append(defs.node());
        canvas.append('rect').attr('width', '100%').attr('height', '100%')
              .classed('rpd-background', true);
        return { element: canvas.node() };
    },

    createNode: function(node, render, description, icon) {

        var minContentSize = render.size ? { width: render.size.width || 40,
                                             height: render.size.height || 40 }
                                         : { width: 70, height: 40 };

        var pivot = render.pivot || { x: 0.5, y: 0.5 };

        function findBestNodeSize(numInlets, numOutlets, minContentSize) {
            var requiredContentHeight = (2 * socketsMargin) + ((Math.max(numInlets, numOutlets) - 1) * socketPadding);
            return { width: minContentSize.width,
                     height: headerHeight + Math.max(requiredContentHeight, minContentSize.height) };
        }

        var initialInlets = node.def.inlets,
            initialOutlets = node.def.outlets;

        var initialSize = findBestNodeSize(initialInlets  ? Object.keys(initialInlets).length  : 0,
                                           initialOutlets ? Object.keys(initialOutlets).length : 0,
                                           minContentSize);

        var longestInletLabel  = 0,
            longestOutletLabel = 0;

        if (initialInlets) {
            Object.keys(initialInlets).forEach(function(alias) {
                longestInletLabel = Math.max(longestInletLabel,
                    initialInlets[alias].label ? initialInlets[alias].label.length : alias.length);
            });
        }

        if (initialOutlets) {
            Object.keys(initialOutlets).forEach(function(alias) {
                longestOutletLabel = Math.max(longestOutletLabel,
                    initialOutlets[alias].label ? initialOutlets[alias].label.length : alias.length);
            });
        }

        var width = initialSize.width, height = initialSize.height;
        var bodyWidth = width,
            bodyHeight = height - headerHeight,
            inletsMargin = longestInletLabel * letterWidth,
            outletsMargin = longestOutletLabel * letterWidth,
            fullNodeWidth = inletsMargin + bodyWidth + outletsMargin;

        var nodeElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-node');

        // append shadow
        nodeElm.append('path').attr('class', 'rpd-shadow')
                              .attr('fill', 'rgba(0,0,0,0.3)')
                              .attr('d', roundedRect(3, 3, fullNodeWidth, headerHeight + bodyHeight,
                                                     roundness, roundness, roundness, roundness));

        // append node header
        nodeElm.append('path').attr('class', 'rpd-header').classed('rpd-drag-handle', true)
                              .attr('d', roundedRect(0, 0, fullNodeWidth, headerHeight,
                                                     roundness, roundness, 0, 0));
        nodeElm.append('text').attr('class', 'rpd-name').text(node.def.title || node.type)
                              .attr('x', 7).attr('y', 12)
                              .style('pointer-events', 'none');
        // append node body
        nodeElm.append('path').attr('class', 'rpd-content')
                              .attr('fill', 'rgba(150,150,150,.5)')
                              .attr('d', roundedRect(0, headerHeight, fullNodeWidth, bodyHeight, 0, 0,
                                                        roundness, roundness));
        nodeElm.append('rect').attr('class', 'rpd-body')
                              .attr('fill', 'transparent').attr('stroke', '#222').attr('stroke-width', 1)
                              .attr('width', fullNodeWidth).attr('height', height)
                              .attr('rx', roundness).attr('ry', roundness)
                              .style('pointer-events', 'none');

        // append tooltip with description
        nodeElm.select('.rpd-header')
               .append(_createSvgElement('title'))
               .text(description ? (description + ' (' + node.type + ')') : node.type);

        // append remove button
        nodeElm.append('g').attr('class', 'rpd-remove-button')
                           .attr('transform', 'translate(' + (fullNodeWidth-12) + ',1)')
               .call(function(button) {
                   button.append('path').attr('d', roundedRect(-1, 3, 9, 9, 2, 2, 2, 3))
                                        .attr('fill', 'transparent')
                                        .attr('class', 'rpd-remove-button-handle');
                   button.append('text').text('x').attr('x', 2).attr('y', 8)
                                        .style('pointer-events', 'none');
               });

        // append placeholders for inlets, outlets and a target element to render body into
        nodeElm.append('g').attr('class', 'rpd-inlets').attr('transform', 'translate(' + 0 + ',' + headerHeight + ')')
                                                       .data({ position: { x: 0, y: headerHeight } });
        nodeElm.append('g').attr('class', 'rpd-process').attr('transform', 'translate(' + (inletsMargin + (pivot.x * width)) + ','
                                                                                        + (headerHeight + ((height - headerHeight) * pivot.y)) + ')');
        nodeElm.append('g').attr('class', 'rpd-outlets').attr('transform', 'translate(' + fullNodeWidth + ',' + headerHeight + ')')
                                                        .data({ position: { x: width, y: headerHeight } });

        nodeElm.classed('rpd-'+node.type.slice(0, node.type.indexOf('/'))+'-toolkit-node', true)
               .classed('rpd-'+node.type.replace('/','-'), true);

        var numInlets = 0, numOutlets = 0;
        var inletElms = [], outletElms = [];
        var lastSize = initialSize;

        function checkNodeSize() {
            var curSize = lastSize;
            var newSize = findBestNodeSize(numInlets, numOutlets, minContentSize);
            if ((newSize.width === curSize.width) && (newSize.height === curSize.height)) return;
            inletsMargin = longestInletLabel * letterWidth;
            outletsMargin = longestOutletLabel * letterWidth;
            fullNodeWidth = inletsMargin + newSize.width + outletsMargin;
            nodeElm.select('path.rpd-header').attr('d', roundedRect(0, 0, fullNodeWidth, headerHeight,
                                                                    roundness, roundness, 0, 0));
            nodeElm.select('g.rpd-remove-button').attr('transform', 'translate(' + (fullNodeWidth-12) + ',1)');
            nodeElm.select('path.rpd-shadow').attr('d', roundedRect(0, 0, fullNodeWidth, newSize.height,
                                                                    roundness, roundness, roundness, roundness));
            nodeElm.select('rect.rpd-body').attr('height', newSize.height).attr('width', fullNodeWidth);
            nodeElm.select('path.rpd-content').attr('d', roundedRect(0, headerHeight,
                fullNodeWidth, newSize.height - headerHeight,
                0, 0, roundness, roundness));
            nodeElm.select('g.rpd-process').attr('transform', 'translate(' + (inletsMargin + (pivot.x * newSize.width)) + ','
                                                                           + (headerHeight + ((newSize.height - headerHeight) * pivot.y)) + ')');
            nodeElm.select('g.rpd-outlets').attr('transform', 'translate(' + fullNodeWidth + ',' + headerHeight + ')');
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

        function notifyNewInlet(elm, inlet) {
            longestInletLabel = Math.max(longestInletLabel, inlet.label ? inlet.label.length : inlet.alias.length);
            numInlets++; inletElms.push(elm); checkNodeSize();
            recalculateSockets();
        }

        function notifyNewOutlet(elm, outlet) {
            longestOutletLabel = Math.max(longestOutletLabel, outlet.label ? outlet.label.length : outlet.alias.length);
            numOutlets++; outletElms.push(elm); checkNodeSize();
            recalculateSockets();
        }

        function findInletPos(idx) { // index from top to down for Quartz mode, or left to right for PD mode
            if (numInlets >= numOutlets) {
                return { x: 0, y: socketsMargin + (socketPadding * idx) };
            } else {
                var fullSide = (2 * socketsMargin) + (numOutlets - 1) * socketPadding;
                return { x: 0, y: (fullSide / 2) + (((-1 * (numInlets - 1)) / 2) + idx) * socketPadding };
            }
        }

        function findOutletPos(idx) { // index from top to down for Quartz mode, or left to right for PD mode
            if (numOutlets >= numInlets) {
                return { x: 0, y: socketsMargin + (socketPadding * idx) };
            } else {
                var fullSide = (2 * socketsMargin) + (numInlets - 1) * socketPadding;
                return { x: 0, y: (fullSide / 2) + (((-1 * (numOutlets - 1)) / 2) + idx) * socketPadding };
            }
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
                                  .attr('fill', '#999').attr('stroke', '#333').attr('stroke-width', 1)
                                  .attr('cx', 0).attr('cy', 0).attr('r', 4);
            group.append('g').attr('class', 'rpd-value-holder')
                 .attr('transform', 'translate(-8,0)')
                 .attr('text-anchor', 'end')
                 .append('text').attr('class', 'rpd-value').attr('fill', '#999');
            group.append('text').attr('class', 'rpd-name').text(inlet.def.label || inlet.alias)
                                .attr('x', 8).attr('y', 0);
        });
        listeners[inlet.node.id].inlet(inletElm, inlet);
        inletToConnector[inlet.id] = inletElm.select('.rpd-connector');
        return { element: inletElm.node() };
    },

    createOutlet: function(outlet, render) {
        var outletElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-outlet');
        outletElm.call(function(group) {
            //group.attr('transform', 'translate(' + outletPos.x + ',' + outletPos.y + ')')
            group.append('circle').attr('class', 'rpd-connector')
                                  .attr('fill', '#999').attr('stroke', '#333').attr('stroke-width', 1)
                                  .attr('cx', 0).attr('cy', 0).attr('r', 4);
            group.append('g').attr('class', 'rpd-value-holder')
                 .append('text').attr('class', 'rpd-value').attr('fill', '#999')
                                .attr('x', 10).attr('y', 0)
                                .style('pointer-events', 'none');
            group.append('text').attr('class', 'rpd-name').text(outlet.def.label || outlet.alias)
                                .attr('x', -8).attr('y', 0);
        });
        listeners[outlet.node.id].outlet(outletElm, outlet);
        outletToConnector[outlet.id] = outletElm.select('.rpd-connector');
        return { element: outletElm.node() };
    },

    createLink: function(link) {
        var linkElm = d3.select(_createSvgElement(
                            (config.linkForm && (config.linkForm == 'curve')) ? 'path' : 'line'
                        )).attr('class', 'rpd-link')
                          .attr('fill', 'transparent')
                          .attr('stroke', 'lightgray')
                          .attr('stroke-width', 2);
        return { element: linkElm.node(),
                 rotate: function(x0, y0, x1, y1) {
                     if (config.linkForm && (config.linkForm == 'curve')) {
                        linkElm.attr('d', bezierByH(x0, y0, x1, y1));
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
        return { x: connectorPos.x + 5, y: connectorPos.y + 5 };
    },

    getOutletPos: function(outlet) {
        var connectorPos = getPos(outletToConnector[outlet.id].node());
        return { x: connectorPos.x + 5, y: connectorPos.y + 5 };
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

function bezierByH(x0, y0, x1, y1) {
    var mx = x0 + (x1 - x0) / 2;

    return 'M' + x0 + ' ' + y0 + ' '
         + 'C' + mx + ' ' + y0 + ' '
               + mx + ' ' + y1 + ' '
               + x1 + ' ' + y1;
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

});

})(this);
