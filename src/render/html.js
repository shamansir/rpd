(function() {

var ƒ = Rpd.unit;

    // inlets/outlets are at the left/right sides of a node body
var QUARTZ_MODE = 'quartz',
    // inlets/outlets are at the top/bottom sides of a node body
    PD_MODE = 'pd';

var defaultConfig = {
    mode: QUARTZ_MODE,
    // show inlet/outlet value only when user hovers over its connector
    // (always showing, by default)
    valuesOnHover: false,
    // show inlets/outlets and node types for debugging purposes
    showTypes: false,
    // show node containers for debugging purposes
    showBoxes: false,
    // are nodes allowed to be dragged
    nodesMovingAllowed: true,
    // show the list of nodes
    renderNodeList: true,
    // is node list collapsed by default, if shown
    nodeListCollapsed: true,
    // dimensions of the box used to measure everything
    boxSize: [ 100, 40 ],
    // width of a link, sometimes it's hard to catch so could be increased
    linkWidth: null, // null means use the value from CSS
    // a time for value update or error effects on inlets/outlets
    effectTime: 1000
};

// either use the full d3.js library or the super-tiny version provided with RPD
var d3 = d3_tiny || d3;

var tree = {
    patches: {},
    nodes: {},
    inlets: {},
    outlets: {},
    links: {}
};

function HtmlRenderer(patch) {

return function(networkRoot, userConfig) {

    var config = mergeConfig(userConfig, defaultConfig);

    return {

        // the object below reacts on every Patch event and constructs corresponding
        // HTML structures in response, or modifies them;

        'patch/is-ready': function(update) {

            var docElm = d3.select(document.documentElement);

            root = d3.select(document.createElement('div'))
                     .attr('class', function() {
                         var classes = [ 'rpd-patch' ];
                         classes.push('rpd-layout-' + config.mode);
                         classes.push('rpd-values-' + (config.valuesOnHover ? 'on-hover' : 'always-shown'));
                         if (config.showBoxes) classes.push('rpd-show-boxes');
                         return classes.join(' ');
                     })
                     .style('height', docElm.property('clientHeight') + 'px')
                     .data(update.patch);

            tree.patches[patch.id] = root;

            Kefir.fromEvents(docElm.node(), 'resize').onValue(function() {
                root.style('height', docElm.property('clientHeight') + 'px');
            });

        }

    }

} // function(target, config)

} // function(patch)

// =============================================================================
// =========================== registration ====================================
// =============================================================================

Rpd.HtmlRenderer = HtmlRenderer;

Rpd.renderer('html', HtmlRenderer);

})();
