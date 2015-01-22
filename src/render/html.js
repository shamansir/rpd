(function() {

    // inlets/outlets are at the left/right sides of a node body
var QUARTZ_LAYOUT = 'quartz',
    // inlets/outlets are at the top/bottom sides of a node body
    PD_LAYOUT = 'pd';

var default_config = {
    layout: QUARTZ_LAYOUT,
    // show inlet/outlet value only when user hovers over its connector
    // (always showing, by default)
    valuesOnHover: false,
    // show inlets/outlets and node types for debugging purposes
    showTypes: false,
    // show node containers for debugging purposes
    showBoxes: false,
    // are nodes allowed to be dragged
    nodesMovingAllowed: true
};

// z-indexes
var NODE_LAYER = 0,
    NODEDRAG_LAYER = 1,
    LINK_LAYER = 2,
    LINKDRAG_LAYER = 3;

// ============================= HtmlRenderer ==================================
// =============================================================================

function HtmlRenderer(user_config) {

    // these objects store elements and data corresponding to given nodes,
    // inlets, outlets, links as hashes, by their ID;
    // it's not pure functional way, especially in comparison to RPD engine code,
    // but in this case semi-imperative way appeared to be easier and faster;
    // nodes:   { id: { elm, body, inletsTrg, outletsTrg }, ... }
    // outlets: { id: { elm, valueElm, connectorElm, links }, ... }
    // inlets:  { id: { elm, valueElm, connectorElm, link  }, ... }
    // links:   { id: { elm, link  }, ... }
    var nodes, outlets, inlets, links;

    var config = mergeConfig(user_config, default_config);

    // Connections object manages only the run-time editing of the links,
    // it's completely written in FRP style;
    var connections = Connections();

    return {

        // the object below reacts on every Model event and constructs corresponding
        // HTML structures in response, or modifies them; some blocks of code
        // are really huge because of massive createElement, appendChild and stuff,
        // but I decided that it is the only way which needs no external library
        // to build required DOM; may be later I'll decide to use `shaven` templates
        // or something similar, but actually it's not a lot to build here, it just
        // looks massive;

        // ============================ model/new ==============================

        'model/new': function(root, update) {

            nodes = {}; outlets = {}; inlets = {}, links = {};

            /* <build HTML> */

            root.classList.add('rpd-model');
            if (config.layout) root.classList.add('rpd-layout-' + config.layout);
            if (config.valuesOnHover) {
                root.classList.add('rpd-values-on-hover');
            } else {
                root.classList.add('rpd-values-always-shown');
            }
            if (config.showBoxes) root.classList.add('rpd-show-boxes');

            root.style.height = window.innerHeight + 'px';

            Kefir.fromEvent(root, 'resize').onValue(function() {
                root.style.height = window.innerHeight + 'px';
            });

            /* </build HTML> */

            // initialize connection editor
            connections.init(root);

            Kefir.fromEvent(root, 'selectstart').onValue(function(evt) { evt.preventDefault(); });

        },

        // ============================ node/add ===============================

        'node/add': function(root, update) {

            var node = update.node;

            /* <build HTML> */

            // div.rpd-node-box
            //   table.rpd-node
            //     ...

            var nodeBox = quickElm('div', 'rpd-node-box');
            var nodeElm = quickElm('table', 'rpd-node');

            var dragTrg;

            var inletsTrg, outletsTrg, bodyElm;

            if (config.layout == QUARTZ_LAYOUT) {

                // thead.rpd-title
                //   tr
                //     th[colspan=3]
                //       span.rpd-name: node.name
                //       span.rpd-type: node.type

                var headElm = quickElm('thead', 'rpd-title');
                var headRow = quickElm('tr');

                if (node.def.icon) {
                    // TODO
                }

                var headCell = quickElm('th');
                headCell.setAttribute('colspan', 3);
                headCell.appendChild(quickElmVal('span', 'rpd-name', node.name));
                if (config.showTypes) headCell.appendChild(quickElmVal('span', 'rpd-type', node.type));
                headRow.appendChild(headCell);
                headElm.appendChild(headRow);

                // tbody.rpd-content
                //   tr
                //     td.rpd-inlets
                //       table
                //         tbody
                //           ... (see inlet/add)
                //     td.rpd-body
                //       table
                //         tr
                //           td
                //             ... (see node/process)
                //     td.rpd-outlets
                //       table
                //         tbody
                //           ... (see outlet/add)

                var contentElm = quickElm('tbody', 'rpd-content');
                var contentRow = quickElm('tr');

                var inletsCell = quickElm('td', 'rpd-inlets');
                var inletsTable = quickElm('table');
                var inletsBody = quickElm('tbody');

                inletsTrg = inletsBody;

                inletsTable.appendChild(inletsBody);
                inletsCell.appendChild(inletsTable);

                bodyElm = quickElm('div');

                var bodyCell = quickElm('td', 'rpd-body');
                var innerBodyTable = quickElm('table');
                var innerBodyRow = quickElm('tr');
                var innerBodyCell = quickElm('td');
                innerBodyCell.appendChild(bodyElm);
                innerBodyRow.appendChild(innerBodyCell);
                innerBodyTable.appendChild(innerBodyRow);
                bodyCell.appendChild(innerBodyTable);

                var outletsCell = quickElm('td', 'rpd-outlets');
                var outletsTable = quickElm('table');
                var outletsBody = quickElm('tbody');

                outletsTrg = outletsBody;

                outletsTable.appendChild(outletsBody);
                outletsCell.appendChild(outletsTable);

                contentRow.appendChild(inletsCell);
                contentRow.appendChild(bodyCell);
                contentRow.appendChild(outletsCell);
                contentElm.appendChild(contentRow);

                nodeElm.appendChild(headElm);
                nodeElm.appendChild(contentElm);

                dragTrg = headElm;

            } else if (config.layout == PD_LAYOUT) {

                // tr.rpd-inlets
                //   td
                //     table
                //       tbody
                //         ... (see inlet/add)
                // tr.rpd-content
                //   td.rpd-title
                //     span.rpd-name: node.name
                //     span.rpd-type: node.type
                //   td.rpd-body
                //     div
                //       table
                //         tr
                //           td
                //             ... (see node/process)
                // tr.rpd-outlets
                //   td
                //     table
                //       tbody
                //         ... (see outlet/add)

                var inletsRow = quickElm('tr', 'rpd-inlets');

                var inletsCell = quickElm('td');
                var inletsTable = quickElm('table');
                var inletsBody = quickElm('tbody');

                inletsTrg = inletsBody;

                inletsTable.appendChild(inletsBody);
                inletsCell.appendChild(inletsTable);
                inletsRow.appendChild(inletsCell)
                nodeElm.appendChild(inletsRow);

                var contentRow = quickElm('tr', 'rpd-content');

                if (node.def.icon) {
                    // TODO
                }

                var headCell = quickElm('td', 'rpd-title');
                //headCell.setAttribute('colspan', 3);
                headCell.appendChild(quickElmVal('span', 'rpd-name', node.name));
                if (config.showTypes) headCell.appendChild(quickElmVal('span', 'rpd-type', node.type));
                contentRow.appendChild(headCell);

                var bodyCell = quickElm('td', 'rpd-body');
                var bodyElm = quickElm('div');
                var innerBodyTable = quickElm('table');
                var innerBodyRow = quickElm('tr');
                var innerBodyCell = quickElm('td');
                innerBodyCell.appendChild(bodyElm);
                innerBodyRow.appendChild(innerBodyCell);
                innerBodyTable.appendChild(innerBodyRow);

                bodyCell.appendChild(innerBodyTable);
                contentRow.appendChild(bodyCell);
                nodeElm.appendChild(contentRow);

                var outletsRow = quickElm('tr', 'rpd-outlets');

                var outletsCell = quickElm('td');
                var outletsTable = quickElm('table');
                var outletsBody = quickElm('tbody');

                outletsTrg = outletsBody;

                outletsTable.appendChild(outletsBody);
                outletsCell.appendChild(outletsTable);
                outletsRow.appendChild(outletsCell)
                nodeElm.appendChild(outletsRow);

                dragTrg = headCell;

            }

            /* </build HTML> */

            nodeElm.classList.add('rpd-'+node.type.replace('/','-'));
            nodeBox.style.zIndex = NODE_LAYER;

            // place node box wrapper in a suitable empty space in layout
            applyNextNodeRect(node, nodeBox);

            nodeBox.appendChild(nodeElm);

            root.appendChild(nodeBox);

            // save node data
            nodes[node.id] = {
                elm: nodeElm, body: bodyElm,
                inletsTrg: inletsTrg, outletsTrg: outletsTrg };

            // use custom node body renderer, if defined
            if (node.renderfirst.html) {
                node.renderfirst.html(bodyElm, node.event);
            }

            if (config.nodesMovingAllowed) {
                addDragNDrop(node, root, dragTrg, nodeBox);
            }

        },

        // ============================ node/ready =============================

        'node/ready': function(root, update) {

        },

        // ============================ node/process ===========================

        'node/process': function(root, update) {

            var node = update.node;

            // update node body with custom renderer, if defined
            if (node.render.html) {
                var bodyElm = nodes[node.id].body;
                node.render.html(bodyElm, update.inlets, update.outlets);
            }

        },

        // ============================ node/remove ============================

        'node/remove': function(root, update) {},

        // ============================ inlet/add ==============================

        'inlet/add': function(root, update) {

            var inlet = update.inlet;

            if (inlet.hidden) return;

            var nodeData = nodes[inlet.node.id];

            /* <build HTML> */

            var inletsTrg = nodeData.inletsTrg;

            var inletElm, valueElm, connectorElm;

            if (config.layout == QUARTZ_LAYOUT) {

                // tr.rpd-inlet.rpd-stale
                //   td.rpd-connector
                //   td.rpd-value-holder
                //     span.rpd-value
                //     [span.rpd-value-edit]
                //   td.rpd-name: inlet.name
                //   td.rpd-type: inlet.type

                inletElm = quickElm('tr', 'rpd-inlet rpd-stale');
                connectorElm = quickElm('td', 'rpd-connector');
                valueHolder = quickElm('td', 'rpd-value-holder');
                valueElm = quickElm('span', 'rpd-value');
                valueHolder.appendChild(valueElm);
                inletElm.appendChild(connectorElm);
                inletElm.appendChild(valueHolder);
                inletElm.appendChild(quickElmVal('td', 'rpd-name', inlet.name));
                if (config.showTypes) inletElm.appendChild(quickElmVal('td', 'rpd-type', inlet.type));

            } else if (config.layout == PD_LAYOUT) {

                // td.rpd-inlet.rpd-stale
                //   span.rpd-connector
                //   span.rpd-name: inlet.name
                //   span.rpd-value-holder
                //     span.rpd-value
                //     [span.rpd-value-edit]
                //   span.rpd-type: inlet.type

                inletElm = quickElm('td', 'rpd-inlet rpd-stale');
                connectorElm = quickElm('span', 'rpd-connector');
                valueHolder = quickElm('span', 'rpd-value-holder');
                valueElm = quickElm('span', 'rpd-value');
                valueHolder.appendChild(valueElm);
                inletElm.appendChild(connectorElm);
                inletElm.appendChild(quickElmVal('span', 'rpd-name', inlet.name));
                inletElm.appendChild(valueHolder);
                if (config.showTypes) inletElm.appendChild(quickElmVal('span', 'rpd-type', inlet.type));

            }

            inletElm.classList.add('rpd-'+inlet.type.replace('/','-'));

            inletsTrg.appendChild(inletElm);

            /* </build HTML> */

            var inletData = { elm: inletElm, valueElm: valueElm,
                                             connectorElm: connectorElm,
                              disableEditor: null, // if inlet has a value editor, this way
                                                   // we may disable it when new link
                                                   // is connected to this inlet
                              link: null };

            inlets[inlet.id] = inletData;

            if (inlet.renderedit.html && !inlet.readonly) {
                addValueEditor(inlet, inletData, root, valueHolder, valueElm);
            }

            // listen for clicks in connector and allow to edit links this way
            connections.subscribeInlet(inlet, connectorElm);

        },

        // ============================ inlet/remove ===========================

        'inlet/remove': function(root, update) {},

        // ============================ inlet/update ===========================

        'inlet/update': function(root, update) {

            var inlet = update.inlet;

            if (inlet.hidden) return;

            var inletData = inlets[inlet.id];
            var inletElm = inletData.elm;

            var valueElm = inletData.valueElm;
            valueElm.innerText = valueElm.textContent = update.value;

            if (inlet.render.html) {
                inlet.render.html(valueElm, update.value);
            } else {
                valueElm.innerText = valueElm.textContent = update.value;
            }

            valueUpdateEffect(inletData, inletElm);

        },

        // ============================ outlet/add =============================

        'outlet/add': function(root, update) {

            var outlet = update.outlet;

            if (outlet.hidden) return;

            /* <build HTML> */

            var nodeData = nodes[outlet.node.id];
            var outletsTrg = nodeData.outletsTrg;

            var outletElm, valueElm, connectorElm;

            if (config.layout == QUARTZ_LAYOUT) {

                // tr.rpd-outlet.rpd-stale
                //    td.rpd-connector
                //    td.rpd-value
                //    td.rpd-name: inlet.name
                //    td.rpd-type: inlet.type

                outletElm = quickElm('tr', 'rpd-outlet rpd-stale');
                connectorElm = quickElm('td', 'rpd-connector');
                valueElm = quickElm('td', 'rpd-value');

                if (config.showTypes) outletElm.appendChild(quickElmVal('td', 'rpd-type', outlet.type));
                outletElm.appendChild(quickElmVal('td', 'rpd-name', outlet.name));
                outletElm.appendChild(valueElm);
                outletElm.appendChild(connectorElm);

            } else if (config.layout == PD_LAYOUT) {

                // td.rpd-outlet.rpd-stale
                //    span.rpd-connector
                //    span.rpd-name: inlet.name
                //    span.rpd-value
                //    span.rpd-type: inlet.type

                outletElm = quickElm('td', 'rpd-outlet rpd-stale');
                connectorElm = quickElm('span', 'rpd-connector');
                valueElm = quickElm('span', 'rpd-value');
                outletElm.appendChild(connectorElm);
                outletElm.appendChild(quickElmVal('span', 'rpd-name', outlet.name));
                outletElm.appendChild(valueElm);
                if (config.showTypes) outletElm.appendChild(quickElmVal('span', 'rpd-type', outlet.type));

            }

            outletElm.classList.add('rpd-'+outlet.type.replace('/','-'));

            outletsTrg.appendChild(outletElm);

            /* </build HTML> */

            var outletData = { elm: outletElm,
                               valueElm: valueElm,
                               connectorElm: connectorElm,
                               links: {} };

            outlets[outlet.id] = outletData;

            // listen for clicks in connector and allow to edit links this way
            connections.subscribeOutlet(outlet, connectorElm);
        },

        // ============================ outlet/remove ==========================

        'outlet/remove': function(root, update) {},

        // ============================ outlet/update ==========================

        'outlet/update': function(root, update) {

            var outlet = update.outlet;

            var outletData = outlets[outlet.id];
            var outletElm = outletData.elm;

            var valueElm = outletData.valueElm;
            valueElm.innerText = valueElm.textContent = update.value;

            if (outlet.render.html) {
                outlet.render.html(valueElm, update.value);
            } else {
                valueElm.innerText = valueElm.textContent = update.value;
            }

            // adds `rpd-fresh` CSS class and removes it by timeout
            valueUpdateEffect(outletData, outletElm);

        },

        // ============================ outlet/connect =========================

        'outlet/connect': function(root, update) {

            var link = update.link;
            var outlet = link.outlet;
            var inlet  = link.inlet;

            var outletData = outlets[outlet.id];
            var inletData = inlets[inlet.id];

            var outletConnector = outletData.connectorElm;
            var inletConnector  = inletData.connectorElm;

            outletData.links[outlet.id] = link;
            if (inletData.link) throw new Error('Inlet is already connected to a link');
            inletData.link = link;

            // disable value editor when connecting to inlet
            if (inletData.disableEditor) inletData.disableEditor.emit();

            // visually link is just a CSS-rotated div with 1px border
            var p0 = outletConnector.getBoundingClientRect(),
                p1 = inletConnector.getBoundingClientRect();
            var linkElm = constructLink(p0.left, p0.top, p1.left, p1.top);

            links[link.id] = { elm: linkElm,
                               link: link };

            Kefir.fromEvent(linkElm, 'click')
                 .tap(stopPropagation)
                 .mapTo(false)
                 .scan(function(prev) {
                     return !prev; // will toggle between true and false
                 }).onValue(function(value) {
                     if (value) { link.enable() } else { link.disable(); };
                 });

            // add link element
            root.appendChild(linkElm);

        },

        // ============================ outlet/disconnect ======================

        'outlet/disconnect': function(root, update) {

            var link = update.link;
            var linkElm = links[link.id].elm;

            var outlet = link.outlet;
            var inlet  = link.inlet;

            var outletData = outlets[outlet.id];
            var inletData = inlets[inlet.id];

            // forget all references
            outletData.links[link.id] = null;
            inletData.link = null;

            links[link.id] = null;

            // remove link element
            root.removeChild(linkElm);
        },

        // ============================ link/enable ============================

        'link/enable': function(root, update) {
            var link = update.link;
            var linkElm = links[link.id].elm;
            linkElm.classList.remove('rpd-disabled');
        },

        // ============================ link/disable ===========================

        'link/disable': function(root, update) {
            var link = update.link;
            var linkElm = links[link.id].elm;
            linkElm.classList.add('rpd-disabled');
        },

        // ============================ link/adapt =============================

        'link/adapt': function(root, update) {},

        // ============================ link/error =============================

        'link/error': function(root, update) {}

    }; // return

    // ============================== helpers for FRP ==========================

    function stopPropagation(evt) { evt.preventDefault(); evt.stopPropagation(); };
    function extractPos(evt) { return { x: evt.clientX,
                                        y: evt.clientY }; };
    function getPos(elm) { var bounds = elm.getBoundingClientRect();
                           return { x: bounds.left, y: bounds.top } };
    function addTarget(target) {
        return function(pos) {
            return { pos: pos, target: target };
        }
    };

    // ============================== ValueEdit ================================

    function addValueEditor(inlet, inletData, root, valueHolder, valueElm) {
        var editor = quickElm('div', 'rpd-value-editor');
        valueHolder.classList.add('rpd-editor-disabled');
        valueHolder.appendChild(editor);
        var valueIn = Kefir.emitter(),
            disableEditor = Kefir.emitter();
        inletData.disableEditor = disableEditor;
        inlet.renderedit.html(editor, inlet, valueIn);
        Kefir.sampledBy([ inlet.event['inlet/update'] ],
            [ Kefir.merge([
                Kefir.fromEvent(valueHolder, 'click')
                     .tap(stopPropagation)
                     .mapTo(true),
                Kefir.fromEvent(root, 'click')
                     .merge(disableEditor)
                     .mapTo(false) ])
              .toProperty(false)
              .skipDuplicates() ])
        .map(function(val) { return { lastValue: val[0],
                                      startEditing: val[1],
                                      cancelEditing: !val[1] }; })
        .onValue(function(conf) {
            if (conf.startEditing) {
                if (inletData.link) inletData.link.disable();
                valueIn.emit(conf.lastValue);
                valueHolder.classList.add('rpd-editor-enabled');
            } else if (conf.cancelEditing) {
                valueHolder.classList.remove('rpd-editor-enabled');
            }
        });
    }

    // ============================== Connections ==============================
    // =========================================================================

    // FRP-based connection (links b/w outlets and inlets) editor logic

    function Connections() {

        var rootClicks,
            inletClicks,
            outletClicks;

        var startLink,
            finishLink,
            doingLink;

        var root;

        // helper functions

        function getLink(inlet) {
            return inlets[inlet.id].link;
        };
        var hasLink = function(inlet) {
            return function() {
                return getLink(inlet);
            };
        };
        function getConnector(outlet) {
            return outlets[outlet.id].connectorElm;
        }

        return {
            init: function(rootElm) {

                root = rootElm;

                rootClicks = Kefir.fromEvent(rootElm, 'click');
                inletClicks = Kefir.pool(),
                outletClicks = Kefir.pool();

                startLink = Kefir.emitter(),
                finishLink = Kefir.emitter(),
                doingLink = Kefir.merge([ startLink.mapTo(true),
                                          finishLink.mapTo(false) ]).toProperty(false);

            },
            subscribeOutlet: function(outlet, connector) {

                // - Every time user clicks an outlet, a new link is created which user can drag, then:
                // - If user clicks other outlet after that, linking process is cancelled;
                // - If user clicks root element (like document.body), linking process is cancelled;
                // - If user clicks an inlet, linking process is considered successful and finished, but also...
                // - If this inlet had a link there connected, this previous link is removed and disconnected;

                outletClicks.plug(Kefir.fromEvent(connector, 'click')
                                       .map(extractPos)
                                       .map(addTarget(outlet)));

                Kefir.fromEvent(connector, 'click').tap(stopPropagation)
                                                   .filterBy(outletClicks.awaiting(doingLink))
                                                   .map(extractPos)
                                                   .onValue(function(pos) {
                    startLink.emit();
                    var pivot = getPos(connector);
                    var ghost = constructLink(pivot.x, pivot.y, pos.x, pos.y);
                    root.appendChild(ghost);
                    return Kefir.fromEvent(root, 'mousemove')
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

            },
            subscribeInlet: function(inlet, connector) {

                // - Every time user clicks an inlet which has a link there connected:
                // - This link becomes editable and so can be dragged by user,
                // - If user clicks outlet after that, linking process is cancelled and this link is removed;
                // - If user clicks root element (like document.body) after that, linking process is cancelled,
                //   and this link is removed;
                // - If user clicks other inlet, the link user drags/edits now is moved to be connected
                //   to this other inlet, instead of first-clicked one;

                inletClicks.plug(Kefir.fromEvent(connector, 'click')
                                      .map(extractPos)
                                      .map(addTarget(inlet)));

                Kefir.fromEvent(connector, 'click').tap(stopPropagation)
                                                   .filterBy(inletClicks.awaiting(doingLink))
                                                   .filter(hasLink(inlet))
                                                   .onValue(function(pos) {
                    var prevLink = getLink(inlet);
                    var outlet = prevLink.outlet;
                    outlet.disconnect(prevLink);
                    startLink.emit();
                    var pivot = getPos(getConnector(outlet));
                    var ghost = constructLink(pivot.x, pivot.y, pos.x, pos.y);
                    root.appendChild(ghost);
                    return Kefir.fromEvent(root, 'mousemove')
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

            }

        } // return

    } // Connections

    // ============================== DragNDrop ================================
    // =========================================================================

    function selectLinks(node) {
        var selectedLinks = [], linkData, link;
        for (var id in links) {
            if (!links[id]) continue;
            linkData = links[id];
            link = linkData.link;
            if ((link.inlet.node.id  === node.id) ||
                (link.outlet.node.id === node.id)) {
                    selectedLinks.push(linkData);
                    linkData.elm.style.zIndex = LINKDRAG_LAYER;
                }
        }
        return selectedLinks;
    }

    function updateLinks(node, selectedLinks) {
        var link, linkElm, inletConnector, outletConnector,
            inletPos, outletPos;
        for (var i = 0, il = selectedLinks.length; i < il; i++) {
            link = selectedLinks[i].link;
            linkElm = selectedLinks[i].elm;
            inletConnector = inlets[link.inlet.id].connectorElm;
            outletConnector = outlets[link.outlet.id].connectorElm;
            inletPos = getPos(inletConnector);
            outletPos = getPos(outletConnector);
            rotateLink(linkElm, outletPos.x, outletPos.y, inletPos.x, inletPos.y);
        }
    }

    function addDragNDrop(node, root, handle, box) {
        var nodeData = nodes[node.id];
        handle.classList.add('rpd-drag-handle');
        var selectedLinks;
        Kefir.fromEvent(handle, 'mousedown').map(extractPos)
                                            .flatMap(function(pos) {
            box.classList.add('rpd-dragging');
            var initPos = getPos(box),
                diffPos = { x: pos.x - initPos.x,
                            y: pos.y - initPos.y };
            selectedLinks = null;
            box.style.zIndex = NODEDRAG_LAYER;
            return Kefir.fromEvent(root, 'mousemove')
                        .tap(stopPropagation)
                        .takeUntilBy(Kefir.fromEvent(root, 'mouseup'))
                        .map(extractPos)
                        .map(function(absPos) {
                            return { x: absPos.x - diffPos.x,
                                     y: absPos.y - diffPos.y };
                        }).onEnd(function() {
                            box.classList.remove('rpd-dragging');
                            box.style.zIndex = NODE_LAYER;
                            if (selectedLinks) {
                                for (var i = 0, il = selectedLinks.length; i < il; i++) {
                                    selectedLinks[i].elm.style.zIndex = LINK_LAYER;
                                }
                            }
                        });
        }).onValue(function(pos) {
            box.style.left = pos.x + 'px';
            box.style.top  = pos.y + 'px';
            if (!selectedLinks) {
                selectedLinks = selectLinks(node);
            }
            updateLinks(node, selectedLinks);
        });
    }

} // function


// ================================ utils ======================================
// =============================================================================

function mergeConfig(user_conf, defaults) {
    if (user_conf) {
        var merged = {};
        for (var prop in defaults)  { merged[prop] = defaults[prop]; }
        for (var prop in user_conf) { merged[prop] = user_conf[prop]; }
        return merged;
    } else return defaults;
}

function quickElm(type, cls) {
    var elm = document.createElement(type);
    if (cls) elm.className = cls;
    return elm;
}

function quickElmVal(type, cls, value) {
    var elm = document.createElement(type);
    elm.className = cls;
    elm.innerText = elm.textContent = value;
    return elm;
}

function valueUpdateEffect(storage, elmHolder) {
    elmHolder.classList.remove("rpd-stale");
    elmHolder.classList.add("rpd-fresh");
    if (storage.removeTimeout) clearTimeout(storage.removeTimeout);
    storage.removeTimeout = setTimeout(function() {
        elmHolder.classList.remove("rpd-fresh");
        elmHolder.classList.add("rpd-stale");
        storage.removeTimeout = null;
    }, 1000);
}

function constructLink(x0, y0, x1, y1) {
    var distance = Math.sqrt(((x0 - x1) * (x0 - x1)) +
                             ((y0 - y1) * (y0 - y1)));
    var angle = Math.atan2(y1 - y0, x1 - x0);

    var linkElm = quickElm('span','rpd-link');
    linkElm.style.position = 'absolute';
    linkElm.style.zIndex = LINK_LAYER;
    linkElm.style.width = Math.floor(distance) + 'px';
    linkElm.style.left = x0 + 'px';
    linkElm.style.top = y0 + 'px';
    linkElm.style.transformOrigin = 'left top';
    linkElm.style.webkitTransformOrigin = 'left top';
    linkElm.style.transform = 'rotateZ(' + angle + 'rad)';
    linkElm.style.webkitTransform = 'rotateZ(' + angle + 'rad)';
    return linkElm;
}

function rotateLink(linkElm, x0, y0, x1, y1) {
    var distance = Math.sqrt(((x0 - x1) * (x0 - x1)) +
                             ((y0 - y1) * (y0 - y1)));
    var angle = Math.atan2(y1 - y0, x1 - x0);
    linkElm.style.left = x0 + 'px';
    linkElm.style.top = y0 + 'px';
    linkElm.style.width = Math.floor(distance) + 'px';
    linkElm.style.transform = 'rotateZ(' + angle + 'rad)';
    linkElm.style.webkitTransform = 'rotateZ(' + angle + 'rad)';
}

var default_width = 100,
    default_height = 50,
    default_x_margin = 30;
    default_y_margin = 20,
    default_limits = [ 1000, 1000 ];

var node_rects = [];

function applyNextNodeRect(node, nodeElm, limits) {
    var width = node.def.boxWidth || default_width,
        height = node.def.boxHeight || default_height;
    var last_rect = (node_rects.length ? node_rects[node_rects.length-1] : null);
    var new_rect = [ /* x */ last_rect ? last_rect[0] : 0,
                     /* y */ last_rect ? (last_rect[1] + last_rect[3] + default_y_margin) : 0,
                     width,
                     height ];
    node_rects.push(new_rect);
    // relative positioning
    nodeElm.style.left = new_rect[0] + 'px';
    nodeElm.style.top = new_rect[1] + 'px';
    nodeElm.style.minWidth = new_rect[2] + 'px';
    nodeElm.style.minHeight = new_rect[3] + 'px';
    node_rects.push(new_rect);
}

// =========================== registration ====================================
// =============================================================================

Rpd.HtmlRenderer = HtmlRenderer;

Rpd.renderer('html', function(user_conf) {

    var instance = HtmlRenderer(user_conf);

    return function(root, update) {

        if (instance[update.type]) {
            instance[update.type](root, update);
        }

    }

});

})();
