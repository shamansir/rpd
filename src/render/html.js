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

    networkRoot = d3.select(networkRoot)
                    .classed('rpd-network', true);

    return {

        // the object below reacts on every Patch event and constructs corresponding
        // HTML structures in response, or modifies them;

        'patch/is-ready': function(update) {

            var docElm = d3.select(document.documentElement);

            var root = d3.select(document.createElement('div'))
                         .property('className', function() {
                             var classes = [ 'rpd-patch' ];
                             classes.push('rpd-layout-' + config.mode);
                             classes.push('rpd-values-' + (config.valuesOnHover ? 'on-hover' : 'always-shown'));
                             if (config.showBoxes) classes.push('rpd-show-boxes');
                             return classes.join(' ');
                         })
                         .style('height', docElm.property('clientHeight') + 'px')
                         .data(update.patch);

            tree.patches[patch.id] = root;

            Kefir.fromEvents(window, 'resize')
                 .map(function() { return window.innerHeight ||
                                          document.documentElement.clientHeight ||
                                          document.body.clientHeight; })
                 .onValue(function(value) {
                root.style('height', value + 'px');
            });

        },

        'patch/enter': function(update) {
            networkRoot.append(tree.patches[update.patch.id].node());
        },

        'patch/add-node': function(update) {
            var node = update.node;

            var render = update.render;

            var nodeBox = root.append('div').attr('className', 'rpd-node-box');
            var nodeElm = nodeBox.append('table').attr('className', 'rpd-node');

            if (config.mode === QUARTZ_MODE) {

                nodeElm.append('thead').attr('className', 'rpd-title')
                       // add remove button
                       .call(function(thead) {
                           thead.append('tr').attr('className', 'rpd-remove-button');
                           thead.append('th')/*.attr('colspan', '3')*/.text('x');
                       })
                       // add node title
                       .call(function(thead) {
                            thead.append('tr');
                            thead.append('th').attr('className', 'rpd-info').attr('colspan', 3)
                                 .call(function(th) {
                                     if (config.showTypes) th.append('span').attr('className', 'rpd-type').text(node.type);
                                 });
                            thead.append('span').attr('className', 'rpd.name').text(node.name);
                       })
                       // ...


                var thead = table.append('thead').attr('className', 'rpd-title');

                thead.append('tr').attr('className', 'rpd-remove-button')
                     .append('th')/*.attr('colspan', '3')*/.text('x');

                thead.append('tr')
                     .append('th').attr('className', 'rpd-info').attr('colspan', 3)
                     .append('span').attr('className', 'rpd.name').text(node.name);

                if (config.showTypes) {
                    thead.select('th.rpd-info')
                         .append('span').attr('className', 'rpd-type').text(node.type);
                }

                var contentRow = table.append('tbody').attr('className', 'rpd-content')
                                      .append('tr');

                contentRow.append('td').attr('className', 'rpd-inlets')
                          .append('table')
                          .append('tbody');

                contentRow.append('td').attr('className', 'rpd-body')
                          .append('table')
                          .append('tbody').append('tr').append('td');

                contentRow.append('td').attr('className', 'rpd-outlets')
                          .append('table')
                          .append('tbody');

            }
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
