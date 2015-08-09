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
                       // remove button
                       .call(function(thead) {
                           thead.append('tr').attr('className', 'rpd-remove-button');
                           thead.append('th')/*.attr('colspan', '3')*/.text('x');
                       })
                       // node name, and type, if requested
                       .call(function(thead) {
                            thead.append('tr');
                            thead.append('th').attr('className', 'rpd-info').attr('colspan', 3)
                                 .call(function(th) {
                                     if (config.showTypes) th.append('span').attr('className', 'rpd-type').text(node.type);
                                 });
                            thead.append('span').attr('className', 'rpd.name').text(node.name);
                       });

                nodeElm.append('tbody').attr('className', 'rpd-content')
                       .call(function(tbody) {
                           tbody.append('tr')
                                // inlets placeholder
                                .call(function(tr) {
                                    tr.append('td').attr('className', 'rpd-inlets')
                                      .append('table')
                                      .append('tbody'); // -> node/add-inlet
                                })
                                // node body
                                .call(function(tr) {
                                    tr.append('td').attr('className', 'rpd-body')
                                      .append('table')
                                      .append('tbody').append('tr').append('td'); // -> node/process
                                })
                                // outlets placeholder
                                .call(function(tr) {
                                    tr.append('td').attr('className', 'rpd-outlets')
                                      .append('table')
                                      .append('tbody'); // -> node/add-outlet
                                })
                       });

            } else if (config.mode === PD_MODE) {

                nodeElm.append('tr').attr('className', 'rpd-inlets')
                       .append('td')
                       .append('table').append('tbody').append('tr'); // -> node/add-inlet

                nodeElm.append('tr').attr('className', 'rpd-remove-button')
                       .append('td').text('x');

                nodeElm.append('tr').attr('className', 'rpd-content')
                        .call(function(tr) {
                            tr.append('td').attr('className', 'rpd-title')
                              .call(function(td) {
                                  td.append('span').attr('className', 'rpd-name').text(node.name);
                                  td.append('span').attr('className', 'rpd-type').text(node.type);
                              });
                            tr.append('td').attr('className', 'rpd-body')
                              .append('div')
                              .append('table').append('tbody').append('tr').append('td'); // -> node/process
                        })

                nodeElm.append('tr').attr('className', 'rpd-outlets')
                       .append('td')
                       .append('table').append('tbody').append('tr'); // -> node/add-outlet

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
