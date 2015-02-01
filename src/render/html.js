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

    var descriptions = Rpd.allDescriptions;

    return {

        // the object below reacts on every Model event and constructs corresponding
        // HTML structures in response, or modifies them; some blocks of code
        // are really huge because of massive createElement, appendChild and stuff,
        // but I decided that it is the only way which needs no external library
        // to build required DOM; may be later I'll decide to use `shaven` templates
        // or something similar, but actually it's not a lot to build here, it just
        // looks massive;

        // =====================================================================
        // ============================ model/new ==============================
        // =====================================================================

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

            root.style.height = document.documentElement.clientHeight + 'px';
            // window.innerHeight + 'px';

            Kefir.fromEvent(root, 'resize').onValue(function() {
                root.style.height = document.documentElement.clientHeight + 'px';
            });

            /* </build HTML> */

            // initialize connection editor
            connections.init(root);

            if (config.renderNodeList) addNodeList(root, Rpd.allNodeTypes, descriptions);

            Kefir.fromEvent(root, 'selectstart').onValue(function(evt) { evt.preventDefault(); });

        },

        // =====================================================================
        // ============================ node/add ===============================
        // =====================================================================

        'node/add': function(root, update) {

            var node = update.node;

            /* <build HTML> */

            // div.rpd-node-box
            //   table.rpd-node
            //     ...

            var nodeBox = quickElm('div', 'rpd-node-box');
            var nodeElm = quickElm('table', 'rpd-node');

            var dragTrg;

            var inletsTrg, outletsTrg, bodyElm, removeButton;

            if (config.layout == QUARTZ_LAYOUT) {

                // thead.rpd-title
                //   tr.rpd-remove-button
                //     th
                //   tr
                //     th[colspan=3]
                //       span.rpd-name: node.name
                //       span.rpd-type: node.type

                var headElm = quickElm('thead', 'rpd-title');
                var headRow = quickElm('tr');

                var removeButtonRow = quickElm('tr', 'rpd-remove-button');
                removeButton = quickElm('th');
                //removeButton.setAttribute('colspan', 3);
                removeButton.innerText = removeButton.textContent = 'x';
                removeButtonRow.appendChild(removeButton);
                headElm.appendChild(removeButtonRow);

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
                // tr.rpd-remove-button
                //   td
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
                inletsRow.appendChild(inletsCell);
                nodeElm.appendChild(inletsRow);

                var removeButtonRow = quickElm('tr', 'rpd-remove-button');
                removeButton = quickElm('td');
                removeButton.innerText = removeButton.textContent = 'x';
                removeButtonRow.appendChild(removeButton);
                nodeElm.appendChild(removeButtonRow);

                var contentRow = quickElm('tr', 'rpd-content');

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
                outletsRow.appendChild(outletsCell);
                nodeElm.appendChild(outletsRow);

                dragTrg = headCell;

            }

            /* </build HTML> */

            nodeElm.classList.add('rpd-'+node.type.replace('/','-'));
            nodeBox.style.zIndex = NODE_LAYER;

            if (descriptions[node.type]) headCell.title = descriptions[node.type];

            // place node box wrapper in a suitable empty space in layout
            applyNextNodeRect(node, nodeBox, nodeElm, config.boxSize,
                              [ root.offsetWidth, root.offsetHeight ]);

            nodeBox.appendChild(nodeElm);

            root.appendChild(nodeBox);

            // save node data
            nodes[node.id] = {
                box: nodeBox, elm: nodeElm, body: bodyElm,
                inletsTrg: inletsTrg, outletsTrg: outletsTrg };

            // use custom node body renderer, if defined
            if (node.render.html && node.render.html.first) {
                subscribeUpdates(node, node.render.html.first(bodyElm));
            }

            if (config.nodesMovingAllowed) {
                addDragNDrop(node, root, dragTrg, nodeBox);
            }

            Kefir.fromEvent(removeButton, 'click')
                 .tap(stopPropagation)
                 .onValue(function() {
                     Rpd.currentModel().removeNode(node);
                 });

        },

        // =====================================================================
        // ============================ node/ready =============================
        // =====================================================================

        // 'node/ready': function(root, update) { },

        // =====================================================================
        // ============================ node/process ===========================
        // =====================================================================

        'node/process': function(root, update) {

            var node = update.node;

            // update node body with custom renderer, if defined
            if (node.render.html && node.render.html.always) {
                var bodyElm = nodes[node.id].body;
                node.render.html.always(bodyElm, update.inlets, update.outlets);
            }

        },

        // =====================================================================
        // ============================ node/remove ============================
        // =====================================================================

        'node/remove': function(root, update) {

            var node = update.node;

            var nodeData = nodes[node.id];

            var nodeLinks = selectLinks(node, links);

            var linkData;
            for (var i = 0, il = nodeLinks.length; i < il; i++) {
                linkData = nodeLinks[i];
                linkData.link.outlet.disconnect(linkData.link);
            }

            root.removeChild(nodeData.box);

            nodes[node.id] = null;

        },

        // =====================================================================
        // ============================ inlet/add ==============================
        // =====================================================================

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

            if (inlet.readonly) inletElm.classList.add('rpd-readonly');
            if (inlet.cold) inletElm.classList.add('rpd-cold');

            if (!inlet.readonly && inlet.render.html && inlet.render.html.edit) {
                addValueEditor(inlet, inletData, root, valueHolder, valueElm);
            }

            // adds `rpd-error` CSS class and removes it by timeout
            inlet.event['inlet/update'].onError(function() {
                valueErrorEffect(inletData, inletElm, config.effectTime);
            });

            // listen for clicks in connector and allow to edit links this way
            connections.subscribeInlet(inlet, connectorElm);

        },

        // =====================================================================
        // ============================ inlet/remove ===========================
        // =====================================================================

        // 'inlet/remove': function(root, update) {},

        // =====================================================================
        // ============================ inlet/update ===========================
        // =====================================================================

        'inlet/update': function(root, update) {

            var inlet = update.inlet;

            if (inlet.hidden) return;

            var inletData = inlets[inlet.id];
            var inletElm = inletData.elm;

            var valueElm = inletData.valueElm;

            var valueRepr = inlet.def.show ? inlet.def.show(update.value) : update.value;
            if (inlet.render.html && inlet.render.html.show) {
                inlet.render.html.show(valueElm, update.value, valueRepr);
            } else {
                valueElm.innerText = valueElm.textContent = valueRepr;
            }

            // adds `rpd-fresh` CSS class and removes it by timeout
            valueUpdateEffect(inletData, inletElm, config.effectTime);

        },

        // =====================================================================
        // ============================ outlet/add =============================
        // =====================================================================

        'outlet/add': function(root, update) {

            var outlet = update.outlet;

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

        // =====================================================================
        // ============================ outlet/remove ==========================
        // =====================================================================

        // 'outlet/remove': function(root, update) {},

        // =====================================================================
        // ============================ outlet/update ==========================
        // =====================================================================

        'outlet/update': function(root, update) {

            var outlet = update.outlet;

            var outletData = outlets[outlet.id];
            var outletElm = outletData.elm;

            var valueElm = outletData.valueElm;

            if (outlet.render.html && outlet.render.html.show) {
                outlet.render.html.show(valueElm, update.value);
            } else {
                valueElm.innerText = valueElm.textContent =
                    outlet.def.show ? outlet.def.show(update.value)
                                    : update.value;
            }

            // adds `rpd-fresh` CSS class and removes it by timeout
            valueUpdateEffect(outletData, outletElm, config.effectTime);

        },

        // =====================================================================
        // ============================ outlet/connect =========================
        // =====================================================================

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
            var linkElm = constructLink(p0.left, p0.top, p1.left, p1.top,
                                        config.linkWidth);

            links[link.id] = { elm: linkElm,
                               link: link };

            addClickSwitch(linkElm,
                           function() { link.enable(); },
                           function() { link.disable(); });

            // add link element
            root.appendChild(linkElm);

        },

        // =====================================================================
        // ============================ outlet/disconnect ======================
        // =====================================================================

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

        // =====================================================================
        // ============================ link/enable ============================
        // =====================================================================

        'link/enable': function(root, update) {
            var link = update.link;
            var linkElm = links[link.id].elm;
            linkElm.classList.remove('rpd-disabled');
        },

        // =====================================================================
        // ============================ link/disable ===========================
        // =====================================================================

        'link/disable': function(root, update) {
            var link = update.link;
            var linkElm = links[link.id].elm;
            linkElm.classList.add('rpd-disabled');
        }

        // =====================================================================
        // ============================ link/adapt =============================
        // =====================================================================

        // 'link/adapt': function(root, update) {},

        // =====================================================================
        // ============================ link/error =============================
        // =====================================================================

        // 'link/error': function(root, update) {}

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
    function invertValue(prev) { return !prev; };
    function addClickSwitch(elm, on_true, on_false, initial) {
        Kefir.fromEvent(elm, 'click')
             .tap(stopPropagation)
             .mapTo(initial || false)
             .scan(invertValue)  // will toggle between `true` and `false`
             .onValue(function(val) {
                 if (val) { on_true(); }
                 else { on_false(); }
             })
    }

    // ============================== ValueEdit ================================
    // =========================================================================

    function addValueEditor(inlet, inletData, root, valueHolder, valueElm) {
        var editor = quickElm('div', 'rpd-value-editor');
        var valueIn = Kefir.emitter(),
            disableEditor = Kefir.emitter();
        inletData.disableEditor = disableEditor;
        var valueOut = inlet.render.html.edit(editor, inlet, valueIn);
        valueOut.onValue(function(value) { inlet.receive(value); });
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
        valueHolder.classList.add('rpd-editor-disabled');
        valueHolder.appendChild(editor);
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
                    var ghost = constructLink(pivot.x, pivot.y, pos.x, pos.y,
                                              config.linkWidth);
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
                    var ghost = constructLink(pivot.x, pivot.y, pos.x, pos.y,
                                              config.linkWidth);
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

    // ============================== BodyInlets ===============================
    // =========================================================================

    function subscribeUpdates(node, subscriptions) {
        if (!subscriptions) return;
        for (var alias in subscriptions) {
            (function(subscription, alias) {
                node.event['inlet/add']
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

    // ============================== DragNDrop ================================
    // =========================================================================

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
                selectedLinks = selectLinks(node, links,
                   function(linkData) {
                       linkData.elm.style.zIndex = LINKDRAG_LAYER;
                   });
            }
            updateLinks(node, selectedLinks);
        });
    }

    // ============================== NodeList =================================
    // =========================================================================

    function addNodeList(root, registeredNodeTypes, descriptions) {
        var toolkits = {},
            typesList = [];

        var toolkitElements = {},
            nodeTitleElements = {},
            nodeDescriptionElements = {};

        var nodeType, toolkit, typeId, typeName;
        for (nodeType in registeredNodeTypes) {
            typeId = nodeType.split('/');
            toolkit = typeId[0]; typeName = typeId[1];
            typesList.push([ typeId, toolkit, typeName ]);
            if (!toolkits[toolkit]) toolkits[toolkit] = {};
            toolkits[toolkit][typeName] = registeredNodeTypes[nodeType];
        }

        var listRoot = quickElm('dl', 'rpd-nodelist');

        var nodeTypes, typeDef;
        var toolkitHolder, toolkitElm, toolkitNameElm, nodeTitleElm, nodeDescElm, addButton;
        for (toolkit in toolkits) {
            toolkitNameElm = quickElmVal('dd', 'rpd-toolkit-name', toolkit);
            listRoot.appendChild(toolkitNameElm);
            toolkitHolder = quickElm('dt');
            toolkitElm = quickElm('dl', 'rpd-toolkit');
            nodeTypes = toolkits[toolkit];
            for (typeName in nodeTypes) {
                nodeType = toolkit + '/' + typeName;
                nodeTitleElm = quickElmVal('dd', 'rpd-node-title', typeName);
                addButton = quickElmVal('span', 'rpd-add-node', '+ Add');
                nodeTitleElm.appendChild(addButton);
                nodeTitleElements[nodeType] = nodeTitleElm;
                nodeDescElm = quickElmVal('dd', 'rpd-node-description', descriptions[nodeType] || '[No Description]');
                nodeDescriptionElements[nodeType] = nodeDescElm;
                toolkitElm.appendChild(nodeTitleElm);
                toolkitElm.appendChild(nodeDescElm);

                nodeDescElm.classList.add('rpd-collapsed');
                (function(nodeDescElm) {
                    addClickSwitch(nodeTitleElm,
                        function() { nodeDescElm.classList.add('rpd-collapsed') },
                        function() { nodeDescElm.classList.remove('rpd-collapsed'); });
                })(nodeDescElm);

                (function(nodeType) {
                    Kefir.fromEvent(addButton, 'click')
                         .tap(stopPropagation)
                         .onValue(function() {
                             (new Rpd.Node(nodeType));
                         });
                })(nodeType);

            }
            toolkitElements[toolkit] = toolkitHolder;
            toolkitHolder.appendChild(toolkitElm);
            listRoot.appendChild(toolkitHolder);

            (function(toolkitElm) {
                addClickSwitch(toolkitNameElm,
                               function() { toolkitElm.classList.add('rpd-collapsed') },
                               function() { toolkitElm.classList.remove('rpd-collapsed'); },
                               true);
            })(toolkitElm);
        }

        root.appendChild(listRoot);

        var collapseButton = quickElm('span', 'rpd-collapse-nodelist');
        collapseButton.innerText = collapseButton.textContent = '>>';
        addClickSwitch(collapseButton,
                       function() { collapseButton.classList.add('rpd-collapsed');
                                    collapseButton.innerText = collapseButton.textContent = '<<';
                                    listRoot.classList.add('rpd-collapsed'); },
                       function() { collapseButton.classList.remove('rpd-collapsed');
                                    collapseButton.innerText = collapseButton.textContent = '>>';
                                    listRoot.classList.remove('rpd-collapsed'); },
                       true);

        root.appendChild(collapseButton);
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
    if (cls) elm.className = cls;
    elm.innerText = elm.textContent = value;
    return elm;
}

function valueErrorEffect(storage, elmHolder, duration) {
    elmHolder.classList.add("rpd-error");
    if (storage.errRemoveTimeout) clearTimeout(storage.errRemoveTimeout);
    storage.errRemoveTimeout = setTimeout(function() {
        elmHolder.classList.remove("rpd-error");
        storage.errRemoveTimeout = null;
    }, duration || 1);
}

function valueUpdateEffect(storage, elmHolder, duration) {
    elmHolder.classList.remove("rpd-stale");
    elmHolder.classList.add("rpd-fresh");
    if (storage.updRemoveTimeout) clearTimeout(storage.updRemoveTimeout);
    storage.updRemoveTimeout = setTimeout(function() {
        elmHolder.classList.remove("rpd-fresh");
        elmHolder.classList.add("rpd-stale");
        storage.updRemoveTimeout = null;
    }, duration || 1);
}

function constructLink(x0, y0, x1, y1, w) {
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
    if (w) linkElm.style.height = w + 'px';
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

function selectLinks(node, links, onEach) {
    var selectedLinks = [], linkData, link;
    for (var id in links) {
        if (!links[id]) continue;
        linkData = links[id];
        link = linkData.link;
        if ((link.inlet.node.id  === node.id) ||
            (link.outlet.node.id === node.id)) {
                selectedLinks.push(linkData);
                if (onEach) onEach(linkData, link);
        }
    }
    return selectedLinks;
}

var default_width = 1, // in boxes
    default_height = 1, // in boxes
    default_x_margin = 0.5,  // in boxes
    default_y_margin = 1, // in boxes
    default_limits = [ 1000, 1000 ]; // in pixels

var node_rects = [];

function applyNextNodeRect(node, nodeBox, nodeElm, boxSize, limits) {
    var width =  (node.def.width  || default_width)  * boxSize[0],
        height = (node.def.height || default_height) * boxSize[1];
    var last_rect = (node_rects.length ? node_rects[node_rects.length-1] : null);
    var new_rect = [ /* x */ last_rect ? last_rect[0] : 0,
                     /* y */ last_rect ? (last_rect[1] + last_rect[3] + (default_y_margin * boxSize[1])) : 0,
                     width,
                     height ];
    if ((new_rect[1] + boxSize[1]) > limits[1]) {
        new_rect[0] = new_rect[0] + width + (default_x_margin * boxSize[0]);
        new_rect[1] = 0;
    }
    node_rects.push(new_rect);
    // relative positioning
    nodeBox.style.left = Math.floor(new_rect[0]) + 'px';
    nodeBox.style.top  = Math.floor(new_rect[1]) + 'px';
    nodeElm.style.minWidth  = Math.floor(new_rect[2]) + 'px';
    nodeElm.style.minHeight = Math.floor(new_rect[3]) + 'px';
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
