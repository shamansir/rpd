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
    nodeMovingAllowed: true,
    // show the list of nodes
    renderNodeList: true,
    // is node list collapsed by default, if shown
    nodeListCollapsed: true,
    // dimensions of the box used to measure everything
    boxSize: { width: 100, height: 40 },
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
    patchToLinks: {},
    nodeToLinks: {}
};

var navigation = new Navigation();

var currentPatch;

var nodeTypes = Rpd.allNodeTypes,
    nodeDescriptions = Rpd.allNodeDescriptions;

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

function SvgRenderer(patch) {

return function(networkRoot, userConfig) {

    var config = mergeConfig(userConfig, defaultConfig);

    networkRoot = d3.select(networkRoot);

    var svg;

    var connectivity;

    return {

        // the object below reacts on every Patch event and constructs corresponding
        // HTML structures in response, or modifies them;

        'patch/is-ready': function(update) {

            var docElm = d3.select(document.documentElement);

            // build root element as a target for all further patch modifications
            svg = d3.select(_createSvgElement('svg'))
                    .attr('width', 500)
                    .attr('height', docElm.property('clientHeight'))
                    .style('border', '1px solid #000');

            var patchRoot = svg.append('g');/*.attr('class', function() {
                var classes = [ 'rpd-patch' ];
                classes.push('rpd-layout-' + config.mode);
                classes.push('rpd-values-' + (config.valuesOnHover ? 'on-hover' : 'always-shown'));
                if (config.showBoxes) classes.push('rpd-show-boxes');
                return classes.join(' ');
            }).data(update.patch); */

            tree.patches[patch.id] = svg.data(patchRoot);

            // initialize the node layout (helps in determining the position where new node should be placed)
            tree.patchToLayout[patch.id] = new GridLayout();
            tree.patchToLinks[patch.id] = new VLinks();

            // initialize connectivity module, it listens for clicks on outlets and inlets and builds or removes
            // links if they were clicked in the appropriate order
            //connectivity = new Connectivity(patchRoot);

            //if (config.renderNodeList) buildNodeList(root, nodeTypes, nodeDescriptions);

            // resize root element on window resize
            Kefir.fromEvents(window, 'resize')
                 .map(function() { return window.innerHeight ||
                                          document.documentElement.clientHeight ||
                                          document.body.clientHeight; })
                 .onValue(function(value) {
                     svg.attr('height', value);
                 });

        },

        'patch/enter': function(update) {
            currentPatch = update.patch;
            navigation.switch(update.patch);
            networkRoot.append(tree.patches[update.patch.id].node());

            tree.patchToLinks[update.patch.id].updateAll();
        },

        'patch/exit': function(update) {
            currentPatch = null;
            svg.remove();
        },

        /* 'patch/refer': function(update) {
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
        }, */

        'patch/add-node': function(update) {

            var node = update.node;

            var render = update.render;

            var nodeBox = d3.select(_createSvgElement('g'))/*.attr('class', 'rpd-node-box')*/;
            var nodeElm = nodeBox.append('g')/*.attr('class', 'rpd-node')*/;

            var nodeBody = nodeElm.append('rect')/*.attr('class', 'rpd-body')*/
                                  .attr('fill', 'green');

            /* nodeElm.append('g').attr('class', 'rpd-remove-button')
                   .call(function(button) {
                       button.append('rect');
                       button.append('text').text('x');
                   }) */

            /* nodeElm.append('g').attr('class', 'rpd-title')
                   .call(function(title) {
                       title.append('text').attr('class', 'rpd-name').text(node.name);
                       if (config.showType) title.append('text').attr('class', 'rpd-type').text('node-type');
                   }); */

            //nodeElm.append('g').attr('class', 'rpd-inlets');
            //nodeElm.append('g').attr('class', 'rpd-process');
            //nodeElm.append('g').attr('class', 'rpd-outlets');

            if (config.mode === QUARTZ_MODE) {

            } else if (config.mode === PD_MODE) {

            }

            /*nodeElm.classed('rpd-'+node.type.slice(0, node.type.indexOf('/'))+'-toolkit-node', true)
                   .classed('rpd-'+node.type.replace('/','-'), true);

            nodeBox.style('z-index', NODE_LAYER); */

            // store targets information and node root element itself
            tree.nodes[node.id] = nodeBox.data({ inletsTarget:  nodeElm.select('.rpd-inlets'),
                                                 outletsTarget: nodeElm.select('.rpd-outlets'),
                                                 processTarget: nodeElm.select('.rpd-process') });

            // add possiblity to drag nodes
            //if (config.nodeMovingAllowed) addDragNDrop(node, svg, nodeElm.select('.rpd-title'), nodeBox);

            // use custom node body renderer, if defined
            //if (render.first) subscribeUpdates(node, render.first(nodeElm.select('.rpd-process').node()));

            var nodeLinks = new VLinks();
            tree.nodeToLinks[node.id] = nodeLinks;

            // if node body should be re-rendered, update links (since body element bounds could change)
            if (render.always) {
                // this code used getBoundingClientRect to determine if node body width/height
                // values were changed and updates links positions only when they really did,
                // but it appeared to be quite hard to check, i.e. height value, since browsers
                // keep it equal to 0
                node.event['node/process'].throttle(500).onValue(function() {
                    nodeLinks.updateAll();
                });
            }

            // find a rectange to place the new node, and actually place it there
            var layout = tree.patchToLayout[update.patch.id],
                // current patch root should be used as a limit source, even if we add to another patch
                // or else other root may have no dimensions yet
                limitSrc = tree.patches[currentPatch.id],
                nextRect = layout.nextRect(node, config.boxSize, { width: limitSrc.node().offsetWidth,
                                                                   height: limitSrc.node().offsetHeight });
            nodeBody.attr('width',  Math.floor(nextRect.width));
            nodeBody.attr('height', Math.floor(nextRect.height));

            node.move(nextRect.x, nextRect.y);

            // remove node when remove button was clicked
            /* Kefir.fromEvents(nodeElm.select('.rpd-remove-button').node(), 'click')
                 .tap(stopPropagation)
                 .onValue(function() {
                     patch.removeNode(node);
                 }); */

            // append to the the patch root node
            var patchRoot = tree.patches[node.patch.id].data();
            patchRoot.append(nodeBox.node());

        },

        /* 'patch/remove-node': function(update) {
            var node = update.node;

            var nodeBox = tree.nodes[node.id];

            nodeBox.remove();

            tree.nodes[node.id] = null; // no updates will fire from this node,
                                        // so it's just to avoid holding memory for it
            tree.nodeToLinks[node.id] = null;

        },

        'node/move': function(update) {
            var nodeBox = tree.nodes[update.node.id];
            var position = update.position;
            nodeBox.attr('transform', 'translate(' + Math.floor(position[0]) + ',' + Math.floor(position[1]) + ')');
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

            inletElm = d3.select(document.createElement('g')).attr('class', 'rpd-inlet')
                         .call(function(group) {
                             group.append('circle').attr('class', 'rpd-connector');
                             group.append('g').attr('class', 'rpd-value-holder')
                                  .append('text').attr('class', 'rpd-value');
                             group.append('text').attr('class', 'rpd-name').text(inlet.name);
                             if (config.showTypes) group.append('text').attr('class', 'rpd-type').text(inlet.type);
                         });

            if (config.mode == QUARTZ_MODE) {

            } else if (config.mode == PD_MODE) {

            }

            inletElm.classed('rpd-'+inlet.type.replace('/','-'), true);
            inletElm.classed({ 'rpd-stale': true,
                               'rpd-readonly': inlet.readonly,
                               'rpd-cold': inlet.cold
                             });

            var editor = null;
            if (!inlet.readonly && render.edit) {
                editor = new ValueEditor(inlet, render, svg,
                                         inletElm.select('.rpd-value-holder'),
                                         inletElm.select('.rpd-value'));
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

            var outletElm;

            outletElm = d3.select(document.createElement('g')).attr('class', 'rpd-outlet')
                          .call(function(group) {
                              group.append('circle').attr('class', 'rpd-connector');
                              group.append('g').attr('class', 'rpd-value-holder')
                                   .append('text').attr('class', 'rpd-value');
                              group.append('text').attr('class', 'rpd-name').text(outlet.name);
                              if (config.showTypes) group.append('text').attr('class', 'rpd-type').text(outlet.type);
                          });

            if (config.mode == QUARTZ_MODE) {

            } else if (config.mode == PD_MODE) {

            }

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

            if (inletData.editor) inletData.editor.disable();

            var outletConnector = outletData.connector;
            var inletConnector  = inletData.connector;

            // disable value editor when connecting to inlet
            if (inletData.editor) inletData.editor.disable();

            var vlink = new VLink(link);

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

            vlink.appendTo(svg);

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
        } */

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

function VLink(link) { // visual representation of the link
    this.link = link; // may be null, if it's a ghost
    this.elm = null;
}
VLink.prototype.construct = function(x0, y0, x1, y1) {
    if (this.elm) throw new Error('VLink is already constructed');
    var linkElm = d3.select(_createSvgElement('line'))
                    .attr('class', 'rpd-link')
                    .attr('x1', x0).attr('y1', y0)
                    .attr('x2', x1).attr('y2', y1)
                    .style('z-index', LINK_LAYER);
    this.elm = linkElm;
    return this;
}
VLink.prototype.rotate = function(x0, y0, x1, y1) {
    this.elm.attr('x1', x0).attr('y1', y0)
            .attr('x2', x1).attr('y2', y1);
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
    target.append(this.elm.node());
    return this;
}
VLink.prototype.removeFrom = function(target) {
    this.elm.remove();
    return this;
}
VLink.prototype.listenForClicks = function() {
    var link = this.link; var elm = this.elm;
    addClickSwitch(this.elm.node(),
                   function() { link.enable(); },
                   function() { link.disable(); });
    return this;
}
VLink.prototype.enable = function() { this.elm.classed('rpd-disabled', false); }
VLink.prototype.disable = function() { this.elm.classed('rpd-disabled', true); }

function VLinks() {
    this.vlinks = {}; // VLink instances
}
VLinks.prototype.clear = function() { this.vlinks = {}; }
VLinks.prototype.add = function(vlink) { this.vlinks[vlink.link.id] = vlink; }
VLinks.prototype.remove = function(vlink) {
    this.vlinks[vlink.link.id] = null;
}
VLinks.prototype.each = function(f) {
    var vlinks = this.vlinks;
    for (var id in vlinks) {
        if (vlinks[id]) f(vlinks[id]);
    }
}
VLinks.prototype.updateAll = function() {
    this.each(function(vlink) { vlink.update(); });
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

    function Connectivity(root) {
        this.root = root;

        this.rootClicks = Kefir.fromEvents(this.root.node(), 'click');
        this.inletClicks = Kefir.pool(),
        this.outletClicks = Kefir.pool();

        this.startLink = Kefir.emitter(),
        this.finishLink = Kefir.emitter(),
        this.doingLink = Kefir.merge([ this.startLink.map(ƒ(true)),
                                       this.finishLink.map(ƒ(false)) ]).toProperty(ƒ(false));
    }
    Connectivity.prototype.subscribeOutlet = function(outlet, connector) {

        var root = this.root;
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
             .tap(stopPropagation)
             .filterBy(outletClicks.awaiting(doingLink))
             .map(extractPos)
             .onValue(function(pos) {
                 startLink.emit();
                 var pivot = getPos(connector.node());
                 var ghost = new VLink().construct(pivot.x, pivot.y, pos.x, pos.y)
                                        .appendTo(root);
                 return Kefir.fromEvents(root.node(), 'mousemove')
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

        var root = this.root;
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
             .tap(stopPropagation)
             .filterBy(inletClicks.awaiting(doingLink))
             .filter(hasLink(inlet))
             .onValue(function(pos) {
                 var prevLink = getLink(inlet);
                 var outlet = prevLink.outlet;
                 outlet.disconnect(prevLink);
                 startLink.emit();
                 var pivot = getPos(getConnector(outlet).node());
                 var ghost = new VLink().construct(pivot.x, pivot.y, pos.x, pos.y)
                                        .appendTo(root);
                 return Kefir.fromEvents(root.node(), 'mousemove')
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
                                         .tap(stopPropagation)
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

function ValueEditor(inlet, render, root, valueHolder, valueElm) {
    var editor = d3.select(document.createElement('div')).attr('class', 'rpd-value-editor');
    var valueIn = Kefir.emitter(),
        disableEditor = Kefir.emitter();
    this.disableEditor = disableEditor;
    this.valueElm = valueElm;
    var valueOut = render.edit(editor.node(), inlet, valueIn);
    valueOut.onValue(function(value) { inlet.receive(value); });
    Kefir.sampledBy([ inlet.event['inlet/update'] ],
                    [ Kefir.merge([
                                Kefir.fromEvents(valueHolder.node(), 'click')
                                     .tap(stopPropagation)
                                     .map(ƒ(true)),
                                Kefir.fromEvents(root.node(), 'click')
                                     .merge(disableEditor)
                                     .map(ƒ(false)) ])
                           .toProperty(ƒ(false))
                           .skipDuplicates() ])
         .map(function(val) { return { lastValue: val[0],
                                       startEditing: val[1],
                                       cancelEditing: !val[1] }; })
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
    valueHolder.append(editor.node());
}
ValueEditor.prototype.disable = function() {
    this.valueElm.classed('rpd-edited', false);
    this.disableEditor.emit();
}

var errorEffects = {};
function addValueErrorEffect(key, target, duration) {
    target.classed('rpd-error', true);
    if (errorEffects[key]) clearTimeout(errorEffects[key]);
    errorEffects[key] = setTimeout(function() {
        target.classed('rpd-error', false);
        errorEffects[key] = null;
    }, duration || 1);
}

var updateEffects = {};
function addValueUpdateEffect(key, target, duration) {
    target.classed('rpd-stale', false);
    target.classed('rpd-fresh', true);
    if (updateEffects[key]) clearTimeout(updateEffects[key]);
    updateEffects[key] = setTimeout(function() {
        target.classed('rpd-fresh', false);
        target.classed('rpd-stale', true);
        updateEffects[key] = null;
    }, duration || 1);
}

// =============================================================================
// =============================== Updates =====================================
// =============================================================================

function subscribeUpdates(node, subscriptions) {
    if (!subscriptions) return;
    for (var alias in subscriptions) {
        (function(subscription, alias) {
            node.event['node/add-inlet']
                .filter(function(inlet) { return inlet.alias === alias; })
                .onValue(function(inlet) {
                    if (subscription.default) inlet.receive(subscription.default());
                    if (subscription.valueOut) {
                        subscription.valueOut.onValue(function(value) {
                            inlet.receive(value);
                        });
                    }
            });
        })(subscriptions[alias], alias);
    }
}


// =============================================================================
// ============================== DragNDrop ====================================
// =============================================================================

function addDragNDrop(node, root, handle, box) {
    function eachLink(node, f) {
        tree.nodeToLinks[node.id].each(f);
    }

    var nodeData = tree.nodes[node.id];
    handle.classed('rpd-drag-handle', true);
    var nodeLinks;
    Kefir.fromEvents(handle.node(), 'mousedown').map(extractPos)
                                                .flatMap(function(pos) {
        box.classed('rpd-dragging', true);
        var initPos = getPos(box.node()),
            diffPos = { x: pos.x - initPos.x,
                        y: pos.y - initPos.y };
        nodeLinks = null;
        box.style('z-index', NODEDRAG_LAYER);
        var moveStream = Kefir.fromEvents(root.node(), 'mousemove')
                              .tap(stopPropagation)
                              .takeUntilBy(Kefir.fromEvents(root.node(), 'mouseup'))
                              .map(extractPos)
                              .map(function(absPos) {
                                  return { x: absPos.x - diffPos.x,
                                           y: absPos.y - diffPos.y };
                              })
                              .onEnd(function() {
                                  box.classed('rpd-dragging', false);
                                  box.style('z-index', NODE_LAYER);
                                  eachLink(node, function(vlink) {
                                      vlink.elm.style('z-index', LINK_LAYER);
                                  });
                              });
        moveStream.last().onValue(function(pos) { node.move(pos.x, pos.y); });
        return moveStream;
    }).onValue(function(pos) {
        box.style('left', pos.x + 'px');
        box.style('top',  pos.y + 'px');
        eachLink(node, function(vlink) {
            vlink.elm.style('z-index', LINKDRAG_LAYER);
            vlink.update();
        });
    });
}

// =============================================================================
// =============================== helpers =====================================
// =============================================================================

function mergeConfig(user_conf, defaults) {
    if (user_conf) {
        var merged = {};
        for (var prop in defaults)  { merged[prop] = defaults[prop]; }
        for (var prop in user_conf) { merged[prop] = user_conf[prop]; }
        return merged;
    } else return defaults;
}

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

Rpd.SvgRenderer = SvgRenderer;

Rpd.renderer('svg', SvgRenderer);

})();
