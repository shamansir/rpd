Rpd.style('quartz', 'svg', function(config) {

var d3 = d3 || d3_tiny;

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

return {

    edgePadding: { horizontal: 30, vertical: 20 },
    boxPadding:  { horizontal: 20, vertical: 30 },

    createRoot: function(patch, parent) {
        return d3.select(_createSvgElement('g'));
    },

    createNode: function(node, render, description) {
    },

    createInlet: function(inlet, render) {

    },

    createOutlet: function(outlet, render) {

    },

    createLink: function(link) {
    },

    onSwitchPatch: function(patch, root) {

    }

};

});
