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

var navigation = new Navigation();

var currentPatch;

var nodeTypes = Rpd.allNodeTypes,
    nodeDescriptions = Rpd.allNodeDescriptions;

function HtmlRenderer(patch) {

return function(networkRoot, userConfig) {

    var config = mergeConfig(userConfig, defaultConfig);

    networkRoot = d3.select(networkRoot)
                    .classed('rpd-network', true);

    var root;
    var connectivity, links;

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

            // initialize the node layout (helps in determining the position where new node should be placed)
            tree.patchToLayout[patch.id] = new GridLayout();

            // initialize connectivity module, it listens for clicks on outlets and inlets and builds or remove
            // links if they were clicked in the appropriate order
            connectivity = new Connectivity(root);
            // initialize links module, it controls the links (connections) appearance
            links = new Links();

            if (config.renderNodeList) buildNodeList(root, nodeTypes, nodeDescriptions);

            // resize root element on window resize
            Kefir.fromEvents(window, 'resize')
                 .map(function() { return window.innerHeight ||
                                          document.documentElement.clientHeight ||
                                          document.body.clientHeight; })
                 .onValue(function(value) {
                     root.style('height', value + 'px');
                 });

            Kefir.fromEvents(root.node(), 'selectstart').onValue(preventDefault);

        },

        'patch/enter': function(update) {
            currentPatch = update.patch;
            navigation.switch(update.patch);
            networkRoot.append(tree.patches[update.patch.id].node());
            links.updateAll();
        },

        'patch/exit': function(update) {
            root.remove();
        },

        'patch/refer': function(update) {
            var node = update.node;

            var nodeElm = tree.nodes[node.id];

            nodeElm.select('.rpd-node').classed('rpd-patch-reference', true);
            nodeElm.data().processTarget.text('[' + (update.target.name || update.target.id) + ']');

            Kefir.fromEvents(nodeElm.data().processTarget.node(), 'click')
                 .onValue((function(current, target) {
                    return function() {
                        current.exit();
                        target.enter();
                    }
                 })(patch, update.target));
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
        },

        'node/add-inlet': function(update) {

            var inlet = update.inlet;
            if (inlet.hidden) return;

            var inletsTarget = tree.nodes[update.node.id].data().inletsTarget;
            var render = update.render;

            var inletElm;

            if (config.mode == QUARTZ_MODE) {

                inletElm = d3.select(document.createElement('tr')).attr('className', 'rpd-inlet')
                             .call(function(tr) {
                                 tr.append('td').attr('className', 'rpd-connector');
                                 tr.append('td').attr('className', 'rpd-value-holder')
                                                .append('span').attr('className', 'rpd-value');
                                 tr.append('td').attr('className', 'rpd-name').text(inlet.name);
                                 if (config.showTypes) tr.append('td').attr('className', 'rpd-type').text(inlet.type);
                             });

            } else if (config.mode == PD_MODE) {

                inletElm = d3.select(document.createElement('td')).attr('className', 'rpd-inlet')
                             .call(function(td) {
                                 td.append('span').attr('className', 'rpd-connector');
                                 td.append('span').attr('className', 'rpd-name').text(inlet.name);
                                 td.append('span').attr('className', 'rpd-value-holder')
                                                  .append('span').attr('className', 'rpd-value');
                                 if (config.showTypes) td.append('span').attr('className', 'rpd-type').text(inlet.type);
                             });

            }

            inletElm.classed('rpd-'+inlet.type.replace('/','-'), true);
            inletElm.classed({ 'rpd-stale': true,
                               'rpd-readonly': inlet.readonly,
                               'rpd-cold': inlet.cold
                             });

            tree.inlets[inlet.id] = inletElm.data({
                disableEditor: null, // if inlet has a value editor, this way
                                     // we may disable it when new link
                                     // is connected to this inlet
                link: null // a link associated with this inlet
            });

            inletsTarget.append(inletElm.node());
        },

        'node/add-outlet': function(update) {

            var outlet = update.outlet;

            var outletsTarget = tree.nodes[update.node.id].data().outletsTarget;
            var render = update.render;

            var outletElm;

            if (config.mode == QUARTZ_MODE) {

                outletElm = d3.select(document.createElement('tr')).attr('className', 'rpd-outlet')
                              .call(function(tr) {
                                  tr.append('td').attr('className', 'rpd-connector');
                                  tr.append('td').attr('className', 'rpd-value');
                                  if (config.showTypes) tr.append('td').attr('className', 'rpd-type').text(outlet.type);
                                  tr.append('td').attr('className', 'rpd-name').text(outlet.name);
                              });

            } else if (config.mode == PD_MODE) {

                outletElm = d3.select(document.createElement('td')).attr('className', 'rpd-outlet')
                              .call(function(td) {
                                  td.append('span').attr('className', 'rpd-connector');
                                  td.append('span').attr('className', 'rpd-name').text(outlet.name);
                                  td.append('span').attr('className', 'rpd-value');
                                  if (config.showTypes) td.append('span').attr('className', 'rpd-type').text(outlet.type);
                              });

            }

            outletElm.classed('rpd-'+outlet.type.replace('/','-'), true);
            outletElm.classed('rpd-stale', true);

            tree.outlets[outlet.id] = outletElm.data({
                links: null // links associated with this outlet
            });

            outletsTarget.append(outletElm.node());
        }

    }

} // function(target, config)

} // function(patch)

// =============================================================================
// ============================ Navigation =====================================
// =============================================================================

function Navigation() {
    this.current = null;

    var me = this;

    Kefir.fromEvents(window, 'hashchange')
         .map(function() { return (window.location.hash ? window.location.hash.slice(1) : null); })
         .filter(function(newHash) { return !(me.currentPatch && (newHash === me.currentPatch.id)); })
         .map(function(newHash) { return tree.patches[newHash].data(); })
         .filter(function(targetPatch) { return targetPatch != null; })
         .onValue(function(targetPatch) {
             if (me.currentPatch) me.currentPatch.exit(); // TODO: pass this value through a stream
             targetPatch.enter();
         });
}
Navigation.prototype.switch = function(targetPatch) {
    if (!targetPatch) return;
    this.currentPatch = targetPatch;
    window.location.hash = targetPatch.id;
}

// =============================================================================
// ============================== Layout =======================================
// =============================================================================

function GridLayout() {
    this.nodeRects = [];
}
GridLayout.DEFAULT_WIDTH = 1, // in boxes
GridLayout.DEFAULT_HEIGHT = 1, // in boxes
GridLayout.DEFAULT_X_MARGIN = 0.5,  // in boxes
GridLayout.DEFAULT_Y_MARGIN = 1, // in boxes
GridLayout.DEFAULT_LIMITS = [ 1000, 1000 ]; // in pixels
GridLayout.prototype.nextRect = function(node, boxSize, limits) {
    limits = limits || GridLayout.DEFAULT_LIMITS;
    var nodeRects = this.nodeRects;
    var width =  (node.def.width  || GridLayout.DEFAULT_WIDTH)  * boxSize.width,
        height = (node.def.height || GridLayout.DEFAULT_HEIGHT) * boxSize.height;
    var lastRect = (nodeRects.length ? nodeRects[nodeRects.length-1] : null);
    var newRect = { x: lastRect ? lastRect.x : 0,
                    y: lastRect ? (lastRect.y + lastRect.height +
                                  (GridLayout.DEFAULT_Y_MARGIN * boxSize.height)) : 0,
                    width: width,
                    height: height };
    if ((newRect.y + boxSize.height) > limits.height) {
        newRect.x = newRect.x + width + (GridLayout.DEFAULT_X_MARGIN * boxSize.width);
        newRect.y = 0;
    }
    nodeRects.push(newRect);
    return newRect;
}

// =============================================================================
// ================================ Links ======================================
// =============================================================================

function Links() {

}
Links.prototype.updateAll = function() {

}

// =============================================================================
// ============================= Connectivity ==================================
// =============================================================================

// FRP-based connection (links b/w outlets and inlets) editor logic

var Connectivity = (function() {

    function getLink(inlet) {
        return tree.inlets[inlet.id].data().link;
    }
    function hasLink(inlet) {
        return function() {
            return getLink(inlet);
        };
    };
    function getConnector(outlet) {
        return tree.outlets[outlet.id].data().connector;
    }

    function Connectivity(root) {
        this.root = root.node();

        this.rootClicks = Kefir.fromEvents(this.root, 'click');
        this.inletClicks = Kefir.pool(),
        this.outletClicks = Kefir.pool();

        this.startLink = Kefir.emitter(),
        this.finishLink = Kefir.emitter(),
        this.doingLink = Kefir.merge([ this.startLink.map(ƒ(true)),
                                       this.finishLink.map(ƒ(false)) ]).toProperty(ƒ(false));
    }
    Connectivity.prototype.subscribeOutlet = function(outlet, connector) {

        var rootClicks = this.rootClicks, outletClicks = this.outletClicks, inletClicks = this.inletClicks;
        var startLink = this.startLink, finishLink = this.finishLink, doingLink = this.doingLink;

        // - Every time user clicks an outlet, a new link is created which user can drag, then:
        // - If user clicks other outlet after that, linking process is cancelled;
        // - If user clicks root element (like document.body), linking process is cancelled;
        // - If user clicks an inlet, linking process is considered successful and finished, but also...
        // - If this inlet had a link there connected, this previous link is removed and disconnected;

        outletClicks.plug(Kefir.fromEvents(connector, 'click')
                               .map(extractPos)
                               .map(addTarget(outlet)));

        Kefir.fromEvents(connector, 'click').tap(stopPropagation)
                                           .filterBy(outletClicks.awaiting(doingLink))
                                           .map(extractPos)
                                           .onValue(function(pos) {
            startLink.emit();
            var pivot = getPos(connector);
            var ghost = constructLink(pivot.x, pivot.y, pos.x, pos.y,
                                      config.linkWidth);
            root.appendChild(ghost);
            return Kefir.fromEvents(root, 'mousemove')
                        .takeUntilBy(Kefir.merge([ inletClicks,
                                                   outletClicks.mapTo(false),
                                                   rootClicks.mapTo(false) ])
                                          .take(1)
                                          .onValue(function(success) {
                                              if (!success) return;
                                              var inlet = success.target,
                                                  prevLink = getLink(inlet);
                                              if (prevLink) {
                                                  var otherOutlet = prevLink.outlet;
                                                  otherOutlet.disconnect(prevLink);
                                              }
                                              outlet.connect(inlet);
                                          }))
                        .map(extractPos)
                        .onValue(function(pos) {
                            rotateLink(ghost, pivot.x, pivot.y, pos.x, pos.y);
                        }).onEnd(function() {
                            root.removeChild(ghost);
                            finishLink.emit();
                        });
        });

    };
    Connectivity.prototype.subscribeInlet = function(inlet, connector) {

        var rootClicks = this.rootClicks, outletClicks = this.outletClicks, inletClicks = this.inletClicks;
        var startLink = this.startLink, finishLink = this.finishLink, doingLink = this.doingLink;

        // - Every time user clicks an inlet which has a link there connected:
        // - This link becomes editable and so can be dragged by user,
        // - If user clicks outlet after that, linking process is cancelled and this link is removed;
        // - If user clicks root element (like document.body) after that, linking process is cancelled,
        //   and this link is removed;
        // - If user clicks other inlet, the link user drags/edits now is moved to be connected
        //   to this other inlet, instead of first-clicked one;

        inletClicks.plug(Kefir.fromEvents(connector, 'click')
                              .map(extractPos)
                              .map(addTarget(inlet)));

        Kefir.fromEvents(connector, 'click').tap(stopPropagation)
                                           .filterBy(inletClicks.awaiting(doingLink))
                                           .filter(hasLink(inlet))
                                           .onValue(function(pos) {
            var prevLink = getLink(inlet);
            var outlet = prevLink.outlet;
            outlet.disconnect(prevLink);
            startLink.emit();
            var pivot = getPos(getConnector(outlet));
            var ghost = constructLink(pivot.x, pivot.y, pos.x, pos.y,
                                      config.linkWidth);
            root.appendChild(ghost);
            return Kefir.fromEvents(root, 'mousemove')
                        .takeUntilBy(Kefir.merge([ inletClicks,
                                                   outletClicks.mapTo(false),
                                                   rootClicks.mapTo(false) ])
                                          .take(1)
                                          .onValue(function(success) {
                                              if (!success) return;
                                              var otherInlet = success.target,
                                                  prevLink = getLink(otherInlet);
                                              if (prevLink) {
                                                  var otherOutlet = prevLink.outlet;
                                                  otherOutlet.disconnect(prevLink);
                                              }
                                              outlet.connect(otherInlet);
                                          }))
                        .map(extractPos)
                        .onValue(function(pos) {
                            rotateLink(ghost, pivot.x, pivot.y, pos.x, pos.y);
                        }).onEnd(function() {
                            root.removeChild(ghost);
                            finishLink.emit();
                        });
        });

    };

    return Connectivity;

})();

// =============================================================================
// ============================== NodeMenu =====================================
// =============================================================================


// =============================================================================
// ============================== NodeList =====================================
// =============================================================================

function buildNodeList(root, nodeTypes, nodeDescriptions) {

    var toolkits = {};

    var toolkitElements = {},
        nodeTitleElements = {},
        nodeDescriptionElements = {};

    for (var nodeType in nodeTypes) {
        var typeId = nodeType.split('/');
        var toolkit = typeId[0]; var typeName = typeId[1];
        if (!toolkits[toolkit]) toolkits[toolkit] = {};
        toolkits[toolkit][typeName] = nodeTypes[nodeType];
    }

    var listRoot = d3.select(document.createElement('dl')).attr('className', 'rpd-nodelist');

    var toolkitNodeTypes, typeDef;
    for (var toolkit in toolkits) { // TODO: use d3.enter() here

        var titleElm = listRoot.append('dd').attr('className', 'rpd-toolkit-name').text(toolkit);

        listRoot.append('dt')
                .append('dl').attr('className', 'rpd-toolkit').data({ titleElm: titleElm,
                                                                      nodeTypes: toolkits[toolkit],
                                                                      toolkit: toolkit })
                .call(function(toolkitList) {
                    // toolkit title element, could expand or collapse the types in this toolkit
                    var titleElm = toolkitList.data().titleElm;
                    addClickSwitch(titleElm.node(),
                                   function() { toolkitList.classed('rpd-collapsed', true) },
                                   function() { toolkitList.classed('rpd-collapsed', false); },
                                   true);
                })
                .call(function(dl) {
                    var toolkit = dl.data().toolkit,
                        toolkitNodeTypes = dl.data().nodeTypes;
                    for (var typeName in toolkitNodeTypes) { // TODO: use d3.enter() here
                        var nodeType = toolkit + '/' + typeName;

                        // node type title
                        var titleElm = dl.append('dd').attr('className', 'rpd-node-title').text(typeName);

                        // add node button
                        titleElm.append('span').attr('className', 'rpd-add-node').text('+ Add').data(nodeType)
                                .call(function(addButton) {
                                    Kefir.fromEvents(addButton.node(), 'click')
                                         .tap(stopPropagation)
                                         .onValue(function() {
                                             currentPatch.addNode(addButton.data());
                                         });
                                });

                        // node type description, could be expanded or collapsed by clicking on node type title
                        dl.append('dd').attr('className', 'rpd-node-description').data({ titleElm: titleElm })
                                       .text(nodeDescriptions[nodeType] || '[No Description]')
                                       .classed('rpd-collapsed', true)
                                       .call(function(descElm) {
                                           addClickSwitch(descElm.data().titleElm.node(),
                                               function() { descElm.classed('rpd-collapsed', true) },
                                               function() { descElm.classed('rpd-collapsed', false); });
                                       });
                    }
                });

    }

    root.append(listRoot.node());

    // the button to collapse this node list
    root.append(d3.select(document.createElement('span'))
                  .attr('className', 'rpd-collapse-nodelist')
                  .text('>>')
                  .call(function(collapseButton) {
                      addClickSwitch(collapseButton.node(),
                                     function() { collapseButton.classed('rpd-collapsed', true).text('<<');
                                                  listRoot.classed('rpd-collapsed', true); },
                                     function() { collapseButton.classed('rpd-collapsed', false).text('>>');
                                                  listRoot.classed('rpd-collapsed', false); },
                                     true);
                  }).node());

}

// =============================================================================
// ============================== ValueEdit ====================================
// =============================================================================


// =============================================================================
// =============================== Updates =====================================
// =============================================================================


// =============================================================================
// ============================== DragNDrop ====================================
// =============================================================================


// =============================================================================
// =============================== helpers =====================================
// =============================================================================

function preventDefault(evt) { evt.preventDefault(); };
function stopPropagation(evt) { evt.stopPropagation(); };
function extractPos(evt) { return { x: evt.clientX,
                                    y: evt.clientY }; };
function getPos(elm) { var bounds = elm.getBoundingClientRect();
                       return { x: bounds.left, y: bounds.top } };
function addTarget(target) {
    return function(pos) {
        return { pos: pos, target: target };
    }
};
function invertValue(prev) { return !prev; };
function addClickSwitch(elm, on_true, on_false, initial) {
    Kefir.fromEvents(elm, 'click')
         .tap(stopPropagation)
         .map(ƒ(initial || false))
         .scan(invertValue)  // will toggle between `true` and `false`
         .onValue(function(val) {
             if (val) { on_true(); }
             else { on_false(); }
         })
}

// =============================================================================
// ============================ registration ===================================
// =============================================================================

Rpd.HtmlRenderer = HtmlRenderer;

Rpd.renderer('html', HtmlRenderer);

})();
