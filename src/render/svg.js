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

    networkRoot = d3.select(networkRoot).attr('class', 'rpd-network');

    var svg;

    var connectivity, dnd;

    return {

        // the object below reacts on every Patch event and constructs corresponding
        // HTML structures in response, or modifies them;

        'patch/is-ready': function(update) {

            var docElm = d3.select(document.documentElement);

            // build root element as a target for all further patch modifications
            svg = d3.select(_createSvgElement('svg'))
                    .attr('width', docElm.property('clientWidth'))
                    .attr('height', docElm.property('clientHeight'));

            svg.append('rect').attr('class', 'rpd-background')
               .attr('width', docElm.property('clientWidth'))
               .attr('height', docElm.property('clientHeight'));

            var patchRoot = svg.append('g').attr('class', function() {
                var classes = [ 'rpd-patch' ];
                classes.push('rpd-layout-' + config.mode);
                classes.push('rpd-values-' + (config.valuesOnHover ? 'on-hover' : 'always-shown'));
                if (config.showBoxes) classes.push('rpd-show-boxes');
                return classes.join(' ');
            }).data(update.patch);

            tree.patches[patch.id] = svg.data({ root: patchRoot,
                                                width: docElm.property('clientWidth'),
                                                height: docElm.property('clientHeight'),
                                                patch: update.patch
                                              });

            // initialize the node layout (helps in determining the position where new node should be placed)
            tree.patchToLayout[patch.id] = new GridLayout(config.mode);
            tree.patchToLinks[patch.id] = new VLinks();

            // initialize connectivity module, it listens for clicks on outlets and inlets and builds or removes
            // links if they were clicked in the appropriate order
            connectivity = new Connectivity(svg);

            // initialized drag-n-drop support (used to allow user drag nodes)
            if (config.nodeMovingAllowed) dnd = new DragAndDrop(svg);

            //if (config.renderNodeList) buildNodeList(root, nodeTypes, nodeDescriptions);

            // resize root element on window resize
            Kefir.fromEvents(window, 'resize')
                 .map(function() { return window.innerHeight ||
                                          document.documentElement.clientHeight ||
                                          document.body.clientHeight; })
                 .onValue(function(value) {
                     svg.attr('height', value);
                     svg.data().height = value;
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

        'patch/refer': function(update) {
            var node = update.node;

            var nodeBox = tree.nodes[node.id];

            nodeBox.select('.rpd-node').classed('rpd-patch-reference', true);
            nodeBox.data().processTarget.append(_createSvgElement('text'))
                                                .text('[' + (update.target.name || update.target.id) + ']');

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

            var render = update.render;

            // find a rectange to place the new node
            var layout = tree.patchToLayout[update.patch.id],
                // current patch root should be used as a limit source, even if we add to another patch
                // or else other root may have no dimensions yet
                limitSrc = tree.patches[currentPatch.id].data();

            var socketPadding = 25, // distance between inlets/outlets in SVG units
                socketsMargin = 15; // distance between first/last inlet/outlet and body edge
            var headerHeight = 21, // height of a node header in SVG units, for Quartz mode
                headerWidth = 50; // width of a node header in SVG units, for PD mode

            var findBestNodeSize = (config.mode === QUARTZ_MODE)
                ? function(numInlets, numOutlets, minContentSize) {
                      var requiredContentHeight = (2 * socketsMargin) + ((Math.max(numInlets, numOutlets) - 1) * socketPadding);
                      return { width: minContentSize.width,
                               height: headerHeight + Math.max(requiredContentHeight, minContentSize.height) };
                  }
                : function(numInlets, numOutlets, minContentSize) {
                      var requiredContentWidth = (2 * socketsMargin) + ((Math.max(numInlets, numOutlets) - 1) * socketPadding);
                      return { width: headerWidth + Math.max(requiredContentWidth, minContentSize.width),
                               height: minContentSize.height };
                  };
            var minContentSize = render.size ? { width: render.size.width || 100,
                                                 height: render.size.height || 40 }
                                             : { width: 100, height: 40 };

            var initialSize = findBestNodeSize(node.def.inlets  ? Object.keys(node.def.inlets).length  : 0,
                                               node.def.outlets ? Object.keys(node.def.outlets).length : 0,
                                               minContentSize);

            var nodePos = layout.nextPosition(node, initialSize, { width: limitSrc.width, height: limitSrc.height });

            var nodeBox = d3.select(_createSvgElement('g')).attr('class', 'rpd-node-box');
            var nodeElm = nodeBox.append('g').attr('class', 'rpd-node');

            var width = initialSize.width, height = initialSize.height, bodyHeight = height - headerHeight;

            nodeElm.append('rect').attr('class', 'rpd-shadow').attr('width', width).attr('height', height).attr('x', 5).attr('y', 6)
                                                                                                          .attr('rx', 3).attr('ry', 3);
            nodeElm.append('path').attr('class', 'rpd-header').attr('d', roundedRect(0, 0, width, headerHeight, 2, 2, 0, 0));
            nodeElm.append('text').attr('class', 'rpd-name').text(node.name)
                                  .attr('x', 5).attr('y', 6).style('pointer-events', 'none');
            nodeElm.append('path').attr('class', 'rpd-content').attr('d', roundedRect(0, headerHeight, width, bodyHeight, 0, 0, 2, 2));
            nodeElm.append('rect').attr('class', 'rpd-body').attr('width', width).attr('height', height).attr('rx', 2).attr('ry', 2)
                                  .style('pointer-events', 'none');

            nodeElm.select('.rpd-header').append(_createSvgElement('title')).text(
                                                 nodeDescriptions[node.type] ? (nodeDescriptions[node.type] + ' (' + node.type + ')')
                                                                             : node.type);

            nodeElm.append('g').attr('class', 'rpd-remove-button')
                               .attr('transform', 'translate(' + (width-12) + ',1)')
                   .call(function(button) {
                       button.append('path').attr('d', roundedRect(0, 0, 11, 11, 2, 2, 2, 3));
                       button.append('text').text('x').attr('x', 3).attr('y', 2).style('pointer-events', 'none');
                   });

            nodeElm.append('g').attr('class', 'rpd-inlets').attr('transform', 'translate(' + 0 + ',' + headerHeight + ')')
                                                           .data({ position: { x: 0, y: headerHeight } });
            nodeElm.append('g').attr('class', 'rpd-process').attr('transform', 'translate(' + 25 + ',' + (headerHeight + (initialSize.height / 2)) + ')')
                                                            .data({ position: { x: 0, y: headerHeight } });
            nodeElm.append('g').attr('class', 'rpd-outlets').attr('transform', 'translate(' + width + ',' + headerHeight + ')')
                                                            .data({ position: { x: width, y: headerHeight } });

            if (config.mode === QUARTZ_MODE) {

            } else if (config.mode === PD_MODE) {

            }

            nodeElm.classed('rpd-'+node.type.slice(0, node.type.indexOf('/'))+'-toolkit-node', true)
                   .classed('rpd-'+node.type.replace('/','-'), true);

            var numInlets = 0, numOutlets = 0;
            var inletElms = [], outletElms = [];

            function checkNodeSize() {
                var nodeData = nodeBox.data(), curSize = nodeData.size;
                var nodeSize = findBestNodeSize(numInlets, numOutlets, minContentSize);
                if ((nodeSize.width === curSize.width) && (nodeSize.height === curSize.height)) return;
                nodeElm.select('rect.rpd-shadow').attr('height', nodeSize.height);
                nodeElm.select('rect.rpd-body').attr('height', nodeSize.height);
                nodeElm.select('path.rpd-content').attr('d', roundedRect(0, headerHeight,
                    nodeSize.width, nodeSize.height - headerHeight, 0, 0, 2, 2));
                nodeElm.select('g.rpd-process').attr('transform',
                    'translate(' + 25 + ',' + (headerHeight + ((nodeSize.height - headerHeight) / 2)) + ')');
                nodeData.size = nodeSize;
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

            // store targets information and node root element itself
            tree.nodes[node.id] = nodeBox.data({ inletsTarget:  nodeElm.select('.rpd-inlets'),
                                                 outletsTarget: nodeElm.select('.rpd-outlets'),
                                                 processTarget: nodeElm.select('.rpd-process'),
                                                 position: nodePos, size: initialSize,
                                                 notifyNewInlet: notifyNewInlet, notifyNewOutlet: notifyNewOutlet });

            node.move(nodePos.x, nodePos.y);

            var nodeLinks = new VLinks();
            tree.nodeToLinks[node.id] = nodeLinks;

            // add possiblity to drag nodes
            if (config.nodeMovingAllowed) {
                dnd.add(nodeElm.select('.rpd-header').classed('rpd-drag-handle', true),
                        { start: function() {
                            nodeElm.classed('rpd-dragging', true);
                            nodeElm.select('.rpd-shadow').attr('x', 7).attr('y', 8);
                            return nodeBox.data().position;
                          },
                          drag: function(pos) {
                              nodeBox.attr('transform', 'translate(' + pos.x + ',' + pos.y + ')');
                              nodeLinks.each(function(vlink) { vlink.update(); });
                          },
                          end: function(pos) {
                              node.move(pos.x, pos.y);
                              nodeElm.select('.rpd-shadow').attr('x', 5).attr('y', 6);
                              nodeElm.classed('rpd-dragging', false);
                          }
                      });
            }

            // use custom node body renderer, if defined
            if (render.first) subscribeUpdates(node, render.first(nodeElm.select('.rpd-process').node()));

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

            // remove node when remove button was clicked
            Kefir.fromEvents(nodeElm.select('.rpd-remove-button path').node(), 'click')
                 .tap(stopPropagation)
                 .onValue(function() {
                     patch.removeNode(node);
                 });

            // append to the the patch root node
            var patchRoot = tree.patches[node.patch.id].data().root;
            patchRoot.append(nodeBox.node());

        },

        'patch/remove-node': function(update) {
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
            nodeBox.data().position = { x: position[0], y: position[1] };
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

            var nodeData = tree.nodes[update.node.id].data();

            var inletsTarget = nodeData.inletsTarget;
            var render = update.render;

            var inletElm;

            inletElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-inlet')
                         .call(function(group) {
                             //group.attr('transform', 'translate(' + inletPos.x + ',' + inletPos.y + ')')
                             group.append('circle').attr('class', 'rpd-connector')
                                                   .attr('cx', 0).attr('cy', 0).attr('r', 2.5);
                             group.append('g').attr('class', 'rpd-value-holder')
                                  .append('text').attr('class', 'rpd-value')
                                                 .attr('x', -15).attr('y', 0);
                             group.append('text').attr('class', 'rpd-name').text(inlet.name)
                                                 .attr('x', 10).attr('y', 0);
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
                                         inletElm.select('.rpd-value'),
                                         d3.select(_createSvgElement('g')));
                inletElm.select('.rpd-value-holder').append(editor.editorElm.node());
            }

            tree.inlets[inlet.id] = inletElm.data({
                connector: inletElm.select('.rpd-connector'),
                value: inletElm.select('.rpd-value'),
                vlink: null, // a link associated with this inlet
                editor: editor,
                //position: inletPos
            });

            nodeData.notifyNewInlet(inletElm);

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

            var nodeData = tree.nodes[update.node.id].data();

            var outletsTarget = nodeData.outletsTarget;
            var render = update.render;

            var outletElm;

            outletElm = d3.select(_createSvgElement('g')).attr('class', 'rpd-outlet')
                          .call(function(group) {
                              //group.attr('transform', 'translate(' + outletPos.x + ',' + outletPos.y + ')')
                              group.append('circle').attr('class', 'rpd-connector')
                                                    .attr('cx', 0).attr('cy', 0).attr('r', 2.5);
                              group.append('g').attr('class', 'rpd-value-holder')
                                   .append('text').attr('class', 'rpd-value')
                                                  .attr('x', 10).attr('y', 0);
                              group.append('text').attr('class', 'rpd-name').text(outlet.name)
                                                  .attr('x', -10).attr('y', 0);
                          });

            if (config.mode == QUARTZ_MODE) {

            } else if (config.mode == PD_MODE) {

            }

            outletElm.classed('rpd-'+outlet.type.replace('/','-'), true);
            outletElm.classed('rpd-stale', true);

            tree.outlets[outlet.id] = outletElm.data({
                connector: outletElm.select('.rpd-connector'),
                value: outletElm.select('.rpd-value'),
                vlinks: new VLinks(), // links associated with this outlet
                //position: outletPos
            });

            nodeData.notifyNewOutlet(outletElm);

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

            var vlink = new VLink(link);

            var p0 = incrementPos(getPos(outletConnector.node()), 3),
                p1 = incrementPos(getPos(inletConnector.node()),  3);
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
         .map(function(newHash) { return tree.patches[newHash].data().patch; })
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

function GridLayout(mode) {
    this.nodeRects = [];
    this.boxPadding = (mode === QUARTZ_MODE) ? { horizontal: 20, vertical: 30 }
                                             : { horizontal: 20, vertical: 30 };
}
GridLayout.DEFAULT_LIMITS = [ 1000, 1000 ]; // in pixels
GridLayout.prototype.nextPosition = function(node, size, limits) {
    limits = limits || GridLayout.DEFAULT_LIMITS;
    var nodeRects = this.nodeRects, boxPadding = this.boxPadding;
    var width =  size.width, height = size.height,
        hPadding = boxPadding.horizontal, vPadding = boxPadding.vertical;
    var lastRect = (nodeRects.length ? nodeRects[nodeRects.length-1] : null);
    var newRect = { x: lastRect ? lastRect.x : hPadding,
                    y: lastRect ? (lastRect.y + lastRect.height + vPadding) : vPadding,
                    width: width, height: height };
    if ((newRect.y + height + vPadding) > limits.height) {
        newRect.x = newRect.x + width + hPadding;
        newRect.y = vPadding;
    }
    nodeRects.push(newRect);
    return { x: newRect.x, y: newRect.y };
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
                    .attr('x2', x1).attr('y2', y1);
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
    var inletPos  = incrementPos(getPos(inletConnector.node()),  3),
        outletPos = incrementPos(getPos(outletConnector.node()), 3);
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
VLink.prototype.noPointerEvents = function() {
    this.elm.style('pointer-events', 'none');
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
                 var pivot = incrementPos(getPos(connector.node()), 3);
                 var ghost = new VLink().construct(pivot.x, pivot.y, pos.x, pos.y)
                                        .noPointerEvents().appendTo(root);
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
                 var pivot = incrementPos(getPos(getConnector(outlet).node()), 3);
                 var ghost = new VLink().construct(pivot.x, pivot.y, pos.x, pos.y)
                                        .noPointerEvents().appendTo(root);
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

/* function buildNodeList(root, nodeTypes, nodeDescriptions) {

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

} */

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
// ============================= DragAndDrop ===================================
// =============================================================================

function DragAndDrop(root) {
    this.root = root;
}

DragAndDrop.prototype.add = function(handle, spec) {
    var root = this.root;
    var start = spec.start, end = spec.end, drag = spec.drag;
    Kefir.fromEvents(handle.node(), 'mousedown').map(extractPos)
                                                .flatMap(function(pos) {
        var initPos = start(),
            diffPos = { x: pos.x - initPos.x,
                        y: pos.y - initPos.y };
        var moveStream = Kefir.fromEvents(root.node(), 'mousemove')
                              .tap(stopPropagation)
                              .takeUntilBy(Kefir.fromEvents(root.node(), 'mouseup'))
                              .map(extractPos)
                              .map(function(absPos) {
                                  return { x: absPos.x - diffPos.x,
                                           y: absPos.y - diffPos.y };
                              });
        moveStream.last().onValue(end);
        return moveStream;
    }).onValue(drag);
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
function incrementPos(pos, incX, incY) {
    return { x: pos.x + incX, y: pos.y + (incY || incX) };
}
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

function roundedRect(x, y, width, height, rtl, rtr, rbr, rbl) {
    return "M" + x + "," + y
         + (rtl ? ("v" + rtl
                 + "a" + rtl + "," + rtl + " 0 0 1 " +  rtl + "," + -rtl) : "")
         + "h" + (width  - (rtl ? rtl : 0) - (rtr ? rtr : 0))
         + (rtr ? ("a" + rtr + "," + rtr + " 0 0 1 " +  rtr + "," +  rtr) : "")
         + "v" + (height - (rtr ? rtr : 0) - (rbr ? rbr : 0))
         + (rbr ? ("a" + rbr + "," + rbr + " 0 0 1 " + -rbr + "," +  rbr) : "")
         + "h" + ((rbr ? rbr : 0) + (rbl ? rbl : 0) - width)
         + (rbl ? ("a" + rbl + "," + rbl + " 0 0 1 " + -rbl + "," + -rbl) : "")
         + "v" + ((rbl ? rbl : 0) + (rtl ? rtl : 0) - height)
         + "z";
}

// =============================================================================
// ============================ registration ===================================
// =============================================================================

Rpd.SvgRenderer = SvgRenderer;

Rpd.renderer('svg', SvgRenderer);

})();
