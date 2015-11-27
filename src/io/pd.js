;(function(global) {
  "use strict";

// ================================= EXPORT =================================

Rpd.export.pd = function(name) {
    var spec = exportSpec;

    var commands = [];
    var lines = [];

    var moves = {};

    Rpd.events.onValue(function() {

    });

    return function() {
        return lines.join('\r\n');
    };
}

// ================================= IMPORT =================================

Rpd.import.pd = function(lines) {

    var WebPd = global.Pd || null;

    if (!WebPd) throw new Error('WebPd is required to import PD files');

    var patchData = WebPd.getPatchData(lines);
    var webPdPatch = WebPd.loadPatch(patchData);

    console.log(patchData);

    /*var nodes = [],
        objects = [],
        arrays = [];

    var nodeToInlets = {},
        nodeToOutlets = {}; */

    var rootPatch = Rpd.addPatch('PD').enter(); // why entering the patch required here?
    var model = new PdModel(rootPatch, webPdPatch); // it is wrong to do it here as well
                                                    // since PdModel is defined for toolkit, not the import

    /* rootPatch.model = model;
    rootPatch.webPdPatch = webPdPatch;

    function pushInlet(update) {
        if (!nodeToInlets[update.node.id]) nodeToInlets[update.node.id] = [];
        nodeToInlets[update.node.id].push(update.inlet);
    }
    function pushOutlet(update) {
        if (!nodeToOutlets[update.node.id]) nodeToOutlets[update.node.id] = [];
        nodeToOutlets[update.node.id].push(update.outlet);
    }
    function popInlet(update) { nodeToInlets[update.node.id].pop(); }
    function popOutlet(update) { nodeToOutlets[update.node.id].pop(); }

    function eventIs(type) { return function(event) { return event.type === type; } };

    function attachWebPdObject(node, webPdIdx) {
        if (webPdPatch) {
            node.webPdPatch = webPdPatch;
            node.webPdObject = webPdPatch.objects[webPdIdx];
        }
    }

    var addInletStream = rootPatch.events.filter(eventIs('node/add-inlet'))
                                         .filter(function(event) { return !event.inlet.hidden; });
    var addOutletStream = rootPatch.events.filter(eventIs('node/add-outlet'));
    var removeInletStream = rootPatch.events.filter(eventIs('node/remove-inlet'));
    var removeOutletStream = rootPatch.events.filter(eventIs('node/remove-outlet'));
    addInletStream.onValue(pushInlet); addOutletStream.onValue(pushOutlet);
    removeInletStream.onValue(popInlet); removeOutletStream.onValue(popOutlet);

    var node;

    lines.split('\n').forEach(function(line) {
        if (!line.length) return;
        var rest = line.slice(1, line.length-1).split(' ');
        if (rest[0] === 'A') {
            arrays.push(rest);
        } else if (rest[0] === 'N') {
            // TODO
        } else if (rest[0] === 'X') {

            if (rest[1] === 'connect') {
                var fromNode = objects[rest[2]],
                    toNode = objects[rest[4]];
                if (nodeToOutlets[fromNode.id] && nodeToInlets[toNode.id]) {
                    var outlet = nodeToOutlets[fromNode.id][rest[3]],
                        inlet = nodeToInlets[toNode.id][rest[5]];
                    if (inlet && outlet) { outlet.connect(inlet); }
                    else { console.error('Failed to connect object ' + rest[2] + ' to object ' + rest[4]); };
                } else { console.error('Failed to connect object ' + rest[2] + ' to object ' + rest[4]); };
            } else if (rest[1] === 'restore') {
                // TODO
            } else if (rest[1] === 'floatatom') {
                node = rootPatch.addNode('pd/number');
                node.move(parseInt(rest[2]), parseInt(rest[3]));
                model.configureSymbol(node, rest.slice(4));
                attachWebPdObject(node, objects.length);
                objects.push(node);
            } else if (rest[1] === 'symbolatom') {
                node = rootPatch.addNode('pd/symbol');
                node.move(parseInt(rest[2]), parseInt(rest[3]));
                model.configureSymbol(node, rest.slice(4));
                attachWebPdObject(node, objects.length);
                objects.push(node);
            } else if (rest[1] === 'msg') {
                node = rootPatch.addNode('pd/message');
                node.move(parseInt(rest[2]), parseInt(rest[3]));
                node.inlets['receive'].receive(rest.slice(4));
                attachWebPdObject(node, objects.length);
                objects.push(node);
            } else if (rest[1] === 'text') {
                node = rootPatch.addNode('pd/comment');
                node.move(parseInt(rest[2]), parseInt(rest[3]));
                node.inlets['text'].receive(rest[4]);
                attachWebPdObject(node, objects.length);
                objects.push(node);
            } else if (rest[1] === 'obj') {

                if (rest[4] === 'bng') {
                    node = rootPatch.addNode('pd/bang');
                    node.move(parseInt(rest[2]), parseInt(rest[3]));
                } else if (rest[4] === 'tgl') {
                    node = rootPatch.addNode('pd/toggle');
                    node.move(parseInt(rest[2]), parseInt(rest[3]));
                } else if (rest[4] === 'nbx') {

                } else if (rest[4] === 'vsl') {

                } else if (rest[4] === 'hsl') {

                } else if (rest[4] === 'vradio') {

                } else if (rest[4] === 'hradio') {

                } else if (rest[4] === 'vu') {

                } else if (rest[4] === 'cnv') {

                } else {
                    node = rootPatch.addNode('pd/object');
                    node.move(parseInt(rest[2]), parseInt(rest[3]));
                    model.requestResolve(node, rest.slice(4));
                }
                if (node) attachWebPdObject(node, objects.length);
                objects.push(node || {});

            } else {
                // TODO
            }

        }

        if (node) {
            nodes.push(node);
        }

    });

    addInletStream.offValue(pushInlet); addOutletStream.offValue(pushOutlet);
    removeInletStream.offValue(popInlet); removeOutletStream.offValue(popOutlet); */

    return rootPatch;

}

}(this));
