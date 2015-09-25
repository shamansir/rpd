Rpd.style('realpd', 'svg', (function() {

// we need this root to be shared between all instances of a function below,
// it is used to measure node header width, since it contains text, we need
// some hidden element to measure string width in pixels
var lastRoot;

var d3 = d3 || d3_tiny;

var socketPadding = 25; // distance between inlets/outlets in SVG units

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

return function(config) {

return {

    createRoot: function(patch, parent) {
        return {
            element: d3.select(_createSvgElement('g'))
                       .classed('rpd-patch', true).node()
        };
    },

    createNode: function(node, render, description) {

        var minContentSize = render.size ? { width: render.size.width || 100,
                                             height: render.size.height || 40 }
                                         : { width: 100, height: 40 };

        var nodeElm = d3.select(_createSvgElement('g'))
                        .attr('class', 'rpd-node');

        nodeElm.classed('rpd-'+node.type.slice(0, node.type.indexOf('/'))+'-toolkit-node', true)
               .classed('rpd-'+node.type.replace('/','-'), true);

        nodeElm.append('g').classed('rpd-drag-handle', true);
        nodeElm.append('g').classed('rpd-process', true);
        nodeElm.append('g').classed('rpd-inlets', true);
        nodeElm.append('g').classed('rpd-outlets', true);

        return {
            element: nodeElm.node(),
            size: minContentSize
        };

    },

    createInlet: function(inlet, render) {
        var inletElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-inlet');
        inletElm.append('g').attr('class', 'rpd-connector')
                .append('rect').attr('width', 8).attr('height', 2);
        return { element: inletElm.node() };
    },

    createOutlet: function(outlet, render) {
        var outletElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-outlet');
        outletElm.append('g').attr('class', 'rpd-connector')
                 .append('rect').attr('width', 8).attr('height', 2);
        return { element: outletElm.node() };
    },

    createLink: function(link) {
        var linkElm = d3.select(_createSvgElement('line'))
                        .attr('class', 'rpd-link');
        return { element: linkElm.node(),
                 rotate: function(x0, y0, x1, y1) {
                     linkElm.attr('x1', x0).attr('y1', y0)
                            .attr('x2', x1).attr('y2', y1);
                 } };
    },

    onPatchSwitch: function(patch, root) {
        lastRoot = d3.select(root);
    }


};

} })());
