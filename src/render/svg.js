;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

var ƒ = Rpd.unit;

var defaultConfig = {
    style: 'quartz',
    // network takes the full page, so the target element will be resized
    // to match browser window size when it was resized by user and so on
    fullPage: false,
    // show inlet/outlet value only when user hovers over its connector
    // (always showing, by default)
    valuesOnHover: false,
    // show node containers for debugging purposes
    showBoxes: false,
    // are nodes allowed to be dragged
    nodeMovingAllowed: true,
    // only one connection is allowed to inlet by default
    inletAcceptsMultipleLinks: false,
    // when user opens a projected sub-patch, automatically close its parent patch
    closeParent: false,
    // write global errors to console, if it exists
    logErrors: true,
    // a time for value update or error effects on inlets/outlets
    effectTime: 1000
};

// either use the full d3.js library or the super-tiny version provided with RPD
var d3 = d3 || d3_tiny;

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

var currentPatch;

var nodeTypes = Rpd.allNodeTypes,
    nodeDescriptions = Rpd.allNodeDescriptions,
    nodeTypeIcons = Rpd.allNodeTypeIcons;

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

function SvgRenderer(patch) {

return function(networkRoot, userConfig) {

    var config = mergeConfig(userConfig, defaultConfig);

    // FIXME: should be called once when renderer is
    // registered and Rpd.events is ready, not for every patch
    Render.reportErrorsToConsole(config);

    var style = Rpd.getStyle(config.style, 'svg')(config);

    networkRoot = d3.select(networkRoot)
                    .classed('rpd-network', true)
                    .classed('rpd-full-page', config.fullPage);

    var svg;
    /* a.k.a. patch canvas, but not obligatory HTML5 canvas */

    var connectivity, dnd;

    return {

        // the object below reacts on every Patch event and constructs corresponding
        // HTML structures in response, or modifies them;

        'patch/is-ready': function(update) {

            var docElm = d3.select(document.documentElement);

            // build canvas element as a target for all further patch modifications
            svg = d3.select(_createSvgElement('svg'))
                    .attr('width', networkRoot.property('clientWidth'))
                    .attr('height', networkRoot.property('clientHeight'))
                    .classed('rpd-canvas', true);

            svg.append('rect').attr('class', 'rpd-background');

            if (config.fullPage) {
                svg.attr('width', '100%'/*docElm.property('clientWidth')*/)
                   .attr('height', docElm.property('clientHeight'));
                svg.select('.rpd-background').attr('width', '100%'/*docElm.property('clientWidth')*/)
                                             .attr('height', docElm.property('clientHeight'));
            }

            var patchCanvas = svg.append(style.createCanvas(patch, networkRoot).element)
                               .classed('rpd-style-' + config.style, true)
                               .classed('rpd-values-' + (config.valuesOnHover ? 'on-hover' : 'always-shown'), true)
                               .classed('rpd-show-boxes', config.showBoxes)
                               .data(update.patch);

            tree.patches[patch.id] = svg.data({ canvas: patchCanvas,
                                                width: docElm.property('clientWidth'),
                                                height: docElm.property('clientHeight'),
                                                patch: update.patch
                                              });

            // resize network root on window resize
            if (config.fullPage) updateCanvasHeightOnResize(window, document, svg, svg.select('.rpd-background'));

            // initialize the node placing (helps in determining the position where new node should be located)
            tree.patchToPlacing[patch.id] = new Render.Placing(style);
            tree.patchToLinks[patch.id] = new VLinks();

            // initialize connectivity module, it listens for clicks on outlets and inlets and builds or removes
            // links if they were clicked in the appropriate order
            connectivity = new /*Render.*/Connectivity(svg, style, config);

            // initialized drag-n-drop support (used to allow user drag nodes)
            if (config.nodeMovingAllowed) dnd = new Render.DragAndDrop(svg, style);

            Kefir.fromEvents(svg.node(), 'selectstart').onValue(preventDefault);

        },

        'patch/open': function(update) {
            if ((config.closeParent || config.fullPage) && update.parent) update.parent.close();
            currentPatch = update.patch;
            var newCanvas = tree.patches[update.patch.id];
            networkRoot.append(newCanvas.node());

            tree.patchToLinks[update.patch.id].updateAll();
            if (style.onPatchSwitch) style.onPatchSwitch(currentPatch, newCanvas.node());
        },

        'patch/close': function(update) {
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
                        target.open(current);
                    }
                 })(patch, update.target));
        },

        'patch/move-canvas': function(update) {
            svg.style('position', 'relative');
            svg.style('top', Math.floor(update.position[0]) + 'px');
            svg.style('left', Math.floor(update.position[1]) + 'px');
            //svg.attr('transform', 'translate(' + Math.floor(update.position[0]) + ',' + Math.floor(update.position[1]) + ')');
        },

        'patch/resize-canvas': function(update) {
            svg.attr('width', update.size[0]);
            svg.attr('height', update.size[1]);
            svg.select('.rpd-background').attr('width', '100%')
                                         .attr('height', '100%');
        },

        'patch/add-node': function(update) {

            var node = update.node;

            var render = update.render;

            // find a rectange to place the new node
            var placing = tree.patchToPlacing[update.patch.id],
                // current patch canvas should be used as a limit source, even if we add to another patch
                // or else other canvas may have no dimensions yet
                limitSrc = tree.patches[currentPatch.id].data();

            var nodeBox = d3.select(_createSvgElement('g')).attr('class', 'rpd-node-box');
            var styledNode = style.createNode(node, render, nodeDescriptions[node.type], nodeTypeIcons[node.type]);
            var nodeElm = nodeBox.append(styledNode.element);

            // store targets information and node canvas element itself
            tree.nodes[node.id] = nodeBox.data({ inletsTarget:  nodeElm.select('.rpd-inlets'),
                                                 outletsTarget: nodeElm.select('.rpd-outlets'),
                                                 processTarget: nodeElm.select('.rpd-process'),
                                                 position: nodePos, size: styledNode.size });

            var nodePos = placing.nextPosition(node, styledNode.size, { width: limitSrc.width, height: limitSrc.height });

            node.move(nodePos.x, nodePos.y);

            var nodeLinks = new VLinks();
            tree.nodeToLinks[node.id] = nodeLinks;

            // add possiblity to drag nodes
            if (config.nodeMovingAllowed) {
                var shadow = nodeElm.select('.rpd-shadow'),
                    handle = nodeElm.select('.rpd-drag-handle');
                if (!handle.empty()) {
                    dnd.add(handle,
                        { start: function() {
                            nodeElm.classed('rpd-dragging', true);
                            if (!shadow.empty()) shadow.attr('x', 7).attr('y', 8);
                            return nodeBox.data().position;
                          },
                          drag: function(pos) {
                              nodeBox.attr('transform', 'translate(' + pos.x + ',' + pos.y + ')');
                              nodeLinks.forEach(function(vlink) { vlink.update(); });
                          },
                          end: function(pos) {
                              node.move(pos.x, pos.y);
                              if (!shadow.empty()) shadow.attr('x', 5).attr('y', 6);
                              nodeElm.classed('rpd-dragging', false);
                          }
                      });
                }
            }

            // node could require some preparation using patch cavas
            if (render.prepare) render.prepare.bind(node)
                                              (tree.patches[patch.id].node(),
                                               tree.patches[currentPatch.id].node());

            // use custom node body renderer, if defined
            if (render.first) subscribeUpdates(node, render.first.bind(node)(nodeElm.select('.rpd-process').node(), node.event['node/configure']));

            // if node body should be re-rendered, update links (since body element bounds could change)
            if (render.always) {
                // this code used getBoundingClientRect to determine if node body width/height
                // values were changed and updates links positions only when they really did,
                // but it appeared to be quite hard to check, i.e. height value, since browsers
                // keep it equal to 0
                node.event['node/process'].throttle(100).onValue(function() {
                    nodeLinks.updateAll();
                });
            }

            // remove node when remove button was clicked
            var removeButton = nodeElm.select('.rpd-remove-button');
            if (!removeButton.empty()) {
                Kefir.fromEvents(nodeElm.select('.rpd-remove-button-handle').node(), 'click')
                     .map(stopPropagation)
                     .onValue(function() {
                         patch.removeNode(node);
                     });
            }

            // append to the the patch canvas node
            var patchCanvas = tree.patches[node.patch.id].data().canvas;
            patchCanvas.append(nodeBox.node());

        },

        'patch/remove-node': function(update) {
            var node = update.node;

            var nodeBox = tree.nodes[node.id];

            tree.nodeToLinks[node.id].forEach(function(vlink) {
                vlink.get().disconnect();
            });

            nodeBox.remove();
            if (style.onNodeRemove) style.onNodeRemove(node);

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
                render.always.bind(node)(bodyElm, update.inlets, update.outlets);
            }
        },

        'node/add-inlet': function(update) {

            var inlet = update.inlet;

            if (inlet.def.hidden) return;

            var nodeData = tree.nodes[update.node.id].data();

            var inletsTarget = nodeData.inletsTarget;
            var render = update.render;

            var inletElm;

            var inletElm = d3.select(style.createInlet(inlet, render).element);

            inletElm.classed('rpd-'+inlet.type.replace('/','-'), true);
            inletElm.classed({ 'rpd-stale': true,
                               'rpd-readonly': inlet.def.readonly || false,
                               'rpd-cold': inlet.def.cold || false
                             });

            var editor = null;
            if (!inlet.def.readonly && render.edit) {
                editor = new ValueEditor(inlet, render, svg,
                                         inletElm.select('.rpd-value-holder'),
                                         inletElm.select('.rpd-value'),
                                         d3.select(_createSvgElement('g')));
                inletElm.select('.rpd-value-holder').append(editor.editorElm.node());
            }

            tree.inlets[inlet.id] = inletElm.data({
                connector: inletElm.select('.rpd-connector'),
                value: inletElm.select('.rpd-value'),
                vlinks: new VLinks(), // links associated with this inlet
                editor: editor
                //position: inletPos
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

            var nodeData = tree.nodes[update.node.id].data();

            var outletsTarget = nodeData.outletsTarget;
            var render = update.render;

            var outletElm = d3.select(style.createOutlet(outlet, render).element);

            outletElm.classed('rpd-'+outlet.type.replace('/','-'), true);
            outletElm.classed('rpd-stale', true);

            tree.outlets[outlet.id] = outletElm.data({
                connector: outletElm.select('.rpd-connector'),
                value: outletElm.select('.rpd-value'),
                vlinks: new VLinks() // links associated with this outlet
                //position: outletPos
            });

            // listen for clicks in connector and allow to edit links this way
            connectivity.subscribeOutlet(outlet, outletElm.select('.rpd-connector'));

            outletsTarget.append(outletElm.node());
        },

        'node/remove-inlet': function(update) {
            var inlet = update.inlet;
            var inletData = tree.inlets[inlet.id].data();

            inletData.vlinks.forEach(function(vlink) {
                vlink.get().disconnect();
            });

            tree.inlets[inlet.id].remove();
            if (style.onInletRemove) style.onInletRemove(inlet);

            tree.inlets[inlet.id] = null;

        },

        'node/remove-outlet': function(update) {
            var outlet = update.outlet;
            var outletData = tree.outlets[outlet.id].data();

            outletData.vlinks.forEach(function(vlink) {
                vlink.get().disconnect();
            });

            tree.outlets[outlet.id].remove();
            if (style.onOutletRemove) style.onOutletRemove(outlet);

            tree.outlets[outlet.id] = null;
        },

        'inlet/update': function(update) {

            var inlet = update.inlet;

            if (inlet.def.hidden) return;

            var render = update.render;

            var inletElm = tree.inlets[inlet.id];
            var valueElm = inletElm.data().value;

            if (!valueElm.empty()) {
                var valueRepr = inlet.def.show ? inlet.def.show(update.value)
                                               : update.value;
                if (render.show) {
                    render.show.bind(inlet)(valueElm.parent().node(), update.value, valueRepr);
                } else {
                    valueElm.text(valueRepr);
                }
            }

            // adds `rpd-fresh` CSS class and removes it by timeout
            addValueUpdateEffect(inlet.id, inletElm, config.effectTime);

        },

        'outlet/update': function(update) {

            var outlet = update.outlet;
            var render = update.render;

            var outletElm = tree.outlets[outlet.id];
            var valueElm = outletElm.data().value;

            if (!valueElm.empty()) {
                var valueRepr = outlet.def.show ? outlet.def.show(update.value)
                                                : update.value;
                if (render.show) {
                    render.show.bind(outlet)(valueElm.parent().node(), update.value, valueRepr);
                } else {
                    valueElm.text(valueRepr);
                }
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

            if (!config.inletAcceptsMultipleLinks && (inletData.vlinks.count() === 1)) {
                throw new Error('Inlet is already connected to a link');
            }

            // disable value editor when connecting to inlet
            if (inletData.editor) inletData.editor.disable();

            var vlink = new VLink(link, style);

            vlink.construct(config.linkWidth)
                 .rotateOI(outlet, inlet);

            d3.select(vlink.getElement())
              .classed('rpd-'+inlet.type.replace('/','-'), true)
              .classed('rpd-'+outlet.type.replace('/','-'), true)

            tree.links[link.id] = vlink;
            outletData.vlinks.add(vlink);
            inletData.vlinks.add(vlink);

            tree.nodeToLinks[outlet.node.id].add(vlink);
            if (outlet.node.id !== inlet.node.id) {
                tree.nodeToLinks[inlet.node.id].add(vlink);
            }
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
            inletData.vlinks.remove(vlink);

            tree.nodeToLinks[outlet.node.id].remove(vlink);
            if (outlet.node.id !== inlet.node.id) {
                tree.nodeToLinks[inlet.node.id].remove(vlink);
            }
            tree.patchToLinks[patch.id].remove(vlink);

            // remove link element
            vlink.removeFrom(svg);

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

function updateCanvasHeightOnResize(_window, _document, svg, background) {
    // resize canvas element on window resize
    Kefir.fromEvents(_window, 'resize')
         .map(function() { return _window.innerHeight ||
                                  _document.documentElement.clientHeight ||
                                  _document.body.clientHeight; })
         .onValue(function(value) {
             svg.attr('height', value);
             background.attr('height', value);
             svg.data().height = value;
         });
    svg.data().subscribedToResize = true;
}

// =============================================================================
// ============================= Connectivity ==================================
// =============================================================================

function awaiting(a, b) {
    return Kefir.merge([ a.map(ƒ(true)),
                         b.map(ƒ(false)) ]).toProperty(ƒ(false));
}

// FRP-based connection (links b/w outlets and inlets) editor logic

var Connectivity = (function() {

    function getLinks(inlet) {
        return tree.inlets[inlet.id].data().vlinks;
    }
    function hasLinks(inlet) {
        return function() {
            return (getLinks(inlet).count() > 0);
        }
    }
    function getConnector(outlet) {
        return tree.outlets[outlet.id].data().connector;
    }
    function removeExistingLink(inletLinks) {
        if (inletLinks.count() === 1) {
            // cases when .count() > 1 should never happen in this case
            var prevLink = inletLinks.getLast().link,
                otherOutlet = prevLink.outlet;
            otherOutlet.disconnect(prevLink);
        }
    }
    function removeConnectionsToOutlet(inletLinks, outlet) {
        inletLinks.forEach(function(vlink) {
            if (vlink.link.outlet.id === outlet.id) {
                outlet.disconnect(vlink.link);
            }
        });
    }

    function Connectivity(canvas, style, config) {
        this.canvas = canvas;
        this.style = style;
        this.config = config;

        this.canvasClicks = Kefir.fromEvents(this.canvas.node(), 'click');
        this.inletClicks = Kefir.pool(),
        this.outletClicks = Kefir.pool();

        this.startLink = Kefir.emitter(),
        this.finishLink = Kefir.emitter(),
        this.doingLink = awaiting(this.startLink, this.finishLink);
    }
    Connectivity.prototype.subscribeOutlet = function(outlet, connector) {

        var canvas = this.canvas; var style = this.style; var config = this.config;
        var canvasClicks = this.canvasClicks, outletClicks = this.outletClicks, inletClicks = this.inletClicks;
        var startLink = this.startLink, finishLink = this.finishLink, doingLink = this.doingLink;

        // - Every time user clicks an outlet, a new link is created which user can drag, then:
        // - If user clicks other outlet after that, linking process is cancelled;
        // - If user clicks canvas element, linking process is cancelled;
        // - If user clicks an inlet, linking process is considered successful and finished, but also...
        // - If this inlet had a link there connected, this previous link is removed and disconnected;

        outletClicks.plug(Kefir.fromEvents(connector.node(), 'click')
                               .map(extractPos)
                               .map(addTarget(outlet)));

        Kefir.fromEvents(connector.node(), 'click')
             .map(stopPropagation)
             .filterBy(awaiting(outletClicks, doingLink))
             .map(extractPos)
             .onValue(function(pos) {
                 startLink.emit();
                 var ghost = new VLink(null, style).construct(config.linkWidth)
                                                   .rotateO(outlet, pos.x, pos.y)
                                                   .noPointerEvents().appendTo(canvas);
                 d3.select(ghost.getElement())
                   .classed('rpd-'+outlet.type.replace('/','-'), true);
                 Kefir.fromEvents(canvas.node(), 'mousemove')
                      .takeUntilBy(Kefir.merge([ inletClicks,
                                                 outletClicks.map(ƒ(false)),
                                                 canvasClicks.map(ƒ(false)) ])
                                        .take(1)
                                        .onValue(function(success) {
                                            if (!success) return;
                                            var inlet = success.target,
                                                inletLinks = getLinks(inlet);
                                            if (config.inletAcceptsMultipleLinks) {
                                                removeConnectionsToOutlet(inletLinks, outlet);
                                            } else { removeExistingLink(inletLinks); }
                                            outlet.connect(inlet);
                                        }))
                      .map(extractPos)
                      .onValue(function(pos) {
                          ghost.rotateO(outlet, pos.x, pos.y);
                      }).onEnd(function() {
                          ghost.removeFrom(canvas);
                          finishLink.emit();
                      });
             });

    };
    Connectivity.prototype.subscribeInlet = function(inlet, connector) {

        var canvas = this.canvas; var style = this.style; var config = this.config;
        var canvasClicks = this.canvasClicks, outletClicks = this.outletClicks, inletClicks = this.inletClicks;
        var startLink = this.startLink, finishLink = this.finishLink, doingLink = this.doingLink;

        // - Every time user clicks an inlet which has a link there connected:
        // - This link becomes editable and so can be dragged by user,
        // - If user clicks outlet after that, linking process is cancelled and this link is removed;
        // - If user clicks canvas element after that, linking process is cancelled,
        //   and this link is removed;
        // - If user clicks other inlet, the link user drags/edits now is moved to be connected
        //   to this other inlet, instead of first-clicked one;

        inletClicks.plug(Kefir.fromEvents(connector.node(), 'click')
                              .map(extractPos)
                              .map(addTarget(inlet)));

        Kefir.fromEvents(connector.node(), 'click')
             .map(stopPropagation)
             .filterBy(awaiting(inletClicks, doingLink))
             .filter(hasLinks(inlet))
             .onValue(function(pos) {
                 var lastLink = getLinks(inlet).getLast().link;
                 var outlet = lastLink.outlet;
                 outlet.disconnect(lastLink);
                 startLink.emit();
                 var ghost = new VLink(null, style).construct(config.linkWidth)
                                                   .rotateO(outlet, pos.x, pos.y)
                                                   .noPointerEvents().appendTo(canvas);
                 d3.select(ghost.getElement())
                   .classed('rpd-'+inlet.type.replace('/','-'), true)
                   .classed('rpd-'+outlet.type.replace('/','-'), true);
                 Kefir.fromEvents(canvas.node(), 'mousemove')
                      .takeUntilBy(Kefir.merge([ inletClicks,
                                                 outletClicks.map(ƒ(false)),
                                                 canvasClicks.map(ƒ(false)) ])
                                        .take(1)
                                        .onValue(function(success) {
                                            if (!success) return;
                                            var otherInlet = success.target,
                                                otherInletLinks = getLinks(otherInlet);
                                            if (config.inletAcceptsMultipleLinks) {
                                                removeConnectionsToOutlet(otherInletLinks, outlet);
                                            } else { removeExistingLink(otherInletLinks); }
                                            outlet.connect(otherInlet);
                                        }))
                      .map(extractPos)
                      .onValue(function(pos) {
                          ghost.rotateO(outlet, pos.x, pos.y);
                      }).onEnd(function() {
                          ghost.removeFrom(canvas);
                          finishLink.emit();
                      });
             });

    };

    return Connectivity;

})();

// =============================================================================
// =============================== Values ======================================
// =============================================================================

function ValueEditor(inlet, render, canvas, valueHolder, valueElm, editorElm) {
    var valueIn = Kefir.emitter(),
        disableEditor = Kefir.emitter();
    this.disableEditor = disableEditor;
    this.editorElm = editorElm;
    this.valueElm = valueElm;
    editorElm.classed('rpd-value-editor', true);
    var valueOut = render.edit.bind(inlet)(editorElm.node(), inlet, valueIn);
    valueOut.onValue(function(value) { inlet.receive(value); });
    Kefir.combine([ Kefir.merge([
                              Kefir.fromEvents(valueHolder.node(), 'click')
                                   .map(stopPropagation)
                                   .map(ƒ(true)),
                              Kefir.fromEvents(canvas.node(), 'click')
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
                valueHolder.classed('rpd-editor-disabled', false);
            } else if (conf.cancelEditing) {
                valueElm.classed('rpd-edited', true);
                valueHolder.classed('rpd-editor-enabled', false);
                valueHolder.classed('rpd-editor-disabled', true);
            }
         });
    valueHolder.classed('rpd-editor-enabled', false);
    valueHolder.classed('rpd-editor-disabled', true);
}
ValueEditor.prototype.disable = function() {
    this.valueElm.classed('rpd-edited', false);
    this.disableEditor.emit();
}

// =============================================================================
// =============================== helpers =====================================
// =============================================================================

var VLink  = Render.VLink,
    VLinks = Render.VLinks;

var mergeConfig = Render.mergeConfig;

var preventDefault = Render.preventDefault,
    stopPropagation = Render.stopPropagation;

var extractPos = Render.extractPos;

var addTarget = Render.addTarget,
    addClickSwitch = Render.addClickSwitch;

var addValueErrorEffect = Render.addValueErrorEffect,
    addValueUpdateEffect = Render.addValueUpdateEffect;

var subscribeUpdates = Render.subscribeUpdates;

// =============================================================================
// ============================ registration ===================================
// =============================================================================

Rpd.SvgRenderer = SvgRenderer;

Rpd.renderer('svg', SvgRenderer);

})(this);
