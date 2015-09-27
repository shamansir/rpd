(function() {

var ƒ = Rpd.unit;

var defaultConfig = {
    style: 'quartz',
    // show inlet/outlet value only when user hovers over its connector
    // (always showing, by default)
    valuesOnHover: false,
    // show inlets/outlets and node types for debugging purposes
    showTypes: false,
    // show node containers for debugging purposes
    showBoxes: false,
    // are nodes allowed to be dragged
    nodeMovingAllowed: true,
    // show the list of nodes
    renderNodeList: true,
    // is node list collapsed by default, if shown
    nodeListCollapsed: true,
    // a time for value update or error effects on inlets/outlets
    effectTime: 1000
};

// z-indexes
var NODE_LAYER = 0, // normally, nodes are layed out below everything
    NODEDRAG_LAYER = 1, // dragged nodes should appear above other nodes, but below dragged links
    LINK_LAYER = 2, // normal links are above the normal nodes, but below the dragged nodes
    LINKDRAG_LAYER = 3; // dragged links are above normal nodes and their links, and also above dragged nodes

// either use the full d3.js library or the super-tiny version provided with RPD
var d3 = d3_tiny || d3;

var Render = Rpd.Render; // everything common between renderers

var tree = {
    patches: {},
    nodes: {},
    inlets: {},
    outlets: {},
    links: {},

    patchToPlacing: {},
    patchToLinks: {},
    nodeToLinks: {}
};

var navigation = new Render.Navigation(patchByHash(tree));

var currentPatch;

var nodeTypes = Rpd.allNodeTypes,
    nodeDescriptions = Rpd.allNodeDescriptions;

function HtmlRenderer(patch) {

return function(networkRoot, userConfig) {

    var config = mergeConfig(userConfig, defaultConfig);

    var style = Rpd.getStyle(config.style, 'html')(config);

    networkRoot = d3.select(networkRoot)
                    .classed('rpd-network', true);

    var root;

    var connectivity, dnd;

    return {

        // the object below reacts on every Patch event and constructs corresponding
        // HTML structures in response, or modifies them;

        'patch/is-ready': function(update) {

            var docElm = d3.select(document.documentElement);

            // build root element as a target for all further patch modifications
            root = d3.select(style.createRoot(patch, networkRoot).element)
                     .style('height', docElm.property('clientHeight') + 'px');

            root.classed('rpd-style-' + config.style, true)
                .classed('rpd-values-' + (config.valuesOnHover ? 'on-hover' : 'always-shown'), true)
                .classed('rpd-show-boxes', config.showBoxes);

            tree.patches[patch.id] = root.data({ patch: update.patch });

            // initialize the node placing (helps in determining the position where new node should be located)
            tree.patchToPlacing[patch.id] = new Render.Placing(style);
            tree.patchToLinks[patch.id] = new VLinks();

            // initialize connectivity module, it listens for clicks on outlets and inlets and builds or removes
            // links if they were clicked in the appropriate order
            connectivity = new /*Render.*/Connectivity(root, style);

            // initialized drag-n-drop support (used to allow user drag nodes)
            if (config.nodeMovingAllowed) dnd = new Render.DragAndDrop(root);

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
            var newRoot = tree.patches[update.patch.id];
            networkRoot.append(newRoot.node());

            tree.patchToLinks[update.patch.id].updateAll();
            if (style.onPatchSwitch) style.onPatchSwitch(currentPatch, newRoot.node());
        },

        'patch/exit': function(update) {
            currentPatch = null;
            root.remove();
        },

        'patch/refer': function(update) {
            var node = update.node;

            var nodeBox = tree.nodes[node.id];

            nodeBox.select('.rpd-node').classed('rpd-patch-reference', true);
            nodeBox.data().processTarget.text('[' + (update.target.name || update.target.id) + ']');

            // add the ability to enter the patch by clicking node body (TODO: move to special node type)
            Kefir.fromEvents(nodeBox.data().processTarget.node(), 'click')
                 .onValue((function(current, target) {
                    return function() {
                        current.exit();
                        target.enter();
                    }
                 })(patch, update.target));
        },

        'patch/add-node': function(update) {

            var node = update.node;
            var patch = update.patch;

            var render = update.render;

            var nodeBox = d3.select(document.createElement('div')).attr('class', 'rpd-node-box');
            var styledNode = style.createNode(node, render, nodeDescriptions[node.type]);
            var nodeElm = nodeBox.append(styledNode.element);

            nodeElm.classed('rpd-'+node.type.slice(0, node.type.indexOf('/'))+'-toolkit-node', true)
                   .classed('rpd-'+node.type.replace('/','-'), true);

            nodeBox.style('z-index', NODE_LAYER);

            // store targets information and node root element itself
            tree.nodes[node.id] = nodeBox.data({ inletsTarget:  nodeElm.select('.rpd-inlets-target'),
                                                 outletsTarget: nodeElm.select('.rpd-outlets-target'),
                                                 processTarget: nodeElm.select('.rpd-process-target'),
                                                 pos: { x: 0, y: 0 } });

            var nodeLinks = new VLinks();
            tree.nodeToLinks[node.id] = nodeLinks;

            // add possiblity to drag nodes
            if (config.nodeMovingAllowed) {
                var handle = nodeElm.select('.rpd-drag-handle');
                if (!handle.empty()) {
                    dnd.add(handle,
                        { start: function() {
                            nodeBox.classed('rpd-dragging', true);
                            nodeBox.style('z-index', NODEDRAG_LAYER);
                            return nodeBox.data().pos;
                          },
                          drag: function(pos) {
                              nodeBox.style('left', pos.x + 'px');
                              nodeBox.style('top',  pos.y + 'px');
                              nodeLinks.each(function(vlink) {
                                   vlink.element.style('z-index', LINKDRAG_LAYER);
                                   vlink.update();
                              });
                          },
                          end: function(pos) {
                              node.move(pos.x, pos.y);
                              nodeBox.classed('rpd-dragging', false);
                              nodeBox.style('z-index', NODE_LAYER);
                              nodeLinks.each(function(vlink) {
                                  vlink.element.style('z-index', LINK_LAYER);
                              });
                          }
                      });
                }
            }

            // node could require some preparation using patch root
            if (render.prepare) render.prepare(tree.patches[patch.id].node(),
                                               tree.patches[currentPatch.id].node());

            // use custom node body renderer, if defined
            if (render.first) subscribeUpdates(node, render.first(nodeElm.select('.rpd-process-target').node()));

            // if node body could be re-rendered, update links (since body element bounds could change)
            if (render.always) {
                // this code used getBoundingClientRect to determine if node body width/height
                // values were changed and updates links positions only when they really did,
                // but it appeared to be quite hard to check, i.e. height value, since browsers
                // keep it equal to 0
                node.event['node/process'].throttle(100).onValue(function() {
                    nodeLinks.updateAll();
                });
            }

            var placing = tree.patchToPlacing[update.patch.id],
                // current patch root should be used as a limit source, even if we add to another patch
                // or else other root may have no dimensions yet
                limitSrc = tree.patches[currentPatch.id];

            // find a rectange to place the new node, and actually place it there
            var nodeSize = styledNode.size;
                nodePos = placing.nextPosition(node, nodeSize, { width:  limitSrc.node().offsetWidth,
                                                                 height: limitSrc.node().offsetHeight });

            nodeElm.select('.rpd-body').style('min-width',  Math.floor(nodeSize.width) + 'px');
            nodeElm.select('.rpd-body').style('height', Math.floor(nodeSize.height) + 'px'); // height is min-height for table cells

            node.move(nodePos.x, nodePos.y); // x and y positions will be set in node/move event handler

            // remove node when remove button was clicked
            var removeButton = nodeElm.select('.rpd-remove-button');
            if (!removeButton.empty()) {
                Kefir.fromEvents(removeButton.node(), 'click')
                     .map(stopPropagation)
                     .onValue(function() {
                         patch.removeNode(node);
                     });
            }

            // append to the the patch root node
            tree.patches[patch.id].append(nodeBox.node());

        },

        'patch/remove-node': function(update) {
            var node = update.node;

            var nodeBox = tree.nodes[node.id];

            nodeBox.remove();
            if (style.onNodeRemove) style.onNodeRemove(node);

            tree.nodes[node.id] = null; // no updates will fire from this node,
                                        // so it's just to avoid holding memory for it
            tree.nodeToLinks[node.id] = null;

        },

        'node/move': function(update) {
            var nodeBox = tree.nodes[update.node.id];
            var position = update.position;
            nodeBox.style('left', Math.floor(position[0]) + 'px');
            nodeBox.style('top',  Math.floor(position[1]) + 'px');
            nodeBox.data().pos = { x: position[0], y: position[1] };
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

            var inletElm = d3.select(style.createInlet(inlet, render).element);

            inletElm.classed('rpd-'+inlet.type.replace('/','-'), true);
            inletElm.classed({ 'rpd-stale': true,
                               'rpd-readonly': inlet.readonly,
                               'rpd-cold': inlet.cold
                             });

            var editor = null;
            if (!inlet.readonly && render.edit) {
                editor = new ValueEditor(inlet, render, root,
                                         inletElm.select('.rpd-value-holder'),
                                         inletElm.select('.rpd-value'),
                                         d3.select(document.createElement('div')));
                inletElm.select('.rpd-value-holder').append(editor.editorElm.node());
            }

            tree.inlets[inlet.id] = inletElm.data({
                connector: inletElm.select('.rpd-connector'),
                value: inletElm.select('.rpd-value'),
                vlink: null, // a link associated with this inlet
                editor: editor
            });

            // adds `rpd-error` CSS class and removes it by timeout
            inlet.event['inlet/update'].onError(function() {
                addValueErrorEffect(inlet.id, inletElm, config.effectTime);
            });

            // listen for clicks in connector and allow to edit links this way
            connectivity.subscribeInlet(inlet, inletElm.select('.rpd-connector'));

            inletsTarget.append(inletElm.node());
        },

        'node/add-outlet': function(update) {

            var outlet = update.outlet;

            var outletsTarget = tree.nodes[update.node.id].data().outletsTarget;
            var render = update.render;

            var outletElm = d3.select(style.createOutlet(outlet, render).element);

            outletElm.classed('rpd-'+outlet.type.replace('/','-'), true);
            outletElm.classed('rpd-stale', true);

            tree.outlets[outlet.id] = outletElm.data({
                connector: outletElm.select('.rpd-connector'),
                value: outletElm.select('.rpd-value'),
                vlinks: new VLinks() // links associated with this outlet
            });

            // listen for clicks in connector and allow to edit links this way
            connectivity.subscribeOutlet(outlet, outletElm.select('.rpd-connector'));

            outletsTarget.append(outletElm.node());
        },

        'inlet/update': function(update) {

            var inlet = update.inlet;

            if (inlet.hidden) return;

            var render = update.render;

            var inletElm = tree.inlets[inlet.id];
            var valueElm = inletElm.data().value;

            var valueRepr = inlet.def.show ? inlet.def.show(update.value) : update.value;
            if (render.show) {
                render.show(valueElm.node(), update.value, valueRepr);
            } else {
                valueElm.text(valueRepr);
            }

            // adds `rpd-fresh` CSS class and removes it by timeout
            addValueUpdateEffect(inlet.id, inletElm, config.effectTime);

        },

        'outlet/update': function(update) {

            var outlet = update.outlet;
            var render = update.render;

            var outletElm = tree.outlets[outlet.id];
            var valueElm = outletElm.data().value;

            var valueRepr = outlet.def.show ? outlet.def.show(update.value) : update.value;
            if (render.show) {
                render.show(valueElm.node(), update.value, valueRepr);
            } else {
                valueElm.text(valueRepr);
            }

            // adds `rpd-fresh` CSS class and removes it by timeout
            addValueUpdateEffect(outlet.id, outletElm, config.effectTime);

        },

        'outlet/connect': function(update) {

            var link   = update.link;
            var outlet = link.outlet;
            var inlet  = link.inlet;

            var outletElm = tree.outlets[outlet.id];
            var inletElm  = tree.inlets[inlet.id];

            var outletData = outletElm.data();
            var inletData  = inletElm.data();

            if (inletData.vlink) throw new Error('Inlet is already connected to a link');

            // disable value editor when connecting to inlet
            if (inletData.editor) inletData.editor.disable();

            var outletConnector = outletData.connector;
            var inletConnector  = inletData.connector;

            var vlink = new VLink(link, style);

            // visually link is just a CSS-rotated div with 1px border
            var p0 = getPos(outletConnector.node()),
                p1 = getPos(inletConnector.node());
            vlink.construct(p0.x, p0.y, p1.x, p1.y, config.linkWidth);

            tree.links[link.id] = vlink;
            outletData.vlinks.add(vlink);
            inletData.vlink = vlink;

            tree.nodeToLinks[outlet.node.id].add(vlink);
            tree.nodeToLinks[inlet.node.id].add(vlink);
            tree.patchToLinks[patch.id].add(vlink);

            vlink.listenForClicks();

            vlink.appendTo(root);

        },

        'outlet/disconnect': function(update) {

            var link = update.link;
            var vlink = tree.links[link.id];

            var outlet = link.outlet;
            var inlet  = link.inlet;

            var outletData = tree.outlets[outlet.id].data();
            var inletData  = tree.inlets[inlet.id].data();

            // forget all references
            tree.links[link.id] = null;
            outletData.vlinks.remove(vlink);
            inletData.vlink = null;

            tree.nodeToLinks[outlet.node.id].remove(vlink);
            tree.nodeToLinks[inlet.node.id].remove(vlink);
            tree.patchToLinks[patch.id].remove(vlink);

            // remove link element
            vlink.removeFrom(root);

        },

        'link/enable': function(update) {
            var inlet = update.link.inlet;
            var inletData  = tree.inlets[inlet.id].data();
            if (inletData.editor) inletData.editor.disable();

            tree.links[update.link.id].enable();
        },

        'link/disable': function(update) {
            tree.links[update.link.id].disable();
        }

    }

} // function(target, config)

} // function(patch)

function patchByHash(tree) {
    return function(hash) {
        return tree.patches[hash].data().patch;
    }
}

// =============================================================================
// ============================= Connectivity ==================================
// =============================================================================

// FRP-based connection (links b/w outlets and inlets) editor logic

var Connectivity = (function() {

    function getLink(inlet) {
        var inletData = tree.inlets[inlet.id].data();
        return inletData.vlink ? inletData.vlink.link : null;
    }
    function hasLink(inlet) {
        return function() {
            return getLink(inlet);
        };
    };
    function getConnector(outlet) {
        return tree.outlets[outlet.id].data().connector;
    }

    function Connectivity(root, style) {
        this.root = root;
        this.style = style;

        this.rootClicks = Kefir.fromEvents(this.root.node(), 'click');
        this.inletClicks = Kefir.pool(),
        this.outletClicks = Kefir.pool();

        this.startLink = Kefir.emitter(),
        this.finishLink = Kefir.emitter(),
        this.doingLink = Kefir.merge([ this.startLink.map(ƒ(true)),
                                       this.finishLink.map(ƒ(false)) ]).toProperty(ƒ(false));
    }
    Connectivity.prototype.subscribeOutlet = function(outlet, connector) {

        var root = this.root; var style = this.style;
        var rootClicks = this.rootClicks, outletClicks = this.outletClicks, inletClicks = this.inletClicks;
        var startLink = this.startLink, finishLink = this.finishLink, doingLink = this.doingLink;

        // - Every time user clicks an outlet, a new link is created which user can drag, then:
        // - If user clicks other outlet after that, linking process is cancelled;
        // - If user clicks root element (like document.body), linking process is cancelled;
        // - If user clicks an inlet, linking process is considered successful and finished, but also...
        // - If this inlet had a link there connected, this previous link is removed and disconnected;

        outletClicks.plug(Kefir.fromEvents(connector.node(), 'click')
                               .map(extractPos)
                               .map(addTarget(outlet)));

        Kefir.fromEvents(connector.node(), 'click')
             .map(stopPropagation)
             .filterBy(outletClicks.awaiting(doingLink))
             .map(extractPos)
             .onValue(function(pos) {
                 startLink.emit();
                 var pivot = getPos(connector.node());
                 var ghost = new VLink(null, style).construct(pivot.x, pivot.y, pos.x, pos.y)
                                                   .noPointerEvents().appendTo(root);
                 Kefir.fromEvents(root.node(), 'mousemove')
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
                          ghost.rotate(pivot.x, pivot.y, pos.x, pos.y);
                      }).onEnd(function() {
                          ghost.removeFrom(root);
                          finishLink.emit();
                      });
             });

    };
    Connectivity.prototype.subscribeInlet = function(inlet, connector) {

        var root = this.root; var style = this.style;
        var rootClicks = this.rootClicks, outletClicks = this.outletClicks, inletClicks = this.inletClicks;
        var startLink = this.startLink, finishLink = this.finishLink, doingLink = this.doingLink;

        // - Every time user clicks an inlet which has a link there connected:
        // - This link becomes editable and so can be dragged by user,
        // - If user clicks outlet after that, linking process is cancelled and this link is removed;
        // - If user clicks root element (like document.body) after that, linking process is cancelled,
        //   and this link is removed;
        // - If user clicks other inlet, the link user drags/edits now is moved to be connected
        //   to this other inlet, instead of first-clicked one;

        inletClicks.plug(Kefir.fromEvents(connector.node(), 'click')
                              .map(extractPos)
                              .map(addTarget(inlet)));

        Kefir.fromEvents(connector.node(), 'click')
             .map(stopPropagation)
             .filterBy(inletClicks.awaiting(doingLink))
             .filter(hasLink(inlet))
             .onValue(function(pos) {
                 var prevLink = getLink(inlet);
                 var outlet = prevLink.outlet;
                 outlet.disconnect(prevLink);
                 startLink.emit();
                 var pivot = getPos(getConnector(outlet).node());
                 var ghost = new VLink(null, style).construct(pivot.x, pivot.y, pos.x, pos.y)
                                                   .noPointerEvents().appendTo(root);
                 Kefir.fromEvents(root.node(), 'mousemove')
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
                          ghost.rotate(pivot.x, pivot.y, pos.x, pos.y);
                      }).onEnd(function() {
                          ghost.removeFrom(root);
                          finishLink.emit();
                      });
             });

    };

    return Connectivity;

})();

// =============================================================================
// ================================ Links ======================================
// =============================================================================

function VLink(link, style) { // visual representation of the link
    this.link = link; // may be null, if it's a ghost
    this.style = style;
    this.styledLink = null;
    this.element = null;
}
VLink.prototype.construct = function(x0, y0, x1, y1) {
    if (this.styledLink) throw new Error('VLink is already constructed');
    var styledLink = this.style.createLink(this.link);
    styledLink.rotate(x0, y0, x1, y1);
    this.styledLink = styledLink;
    this.element = d3.select(styledLink.element);
    this.element.style('z-index', LINK_LAYER);
    return this;
}
VLink.prototype.rotate = function(x0, y0, x1, y1) {
    this.styledLink.rotate(x0, y0, x1, y1);
    return this;
}
VLink.prototype.update = function() {
    if (!this.link) return;
    var link = this.link;
    var inletConnector = tree.inlets[link.inlet.id].data().connector,
        outletConnector = tree.outlets[link.outlet.id].data().connector;
    var inletPos = getPos(inletConnector.node()),
        outletPos = getPos(outletConnector.node());
    this.rotate(outletPos.x, outletPos.y, inletPos.x, inletPos.y);
    return this;
}
VLink.prototype.appendTo = function(target) {
    target.append(this.element.node());
    return this;
}
VLink.prototype.removeFrom = function(target) {
    this.element.remove();
    return this;
}
VLink.prototype.noPointerEvents = function() {
    // a stub to be compatible with SVG renderer implementation
    return this;
}
VLink.prototype.listenForClicks = function() {
    var link = this.link;
    addClickSwitch(this.element.node(),
                   function() { link.enable(); },
                   function() { link.disable(); });
    return this;
}
VLink.prototype.enable = function() {
    this.element.classed('rpd-disabled', false);
}
VLink.prototype.disable = function() {
    this.element.classed('rpd-disabled', true);
}

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

    var listRoot = d3.select(document.createElement('dl')).attr('class', 'rpd-nodelist');

    var toolkitNodeTypes, typeDef;

    for (var toolkit in toolkits) { // TODO: use d3.enter() here

        var titleElm = listRoot.append('dd').attr('class', 'rpd-toolkit-name').text(toolkit);

        listRoot.append('dt')
                .append('dl').attr('class', 'rpd-toolkit').data({ titleElm: titleElm,
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
                        var titleElm = dl.append('dd').attr('class', 'rpd-node-title').text(typeName);

                        // add node button
                        titleElm.append('span').attr('class', 'rpd-add-node').text('+ Add').data(nodeType)
                                .call(function(addButton) {
                                    Kefir.fromEvents(addButton.node(), 'click')
                                         .map(stopPropagation)
                                         .onValue(function() {
                                             currentPatch.addNode(addButton.data());
                                         });
                                });

                        // node type description, could be expanded or collapsed by clicking on node type title
                        dl.append('dd').attr('class', 'rpd-node-description').data({ titleElm: titleElm })
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
                  .attr('class', 'rpd-collapse-nodelist')
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
// =============================== Values ======================================
// =============================================================================

function ValueEditor(inlet, render, root, valueHolder, valueElm, editorElm) {
    var valueIn = Kefir.emitter(),
        disableEditor = Kefir.emitter();
    this.disableEditor = disableEditor;
    this.editorElm = editorElm;
    this.valueElm = valueElm;
    editorElm.classed('rpd-value-editor', true);
    var valueOut = render.edit(editorElm.node(), inlet, valueIn);
    valueOut.onValue(function(value) { inlet.receive(value); });
    Kefir.combine([ Kefir.merge([
                              Kefir.fromEvents(valueHolder.node(), 'click')
                                   .map(stopPropagation)
                                   .map(ƒ(true)),
                              Kefir.fromEvents(root.node(), 'click')
                                   .merge(disableEditor)
                                   .map(ƒ(false)) ])
                         .toProperty(ƒ(false))
                         .skipDuplicates() ],
                  [ inlet.event['inlet/update'] ])
         .map(function(val) { return { lastValue: val[1],
                                       startEditing: val[0],
                                       cancelEditing: !val[0] }; })
         .onValue(function(conf) {
            if (conf.startEditing) {
                var inletData = tree.inlets[inlet.id].data();
                if (inletData.link) inletData.link.disable();
                valueIn.emit(conf.lastValue);
                valueHolder.classed('rpd-editor-enabled', true);
            } else if (conf.cancelEditing) {
                valueElm.classed('rpd-edited', true);
                valueHolder.classed('rpd-editor-enabled', false);
            }
         });
    valueHolder.classed('rpd-editor-disabled', true);
}
ValueEditor.prototype.disable = function() {
    this.valueElm.classed('rpd-edited', false);
    this.disableEditor.emit();
}

// =============================================================================
// =============================== helpers =====================================
// =============================================================================

var VLinks = Render.VLinks;

var mergeConfig = Render.mergeConfig;

var preventDefault = Render.preventDefault,
    stopPropagation = Render.stopPropagation;

var extractPos = Render.extractPos,
    getPos = Render.getPos;

var addTarget = Render.addTarget,
    addClickSwitch = Render.addClickSwitch;

var addValueErrorEffect = Render.addValueErrorEffect,
    addValueUpdateEffect = Render.addValueUpdateEffect;

var subscribeUpdates = Render.subscribeUpdates;

// =============================================================================
// ============================ registration ===================================
// =============================================================================

Rpd.HtmlRenderer = HtmlRenderer;

Rpd.renderer('html', HtmlRenderer);

})();
