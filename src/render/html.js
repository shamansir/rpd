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
    boxSize: { width: 100, height: 40 },
    // width of a link, sometimes it's hard to catch so could be increased
    linkWidth: null, // null means use the value from CSS
    // a time for value update or error effects on inlets/outlets
    effectTime: 1000
};

// z-indexes
var NODE_LAYER = 0,
    NODEDRAG_LAYER = 1,
    LINK_LAYER = 2,
    LINKDRAG_LAYER = 3;

// either use the full d3.js library or the super-tiny version provided with RPD
var d3 = d3_tiny || d3;

var tree = {
    patches: {},
    nodes: {},
    inlets: {},
    outlets: {},
    links: {},

    patchToLayout: {},
    nodeToLinks: {}
};

function HtmlRenderer(patch) {

return function(networkRoot, userConfig) {

    var config = mergeConfig(userConfig, defaultConfig);

    networkRoot = d3.select(networkRoot)
                    .classed('rpd-network', true);

    var root;

    return {

        // the object below reacts on every Patch event and constructs corresponding
        // HTML structures in response, or modifies them;

        'patch/is-ready': function(update) {

            var docElm = d3.select(document.documentElement);

            // build root element as a target for all further patch modifications
            root = d3.select(document.createElement('div'))
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

            // initialize the node layout (helps to determine the position where new node should be placed)
            tree.patchToLayout[patch.id] = new GridLayout();

            // resize root element on window resize
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

            var nodeBox = d3.select(document.createElement('div')).attr('className', 'rpd-node-box');
            var nodeElm = nodeBox.append('table').attr('className', 'rpd-node');

            if (config.mode === QUARTZ_MODE) {

                // node header: node title and remove button
                nodeElm.append('thead').attr('className', 'rpd-title')
                       // remove button
                       .call(function(thead) {
                           thead.append('tr').attr('className', 'rpd-remove-button')
                                .append('th')/*.attr('colspan', '3')*/.text('x');
                       })
                       // node name, and type, if requested
                       .call(function(thead) {
                            thead.append('tr')
                                 .append('th').attr('className', 'rpd-info').attr('colspan', 3)
                                 .call(function(th) {
                                     if (config.showTypes) th.append('span').attr('className', 'rpd-type').text(node.type);
                                     th.append('span').attr('className', 'rpd.name').text(node.name);
                                 });
                       });

                // node content
                nodeElm.append('tbody').attr('className', 'rpd-content')
                       .call(function(tbody) {
                           tbody.append('tr')
                                // inlets placeholder
                                .call(function(tr) {
                                    tr.append('td').attr('className', 'rpd-inlets')
                                      .append('table')
                                      .append('tbody')
                                      .append('div').attr('className', 'rpd-inlets-target'); // -> node/add-inlet
                                })
                                // node body
                                .call(function(tr) {
                                    tr.append('td').attr('className', 'rpd-body')
                                      .append('table')
                                      .append('tbody').append('tr').append('td')
                                      .append('div').attr('className', 'rpd-process-target'); // -> node/process
                                })
                                // outlets placeholder
                                .call(function(tr) {
                                    tr.append('td').attr('className', 'rpd-outlets')
                                      .append('table')
                                      .append('tbody')
                                      .append('div').attr('className', 'rpd-outlets-target'); // -> node/add-outlet
                                })
                       });

            } else if (config.mode === PD_MODE) {

                // inlets placehoder
                nodeElm.append('tr').attr('className', 'rpd-inlets')
                       .append('td')
                       .append('table').append('tbody').append('tr')
                       .append('div').attr('className', 'rpd-inlets-target'); // -> node/add-inlet

                // remove button
                nodeElm.append('tr').attr('className', 'rpd-remove-button')
                       .append('td').text('x');

                // node content
                nodeElm.append('tr').attr('className', 'rpd-content')
                        .call(function(tr) {
                            tr.append('td').attr('className', 'rpd-title')
                              .call(function(td) {
                                  td.append('span').attr('className', 'rpd-name').text(node.name);
                                  td.append('span').attr('className', 'rpd-type').text(node.type);
                              });
                            tr.append('td').attr('className', 'rpd-body')
                              .append('div')
                              .append('table').append('tbody').append('tr').append('td')
                              .append('div').attr('className', 'rpd-process-target'); // -> node/process
                        })

                // outlets placeholder
                nodeElm.append('tr').attr('className', 'rpd-outlets')
                       .append('td')
                       .append('table').append('tbody').append('tr')
                       .append('div').attr('className', 'rpd-outlets-target'); // -> node/add-outlet

            }

            nodeElm.classed('rpd-'+node.type.slice(0, node.type.indexOf('/'))+'-toolkit-node', true)
                   .classed('rpd-'+node.type.replace('/','-'), true);

            nodeBox.style('z-index', NODE_LAYER);

            // find a rectange to place the new node, and place it there

            var layout = tree.patchToLayout[update.patch.id],
                nextRect = layout.nextRect(node, config.boxSize, { width: root.node().offsetWidth,
                                                                   height: root.node().offsetHeight });

            nodeBox.style('left', Math.floor(nextRect.x) + 'px');
            nodeBox.style('top',  Math.floor(nextRect.y) + 'px');
            nodeBox.style('min-width',  Math.floor(nextRect.width) + 'px');
            nodeBox.style('min-height',  Math.floor(nextRect.height) + 'px');

            node.move(nextRect.x, nextRect.y);

            // store targets information and node root element itself
            tree.nodes[node.id] = nodeBox.data({ inletsTarget:  nodeElm.select('.rpd-inlets-target'),
                                                 outletsTarget: nodeElm.select('.rpd-outlets-target'),
                                                 processTarget: nodeElm.select('.rpd-process-target') });

            // append to the the patch root node
            root.append(nodeBox.node());

        },

        'node/process': function(update) {
            var node = update.node;
            var render = update.render;

            // update node body with custom renderer, if defined
            if (render.always) {
                var bodyElm = tree.nodes[node.id].data().processTarget.node();
                render.always(bodyElm, update.inlets, update.outlets);
            }
        }

    }

} // function(target, config)

} // function(patch)

// =============================================================================
// ============================== Layout =======================================
// =============================================================================

function GridLayout() {
    this.node_rects = [];
}
GridLayout.DEFAULT_WIDTH = 1, // in boxes
GridLayout.DEFAULT_HEIGHT = 1, // in boxes
GridLayout.DEFAULT_X_MARGIN = 0.5,  // in boxes
GridLayout.DEFAULT_Y_MARGIN = 1, // in boxes
GridLayout.DEFAULT_LIMITS = [ 1000, 1000 ]; // in pixels
GridLayout.prototype.nextRect = function(node, boxSize, limits) {
    limits = limits || GridLayout.DEFAULT_LIMITS;
    var node_rects = this.node_rects;
    var width =  (node.def.width  || GridLayout.DEFAULT_WIDTH)  * boxSize.width,
        height = (node.def.height || GridLayout.DEFAULT_HEIGHT) * boxSize.height;
    var last_rect = (node_rects.length ? node_rects[node_rects.length-1] : null);
    var new_rect = { x: last_rect ? last_rect.x : 0,
                     y: last_rect ? (last_rect.y + last_rect.height +
                                    (GridLayout.DEFAULT_Y_MARGIN * boxSize.height)) : 0,
                     width: width,
                     height: height };
    if ((new_rect.y + boxSize.height) > limits.height) {
        new_rect.x = new_rect.x + width + (GridLayout.DEFAULT_X_MARGIN * boxSize.width);
        new_rect.y = 0;
    }
    node_rects.push(new_rect);
    return new_rect;
}

// =============================================================================
// ============================== NodeList =====================================
// =============================================================================



// =============================================================================
// =========================== registration ====================================
// =============================================================================

Rpd.HtmlRenderer = HtmlRenderer;

Rpd.renderer('html', HtmlRenderer);

})();
