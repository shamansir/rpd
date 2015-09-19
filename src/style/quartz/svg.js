Rpd.style('quartz', 'svg', function(config) {

var d3 = d3 || d3_tiny;

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

var lastRoot;

var socketPadding = 25, // distance between inlets/outlets in SVG units
    socketsMargin = 15; // distance between first/last inlet/outlet and body edge
var headerHeight = 21; // height of a node header in SVG units

var listeners = {};

return {

    edgePadding: { horizontal: 30, vertical: 20 },
    boxPadding:  { horizontal: 20, vertical: 30 },

    createRoot: function(patch, parent) {
        return d3.select(_createSvgElement('g'));
    },

    createNode: function(node, render, description) {

        var defaultContentSize = style.defaultContentSize;
        var minContentSize = render.size ? { width: render.size.width || 100,
                                             height: render.size.height || 40 }
                                         : { width: 100, height: 40 };

        function findBestNodeSize(numInlets, numOutlets, minContentSize) {
            var requiredContentHeight = (2 * socketsMargin) + ((Math.max(numInlets, numOutlets) - 1) * socketPadding);
            return { width: minContentSize.width,
                     height: headerHeight + Math.max(requiredContentHeight, minContentSize.height) };
        }

        var initialSize = findBestNodeSize(node.def.inlets  ? Object.keys(node.def.inlets).length  : 0,
                                           node.def.outlets ? Object.keys(node.def.outlets).length : 0,
                                           minContentSize);

        var nodePos = placing.nextPosition(node, initialSize, { width: limitSrc.width, height: limitSrc.height });

        var width = initialSize.width, height = initialSize.height;
        var bodyWidth = width,
            bodyHeight = height - headerHeight;

        var nodeElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-node');

        // append shadow
        nodeElm.append('rect').attr('class', 'rpd-shadow').attr('width', width).attr('height', height).attr('x', 5).attr('y', 6)
                                                                                                      .attr('rx', 3).attr('ry', 3);

        // append node header
        nodeElm.append('path').attr('class', 'rpd-header').attr('d', roundedRect(0, 0, width, headerHeight, 2, 2, 0, 0));
        nodeElm.append('text').attr('class', 'rpd-name').text(node.name)
                              .attr('x', 5).attr('y', 6).style('pointer-events', 'none');
        // append node body
        nodeElm.append('path').attr('class', 'rpd-content').attr('d', roundedRect(0, headerHeight, width, bodyHeight, 0, 0, 2, 2));
        nodeElm.append('rect').attr('class', 'rpd-body').attr('width', width).attr('height', height).attr('rx', 2).attr('ry', 2)
                              .style('pointer-events', 'none');

        // append tooltip with description
        nodeElm.select('.rpd-header')
               .append(_createSvgElement('title')).text(
                        nodeDescriptions[node.type] ? (nodeDescriptions[node.type] + ' (' + node.type + ')') : node.type);

        // append remove button
        nodeElm.append('g').attr('class', 'rpd-remove-button')
                           .attr('transform', 'translate(' + (width-12) + ',1)')
               .call(function(button) {
                   button.append('path').attr('d', roundedRect(0, 0, 11, 11, 2, 2, 2, 3));
                   button.append('text').text('x').attr('x', 3).attr('y', 2).style('pointer-events', 'none');
               });

        // append placeholders for inlets, outlets and a target element to render body into
        nodeElm.append('g').attr('class', 'rpd-inlets').attr('transform', 'translate(' + 0 + ',' + headerHeight + ')')
                                                       .data({ position: { x: 0, y: headerHeight } });
        nodeElm.append('g').attr('class', 'rpd-process').attr('transform', 'translate(' + (width / 2) + ',' + (headerHeight + ((height - headerHeight) / 2)) + ')');
        nodeElm.append('g').attr('class', 'rpd-outlets').attr('transform', 'translate(' + width + ',' + headerHeight + ')')
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
            nodeElm.select('rect.rpd-shadow').attr('height', newSize.height).attr('width', newSize.width);
            nodeElm.select('rect.rpd-body').attr('height', newSize.height).attr('width', newSize.width);
            nodeElm.select('path.rpd-content').attr('d', roundedRect(0, headerHeight,
                newSize.width, newSize.height - headerHeight, 0, 0, 2, 2));
            nodeElm.select('g.rpd-process').attr('transform',
                'translate(' + (newSize.width / 2) + ',' + (headerHeight + ((newSize.height - headerHeight) / 2)) + ')');
            lastSize = newSize;
        }

        function recalculateSockets() {
            var inletElm;
            for (var i = 0, il = inletElms.length; i < il; i++) {
                inletElm = inletElms[i];
                var inletPos = findInletPos(i);
                inletElm.attr('transform',  'translate(' + inletPos.x + ',' + inletPos.y + ')');
                inletElm.data().position = inletPos;
            }
            var outletElm;
            for (var i = 0, il = outletElms.length; i < il; i++) {
                outletElm = outletElms[i];
                var outletPos = findOutletPos(i);
                outletElm.attr('transform',  'translate(' + outletPos.x + ',' + outletPos.y + ')');
                outletElm.data().position = outletPos;
            }
        }

        function notifyNewInlet(elm) {
            numInlets++; inletElms.push(elm); checkNodeSize();
            recalculateSockets();
        }

        function notifyNewOutlet(elm) {
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

        return nodeElm;

    },

    createInlet: function(inlet, render) {

    },

    createOutlet: function(outlet, render) {

    },

    createLink: function(link) {
    },

    onPatchSwitch: function(patch, root) {
        lastRoot = root;
    },

    onNodeRemove: function(node) {
        listeners[node.id] = null;
    }

};

});
