(function() {

var QUARTZ_LAYOUT = 'quartz',
    PD_LAYOUT = 'pd';

var default_config = {
    debug: false,
    layout: QUARTZ_LAYOUT
};

// ============================= HtmlRenderer ==================================
// =============================================================================

function HtmlRenderer(user_config) {

    var nodes, links, connectors;

    var config = mergeConfig(user_config, default_config);

    var createGhost = Kefir.emitter(),
        moveGhost = Kefir.emitter(),
        removeGhost = Kefir.emitter(),
        doingGhost = Kefir.merge([createGhost.mapTo(true), removeGhost.mapTo(false)]).toProperty(false);

    var createLink = Kefir.emitter(),
        removeLink = Kefir.emitter(),
        linkResolved = Kefir.emitter();

    return {

        // ============================ model/new ==============================

        'model/new': function(root, update) {

            nodes = {}; links = {}; connectors = {};

            if (root.classList) {
                root.classList.add('rpd-model');
                if (config.debug) root.classList.add('rpd-debug');
                if (config.layout) root.classList.add('rpd-layout-' + config.layout);
            }

            var currentGhost = null,
                currentGhostPivot = null;

            createGhost.onValue(function(value) {
                var pivot = value.pivot, pt = value.pt;
                currentGhostPivot = pivot;
                currentGhost = constructLink(pivot.x, pivot.y, pt.x, pt.y);
                root.appendChild(currentGhost);
            }).log('create-ghost');
            moveGhost.onValue(function(pt) {
                var pivot = currentGhostPivot;
                rotateLink(currentGhost, pivot.x, pivot.y, pt.x, pt.y);
            }).log('move-ghost');
            removeGhost.filter(function() { return currentGhost })
                       .onValue(function() {
                root.removeChild(currentGhost);
                currentGhost = null;
                currentGhostPivot = null;
            }).log('remove-ghost');

            createLink.onValue(function(value) {
                var outlet = value.outlet, inlet = value.inlet;
                outlet.connect(inlet);
            }).log('create-link');
            removeLink.onValue(function(link) {
                link.disconnect();
                root.removeChild(links[link.id].elm);
                links[link.id] = null;
            }).log('remove-link');

        },

        // ============================ node/add ===============================

        'node/add': function(root, update) {

            var node = update.node;

            var nodeBox = quickElm('div', 'rpd-node-box');
            var nodeElm = quickElm('table', 'rpd-node');

            var inletsTrg, outletsTrg;

            if (config.layout == QUARTZ_LAYOUT) {

                var headElm = quickElm('thead', 'rpd-title');
                var headRow = quickElm('tr');

                if (node.def.icon) {
                    // TODO
                }

                var headCell = quickElm('th');
                headCell.setAttribute('colspan', 3);
                headCell.appendChild(quickElmVal('span', 'rpd-name', node.name));
                if (config.debug) headCell.appendChild(quickElmVal('span', 'rpd-type', node.type));
                headRow.appendChild(headCell);
                headElm.appendChild(headRow);

                var contentElm = quickElm('tbody', 'rpd-content');
                var contentRow = quickElm('tr');

                var inletsCell = quickElm('td', 'rpd-inlets');
                var inletsTable = quickElm('table');
                var inletsBody = quickElm('tbody');

                inletsTrg = inletsBody;

                inletsTable.appendChild(inletsBody);
                inletsCell.appendChild(inletsTable);

                var bodyCell = quickElm('td', 'rpd-body');
                var bodyTable = quickElm('table');

                // TODO

                bodyCell.appendChild(bodyTable);

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

            } else if (config.layout == PD_LAYOUT) {

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
                if (config.debug) headCell.appendChild(quickElmVal('span', 'rpd-type', node.type));
                contentRow.appendChild(headCell);

                var bodyCell = quickElm('td', 'rpd-body');
                var bodyTable = quickElm('table');

                // TODO add body

                bodyCell.appendChild(bodyTable);
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

            }

            if (nodeElm.classList) nodeElm.classList.add('rpd-'+node.type.replace('/','-'));

            nodes[node.id] = { elm: nodeElm,
                               inletsTrg: inletsTrg, outletsTrg: outletsTrg,
                               inlets: {}, outlets: {},
                               inletsNum: 0, outletsNum: 0 };

            applyNextNodeRect(node, nodeBox);

            nodeBox.appendChild(nodeElm);

            root.appendChild(nodeBox);

        },

        // ============================ node/process ===========================

        'node/process': function(root, update) {},

        // ============================ node/remove ============================

        'node/remove': function(root, update) {},

        // ============================ inlet/add ==============================

        'inlet/add': function(root, update) {

            var inlet = update.inlet;

            var nodeData = nodes[inlet.node.id];
            var inletsTrg = nodeData.inletsTrg;

            var inletElm, valueElm, connectorElm;

            if (config.layout == QUARTZ_LAYOUT) {

                inletElm = quickElm('tr', 'rpd-inlet rpd-stale');
                connectorElm = quickElm('td', 'rpd-connector');
                valueElm = quickElm('td', 'rpd-value');
                inletElm.appendChild(connectorElm);
                inletElm.appendChild(valueElm);
                inletElm.appendChild(quickElmVal('td', 'rpd-name', inlet.name));
                if (config.debug) inletElm.appendChild(quickElmVal('td', 'rpd-type', inlet.type));

            } else if (config.layout == PD_LAYOUT) {

                inletElm = quickElm('td', 'rpd-inlet rpd-stale');
                connectorElm = quickElm('span', 'rpd-connector');
                valueElm = quickElm('span', 'rpd-value');
                inletElm.appendChild(connectorElm);
                inletElm.appendChild(quickElmVal('span', 'rpd-name', inlet.name));
                inletElm.appendChild(valueElm);
                if (config.debug) inletElm.appendChild(quickElmVal('span', 'rpd-type', inlet.type));

            }

            // TODO: add editor

            if (inletElm.classList) inletElm.classList.add('rpd-'+inlet.type.replace('/','-'));

            inletsTrg.appendChild(inletElm);

            connectors[inlet.id] = connectorElm;

            var inletData = { elm: inletElm, valueElm: valueElm,
                                             connectorElm: connectorElm,
                              link: null };

            nodeData.inlets[inlet.id] = inletData;

            nodeData.inletsNum++;

            Kefir.fromEvent(connectorElm, 'click').onValue(function(evt) {
                evt.preventDefault();
                evt.stopPropagation();
            });

            Kefir.fromEvent(connectorElm, 'click').filterBy(doingGhost)
                                                  .zip(createGhost)
                                                  .map(function(value) { return value[1].outlet; })
                                                  .onValue(function(outlet) {
                console.log('inlet-ghost');
                removeGhost.emit();
                if (inletData.link) {
                    var link = inletData.link;
                    inletData.link = null;
                    removeLink.emit(link);
                }
                createLink.emit({ inlet: inlet, outlet: outlet });
                linkResolved.emit();
            });

            Kefir.fromEvent(connectorElm, 'click').filterBy(doingGhost.not())
                                                  .filter(function() { return inletData.link; })
                                                  .map(function(evt) { return { x: evt.clientX, y: evt.clientY }})
                                                  .flatMap(function(pt) {
                console.log('inlet-no-ghost');
                var srcOutlet = inletData.link.outlet;
                var link = inletData.link;
                inletData.link = null;
                removeLink.emit(link);
                var connectorBounds = connectors[srcOutlet.id].getBoundingClientRect();
                createGhost.emit({ outlet: srcOutlet,
                                   pivot: { x: connectorBounds.left,
                                            y: connectorBounds.top },
                                   pt: pt });
                return Kefir.fromEvent(root, 'mousemove').takeUntilBy(
                    Kefir.fromEvent(root, 'click')
                         .merge(Kefir.fromEvent(connectorElm, 'click'))
                         .merge(linkResolved)
                ).onEnd(function() {
                    console.log('inlet-no-ghost-rm');
                    removeGhost.emit();
                });
            }).onValue(function(pt) {
                console.log('mm-inlet');
                moveGhost.emit(pt);
            });

            /* Kefir.fromEvent(connectorElm, 'click').flatMap(function(evt) {
                evt.preventDefault();
                evt.stopPropagation();
                if (inletData.link) {
                    inletData.link.disconnect();
                    root.removeChild(links[inletData.link.id].elm);
                    if (linkGhost) {
                        root.removeChild(linkGhost);
                        linkGhost = null;
                        linkSrc.connect(inlet);
                        inletData.link = null;
                        linkResolved.emit();
                        return Kefir.never();
                    } else {
                        linkGhostPos = connectorElm.getBoundingClientRect();
                        linkGhost = createLink(linkGhostPos.left, linkGhostPos.top,
                                               evt.clientX, evt.clientY);
                        linkSrc = inletData.link.outlet;
                        root.appendChild(linkGhost);
                    }
                }
                return Kefir.fromEvent(root, 'mousemove').takeUntilBy(
                    Kefir.fromEvent(root, 'click')
                         .merge(Kefir.fromEvent(connectorElm, 'click'))
                ).onEnd(function() {
                    if (linkGhost) {
                        root.removeChild(linkGhost);
                        linkGhost = null;
                    }
                });
            }).onValue(function(evt) {
                rotateLink(linkGhost, linkGhostPos.left, linkGhostPos.top,
                                      evt.clientX, evt.clientY);
            }); */

        },

        // ============================ inlet/remove ===========================

        'inlet/remove': function(root, update) {},

        // ============================ inlet/update ===========================

        'inlet/update': function(root, update) {

            var inlet = update.inlet;

            var nodeData = nodes[inlet.node.id];
            var inletData = nodeData.inlets[inlet.id];
            var inletElm = inletData.elm;

            var valueElm = inletData.valueElm;
            valueElm.innerText = valueElm.textContent = update.value;
            valueUpdateEffect(inletData, inletElm);

        },

        // ============================ outlet/add =============================

        'outlet/add': function(root, update) {

            var outlet = update.outlet;

            var nodeData = nodes[outlet.node.id];
            var outletsTrg = nodeData.outletsTrg;

            var outletElm, valueElm, connectorElm;

            if (config.layout == QUARTZ_LAYOUT) {

                outletElm = quickElm('tr', 'rpd-outlet rpd-stale');
                connectorElm = quickElm('td', 'rpd-connector');
                valueElm = quickElm('td', 'rpd-value');

                if (config.debug) outletElm.appendChild(quickElmVal('td', 'rpd-type', outlet.type));
                outletElm.appendChild(quickElmVal('td', 'rpd-name', outlet.name));
                outletElm.appendChild(valueElm);
                outletElm.appendChild(connectorElm);

            } else if (config.layout == PD_LAYOUT) {

                outletElm = quickElm('td', 'rpd-outlet rpd-stale');
                connectorElm = quickElm('span', 'rpd-connector');
                valueElm = quickElm('span', 'rpd-value');
                outletElm.appendChild(connectorElm);
                outletElm.appendChild(quickElmVal('span', 'rpd-name', outlet.name));
                outletElm.appendChild(valueElm);
                if (config.debug) outletElm.appendChild(quickElmVal('span', 'rpd-type', outlet.type));

            }

            // TODO: add editor

            if (outletElm.classList) outletElm.classList.add('rpd-'+outlet.type.replace('/','-'));

            outletsTrg.appendChild(outletElm);

            connectors[outlet.id] = connectorElm;

            var outletData = { elm: outletElm,
                               valueElm: valueElm,
                               connectorElm: connectorElm,
                               links: [] };

            nodeData.outlets[outlet.id] = outletData;

            nodeData.outletsNum++;

            Kefir.fromEvent(connectorElm, 'click').onValue(function(evt) {
                evt.preventDefault();
                evt.stopPropagation();
            });

            Kefir.fromEvent(connectorElm, 'click').filterBy(doingGhost)
                                                  .onValue(function() {
                console.log('outlet-ghost');
                removeGhost.emit();
            });

            Kefir.fromEvent(connectorElm, 'click').filterBy(doingGhost.not())
                                                  .map(function(evt) { return { x: evt.clientX, y: evt.clientY }})
                                                  .flatMap(function(pt) {
                console.log('outlet-no-ghost');
                var connectorBounds = connectorElm.getBoundingClientRect();
                createGhost.emit({ outlet: outlet,
                                   pivot: { x: connectorBounds.left,
                                            y: connectorBounds.top },
                                   pt: pt });
                return Kefir.fromEvent(root, 'mousemove').takeUntilBy(
                    Kefir.fromEvent(root, 'click')
                         .merge(Kefir.fromEvent(connectorElm, 'click'))
                         .merge(linkResolved)
                ).onEnd(function() {
                    console.log('outlet-no-ghost-rm');
                    removeGhost.emit();
                });
            }).onValue(function(pt) {
                console.log('mm-outlet');
                moveGhost.emit(pt);
            });

            /* Kefir.fromEvent(connectorElm, 'click').flatMap(function(evt) {
                evt.preventDefault();
                evt.stopPropagation();
                if (linkGhost) return Kefir.never();
                linkGhostPos = connectorElm.getBoundingClientRect();
                linkGhost = createLink(linkGhostPos.left, linkGhostPos.top,
                                       evt.clientX, evt.clientY);
                linkSrc = outlet;
                root.appendChild(linkGhost);
                return Kefir.fromEvent(root, 'mousemove').takeUntilBy(
                    Kefir.fromEvent(root, 'click')
                         .merge(Kefir.fromEvent(connectorElm, 'click'))
                         .merge(linkResolved)
                ).onEnd(function() {
                    if (linkGhost) {
                        root.removeChild(linkGhost);
                        linkGhost = null;
                    }
                });
            }).onValue(function(evt) {
                rotateLink(linkGhost, linkGhostPos.left, linkGhostPos.top,
                                      evt.clientX, evt.clientY);
            }); */

        },

        // ============================ outlet/remove ==========================

        'outlet/remove': function(root, update) {},

        // ============================ outlet/update ==========================

        'outlet/update': function(root, update) {

            var outlet = update.outlet;

            var nodeData = nodes[outlet.node.id];
            var outletData = nodeData.outlets[outlet.id];
            var outletElm = outletData.elm;

            var valueElm = outletData.valueElm;
            valueElm.innerText = valueElm.textContent = update.value;
            valueUpdateEffect(outletData, outletElm);

        },

        // ============================ outlet/connect =========================

        'outlet/connect': function(root, update) {

            var link = update.link;
            var outlet = link.outlet;
            var inlet  = link.inlet;

            var outletData = nodes[outlet.node.id].outlets[outlet.id];
            var inletData = nodes[inlet.node.id].inlets[inlet.id];

            var outletConnector = outletData.connectorElm;
            var inletConnector  = inletData.connectorElm;

            outletData.links.push(link);
            if (inletData.link) throw new Error('Inlet is already connected to a link');
            inletData.link = link;

            var p0 = outletConnector.getBoundingClientRect(),
                p1 = inletConnector.getBoundingClientRect();
            var linkElm = constructLink(p0.left, p0.top, p1.left, p1.top);

            links[link.id] = { elm: linkElm };

            root.appendChild(linkElm);

        },

        // ============================ link/adapt =============================

        'link/adapt': function(root, update) {},

        // ============================ link/error =============================

        'link/error': function(root, update) {}

    }; // return

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
    if (elmHolder.classList) {
        elmHolder.classList.remove("rpd-stale");
        elmHolder.classList.add("rpd-fresh");
        if (storage.removeTimeout) clearTimeout(storage.removeTimeout);
        storage.removeTimeout = setTimeout(function() {
            elmHolder.classList.remove("rpd-fresh");
            elmHolder.classList.add("rpd-stale");
            storage.removeTimeout = null;
        }, 1000);
    }
}

function constructLink(x0, y0, x1, y1) {
    var distance = Math.sqrt(((x0 - x1) * (x0 - x1)) +
                             ((y0 - y1) * (y0 - y1)));
    var angle = Math.atan2(y1 - y0, x1 - x0);

    var linkElm = quickElm('span','rpd-link');
    linkElm.style.position = 'absolute';
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
    var width = node.def.minWidth || default_width,
        height = node.def.minHeight || default_height,
        limits = limits || default_limits;
    /*var w_sum = 0, h_sum = 0;
    for (var i = 0, il = node_rects.length; i < il; i++) {
        node_rects[i]
    } TODO */
    var new_rect;
    if (node_rects.length) {
        var last_rect = node_rects[node_rects.length-1];
        new_rect = [ last_rect[0], last_rect[1] + last_rect[3] + default_y_margin, width, height ];
    } else {
        new_rect = [ 0, 0, width, height ];
    }
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
