;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

Rpd.style('quartz', 'html', function(config) {

var d3 = d3 || d3_tiny;

var lastCanvas;

var inletToConnector = {},
    outletToConnector = {};

function getPos(elm) { var bounds = elm.getBoundingClientRect();
                       return { x: bounds.left, y: bounds.top } };

return {

    edgePadding: { horizontal: 30, vertical: 20 },
    boxPadding:  { horizontal: 20, vertical: 30 },

    createCanvas: function(patch, parent) {
        return {
            element: d3.select(document.createElement('div'))
                       .classed('rpd-patch', true).node()
        };
    },

    createNode: function(node, render, description, icon) {

        var nodeElm = d3.select(document.createElement('table'))
                        .attr('class', 'rpd-node');

        // node header: node title and remove button
        nodeElm.append('thead').attr('class', 'rpd-title')
                               .classed('rpd-drag-handle', true) // a mark for renderer
               // remove button
               .call(function(thead) {
                   thead.append('tr').attr('class', 'rpd-remove-button')
                        .append('th')/*.attr('colspan', '3')*/.text('x');
               })
               // node name, and type, if requested
               .call(function(thead) {
                    thead.append('tr').attr('class', 'rpd-header')
                         .append('th').attr('colspan', 3)
                         .call(function(th) {
                             if (config.showTypes) th.append('span').attr('class', 'rpd-type').text(node.type);
                             if (icon) th.append('span').attr('class', 'rpd-icon').text(icon);
                             th.append('span').attr('class', 'rpd-name').text(node.def.title || node.type);
                             // add description to be shown on hover
                             th.attr('title', description ? (description + ' (' + node.type + ')') : node.type);
                         });

               });

        // node content
        nodeElm.append('tbody').attr('class', 'rpd-content')
               .call(function(tbody) {
                   tbody.append('tr')
                        // inlets placeholder
                        .call(function(tr) {
                            tr.append('td').attr('class', 'rpd-inlets')
                              .append('table')
                              .append('tbody')
                              .append('div').attr('class', 'rpd-inlets-target'); // -> node/add-inlet
                        })
                        // node body
                        .call(function(tr) {
                            tr.append('td').attr('class', 'rpd-body')
                              .append('table')
                              .append('tbody').append('tr').append('td')
                              .append('div').attr('class', 'rpd-process-target'); // -> node/process
                        })
                        // outlets placeholder
                        .call(function(tr) {
                            tr.append('td').attr('class', 'rpd-outlets')
                              .append('table')
                              .append('tbody')
                              .append('div').attr('class', 'rpd-outlets-target'); // -> node/add-outlet
                        })
               });

        return {
            element: nodeElm.node(),
            size: render.size ? { width: render.size.width || 70, height: render.size.height || 30 }
                              : { width: 70, height: 30 }
        };

    },

    createInlet: function(inlet, render) {
        var inletElm = d3.select(document.createElement('tr'))
                         .attr('class', 'rpd-inlet')
                         .call(function(tr) {
                             tr.append('td').attr('class', 'rpd-connector');
                             tr.append('td').attr('class', 'rpd-value-holder')
                                            .append('span').attr('class', 'rpd-value');
                             tr.append('td').attr('class', 'rpd-name').text(inlet.def.label || inlet.alias);
                             if (config.showTypes) tr.append('td').attr('class', 'rpd-type').text(inlet.type);
                         });
        inletToConnector[inlet.id] = inletElm.select('.rpd-connector');
        return { element: inletElm.node() };
    },

    createOutlet: function(outlet, render) {
        var outletElm = d3.select(document.createElement('tr'))
                          .attr('class', 'rpd-outlet')
                          .call(function(tr) {
                              tr.append('td').attr('class', 'rpd-connector');
                              tr.append('td').attr('class', 'rpd-value');
                              if (config.showTypes) tr.append('td').attr('class', 'rpd-type').text(outlet.type);
                              tr.append('td').attr('class', 'rpd-name').text(outlet.def.label || outlet.alias);
                          });
        outletToConnector[outlet.id] = outletElm.select('.rpd-connector');
        return { element: outletElm.node() };
    },

    createLink: function(link) {
        var linkElm = d3.select(document.createElement('span'))
                        .attr('class', 'rpd-link')
                        .style('position', 'absolute')
                        .style('transform-origin', 'left top')
                        .style('-webkit-transform-origin', 'left top');
        return {
            element: linkElm.node(),
            rotate: function(x0, y0, x1, y1) {
                var distance = Math.sqrt(((x0 - x1) * (x0 - x1)) +
                                         ((y0 - y1) * (y0 - y1)));
                var angle = Math.atan2(y1 - y0, x1 - x0);
                linkElm.style('left', x0 + 'px').style('top', y0 + 'px')
                       .style('width', Math.floor(distance) + 'px')
                       .style('transform', 'rotateZ(' + angle + 'rad)')
                       .style('-webkit-transform', 'rotateZ(' + angle + 'rad)');
            }
        }
    },

    getInletPos: function(inlet) {
        var connectorPos = getPos(inletToConnector[inlet.id].node());
        return { x: connectorPos.x, y: connectorPos.y - 1 };;
    },

    getOutletPos: function(outlet) {
        var connectorPos = getPos(outletToConnector[outlet.id].node());
        return { x: connectorPos.x, y: connectorPos.y - 1 };
    },

    getLocalPos: function(pos) {
        if (!lastCanvas) return pos;
        // calculate once on patch switch?
        var canvasPos = getPos(lastCanvas.node());
        return { x: pos.x - canvasPos.x, y: pos.y - canvasPos.y - 1 };
    },

    onPatchSwitch: function(patch, canvas) {
        lastCanvas = d3.select(canvas);
    }

};

});

})(this);
