;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

Rpd.style('blender', 'svg', function(config) {

var d3 = d3 || d3_tiny;

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

var lastCanvas = null;

var socketPadding = 25, // distance between inlets/outlets in SVG units
    socketsMargin = 15; // distance between first/last inlet/outlet and body edge
var bodySizePadding = 30;
var headerHeight = 20; // height of a node header in SVG units

var letterWidth = 8;

var listeners = {};
var inletToConnector = {},
    outletToConnector = {};

var defs = d3.select(_createSvgElement('defs'));
// background blueprint pattern
defs.append('pattern').attr('id', 'blueprint-sub').attr('patternUnits', 'userSpaceOnUse')
                      .attr('width', 20).attr('height', 20)
                      .append('rect').attr('fill', 'transparent')
                                     .attr('stroke', '#2c2c2c').attr('stroke-width', 1)
                                     .attr('width', 20).attr('height', 20);
defs.append('pattern').attr('id', 'blueprint').attr('patternUnits', 'userSpaceOnUse')
                      .attr('width', 100).attr('height', 100)
                      .call(function(pattern) {
                          pattern.append('rect').attr('fill', '#323232')
                                                .attr('width', 100).attr('height', 100);
                          pattern.append('rect').attr('fill', 'url(#blueprint-sub)')
                                                .attr('width', 100).attr('height', 100);
                          pattern.append('rect').attr('fill', 'transparent')
                                                .attr('stroke', '#2c2c2c').attr('stroke-width', 2)
                                                .attr('width', 100).attr('height', 100);
                      });
// cyan header gradient
defs.append('linearGradient').attr('id', 'cyan-gradient')//.attr('gradientUnits', 'userSpaceOnUse')
                             .attr('x1', '50%').attr('y1', '100%').attr('x2', '50%').attr('y2', '0%')
                             .call(function(linearGradient) {
                                 linearGradient.append('stop').attr('offset', '0%')
                                                              .attr('style', 'stop-color:rgb(59,195,189);stop-opacity:0.5');
                                 linearGradient.append('stop').attr('offset', '90%')
                                                              .attr('style', 'stop-color:rgb(83,186,176);stop-opacity:0.55');
                                 linearGradient.append('stop').attr('offset', '100%')
                                                              .attr('style', 'stop-color:rgb(83,219,213);stop-opacity:0.6');
                             });
// gray header gradient
defs.append('linearGradient').attr('id', 'gray-gradient')//.attr('gradientUnits', 'userSpaceOnUse')
                             .attr('x1', '50%').attr('y1', '100%').attr('x2', '50%').attr('y2', '0%')
                             .call(function(linearGradient) {
                                 linearGradient.append('stop').attr('offset', '0%')
                                                              .attr('style', 'stop-color:rgb(110,110,110);stop-opacity:0.5');
                                 linearGradient.append('stop').attr('offset', '90%')
                                                              .attr('style', 'stop-color:rgb(115,115,115);stop-opacity:0.6');
                                 linearGradient.append('stop').attr('offset', '100%')
                                                              .attr('style', 'stop-color:rgb(135,135,135);stop-opacity:0.5');
                             });

// selection gradient
defs.append('linearGradient').attr('id', 'select-gradient')//.attr('gradientUnits', 'userSpaceOnUse')
                             .attr('x1', '50%').attr('y1', '100%').attr('x2', '50%').attr('y2', '0%')
                             .call(function(linearGradient) {
                                 linearGradient.append('stop').attr('offset', '0%')
                                                              .attr('style', 'stop-color:rgb(85,146,185);stop-opacity:1');
                                 linearGradient.append('stop').attr('offset', '71%')
                                                              .attr('style', 'stop-color:rgb(59,129,204);stop-opacity:1');
                                 linearGradient.append('stop').attr('offset', '100%')
                                                              .attr('style', 'stop-color:rgb(45,112,179);stop-opacity:1');
                             });

// deselection gradient
defs.append('linearGradient').attr('id', 'deselect-gradient')//.attr('gradientUnits', 'userSpaceOnUse')
                             .attr('x1', '50%').attr('y1', '100%').attr('x2', '50%').attr('y2', '0%')
                             .call(function(linearGradient) {
                                  linearGradient.append('stop').attr('offset', '0%')
                                                               .attr('style', 'stop-color:rgb(54,54,54);stop-opacity:1');
                                  linearGradient.append('stop').attr('offset', '70%')
                                                               .attr('style', 'stop-color:rgb(72,72,72);stop-opacity:1');
                                  linearGradient.append('stop').attr('offset', '100%')
                                                               .attr('style', 'stop-color:rgb(83,83,83);stop-opacity:1');
                             });

// link gradient
defs.append('radialGradient').attr('id', 'link-gradient')//.attr('gradientUnits', 'userSpaceOnUse')
                             .attr('cx', '50%').attr('cy', '50%').attr('r', '75%')
                             .call(function(radialGradient) {
                                 radialGradient.append('stop').attr('offset', '45%')
                                                              .attr('style', 'stop-color:rgb(255,255,255);stop-opacity:1');
                                 radialGradient.append('stop').attr('offset', '100%')
                                                              .attr('style', 'stop-color:rgb(150,150,150);stop-opacity:1');
                             });
// disabled link gradient
defs.append('radialGradient').attr('id', 'disabled-link-gradient')//.attr('gradientUnits', 'userSpaceOnUse')
                             .attr('cx', '50%').attr('cy', '50%').attr('r', '75%')
                             .call(function(radialGradient) {
                                 radialGradient.append('stop').attr('offset', '45%')
                                                              .attr('style', 'stop-color:rgb(155,155,155);stop-opacity:1');
                                 radialGradient.append('stop').attr('offset', '100%')
                                                              .attr('style', 'stop-color:rgb(75,75,75);stop-opacity:1');
                              });
// shadow blur filter
defs.append('filter').attr('id', 'shadow-blur')
                     .attr('x', -10).attr('y', -10).attr('width', 400).attr('height', 400)
                     .call(function(filter) {
                         filter.append('feOffset').attr('in', 'SourceAlpha')
                                                  .attr('result', 'offOut')
                                                  .attr('dx', 0).attr('dy', 6);
                         filter.append('feGaussianBlur').attr('in', 'offOut')
                                                        .attr('result', 'blurOut')
                                                        .attr('stdDeviation', '3 5');
                         filter.append('feBlend').attr('in', 'SourceGraphic')
                                                 .attr('in2', 'blurOut')
                                                 .attr('mode', 'normal');
                     });

// text emboss filter
defs.append('filter').attr('id', 'text-emboss')
                     .attr('x', -10).attr('y', -10).attr('width', 300).attr('height', 300)
                     .call(function(filter) {
                         filter.append('feFlood').attr('flood-color', '#757575')
                                                 .attr('result', 'color');
                         filter.append('feOffset').attr('in', 'SourceAlpha')
                                                  .attr('result', 'offOut')
                                                  .attr('dx', 0.5).attr('dy', 0);
                         filter.append('feComposite').attr('in', 'color')
                                                     .attr('in2', 'offOut')
                                                     .attr('operator', 'in');
                         filter.append('feBlend').attr('in', 'SourceGraphic')
                                                 .attr('mode', 'normal');
                     });

// button emboss filter
defs.append('filter').attr('id', 'button-emboss')
                     .attr('x', -10).attr('y', -0.5).attr('width', 300).attr('height', 300)
                     .call(function(filter) {
                         filter.append('feFlood').attr('flood-color', '#757575')
                                                 .attr('result', 'color');
                         filter.append('feOffset').attr('in', 'SourceAlpha')
                                                  .attr('result', 'offOut')
                                                  .attr('dx', -1).attr('dy', 0.5);
                         filter.append('feComposite').attr('in', 'color')
                                                     .attr('in2', 'offOut')
                                                     .attr('operator', 'in');
                         filter.append('feBlend').attr('in', 'SourceGraphic')
                                                 .attr('mode', 'normal');
                     });

return {

    edgePadding: { horizontal: 30, vertical: 20 },
    boxPadding:  { horizontal: 20, vertical: 30 },

    createCanvas: function(patch, parent) {
        var canvas = d3.select(_createSvgElement('g'))
                       .classed('rpd-patch', true);
        canvas.append(defs.node());
        canvas.append('rect').attr('width', '100%').attr('height', '100%')
                             .attr('fill', 'url(#blueprint)');
        return { element: canvas.node() };
    },

    createNode: function(node, render, description, icon) {

        var minContentSize = render.size ? { width: render.size.width || 70,
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
                              //.attr('fill', 'url(#cyan-gradient)').attr('stroke', '#333').attr('stroke-width', 1.5)
                              .attr('fill', 'rgba(0,0,0,0.3)')
                              .attr('filter', 'url(#shadow-blur)')
                              .attr('d', roundedRect(0, 0, fullNodeWidth, headerHeight + bodyHeight, 6, 6, 6, 6));

        // append node header
        nodeElm.append('path').attr('class', 'rpd-header').classed('rpd-drag-handle', true)
                              .attr('fill', 'url(#gray-gradient)')
                              .attr('d', roundedRect(0, 0, fullNodeWidth, headerHeight, 6, 6, 0, 0));
        nodeElm.append('text').attr('class', 'rpd-name').text(node.def.title || node.type)
                              .attr('x', 7).attr('y', 12)
                              .attr('filter', 'url(#text-emboss)')
                              .style('pointer-events', 'none');
        // append node body
        nodeElm.append('path').attr('class', 'rpd-content')
                              .attr('fill', 'rgba(150,150,150,.5)')
                              .attr('d', roundedRect(0, headerHeight, fullNodeWidth, bodyHeight, 0, 0, 6, 6));
        nodeElm.append('rect').attr('class', 'rpd-body')
                              .attr('fill', 'transparent').attr('stroke', '#222').attr('stroke-width', 1.5)
                              .attr('width', fullNodeWidth).attr('height', height)
                              .attr('rx', 6).attr('ry', 6)
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
            nodeElm.select('path.rpd-header').attr('d', roundedRect(0, 0, fullNodeWidth, headerHeight, 6, 6, 0, 0));
            nodeElm.select('g.rpd-remove-button').attr('transform', 'translate(' + (fullNodeWidth-12) + ',1)');
            nodeElm.select('path.rpd-shadow').attr('d', roundedRect(0, 0, fullNodeWidth, newSize.height, 6, 6, 6, 6));
            nodeElm.select('rect.rpd-body').attr('height', newSize.height).attr('width', fullNodeWidth);
            nodeElm.select('path.rpd-content').attr('d', roundedRect(0, headerHeight,
                fullNodeWidth, newSize.height - headerHeight, 0, 0, 6, 6));
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
                                .attr('x', 10).attr('y', 0)
                                .attr('filter', 'url(#text-emboss)');
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
                                .attr('x', -10).attr('y', 0)
                                .attr('filter', 'url(#text-emboss)');
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
