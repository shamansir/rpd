;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

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

    var patchData = WebPd.parsePatch(lines);
    var webPdPatch = WebPd.loadPatch(patchData);

    var nodes = [];

    var rootPatch = Rpd.addPatch('PD');
    var model = new PdModel(rootPatch, webPdPatch); // it is wrong to do it here as well
                                                    // since PdModel is defined for toolkit,
                                                    // not the import
    rootPatch.model = model;

    var nodeToInlets = {},
        nodeToOutlets = {},
        nodeToProto = {};

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

    var addInletStream = rootPatch.events.filter(eventIs('node/add-inlet'))
                                         .filter(function(event) { return !event.inlet.hidden; });
    var addOutletStream = rootPatch.events.filter(eventIs('node/add-outlet'));
    var removeInletStream = rootPatch.events.filter(eventIs('node/remove-inlet'));
    var removeOutletStream = rootPatch.events.filter(eventIs('node/remove-outlet'));

    addInletStream.onValue(pushInlet); addOutletStream.onValue(pushOutlet);
    removeInletStream.onValue(popInlet); removeOutletStream.onValue(popOutlet);

    var cmdToType = PdModel.COMMAND_TO_TYPE;
    patchData.nodes.forEach(function(pdNode, idx) {
        var proto = pdNode.proto,
            nodeType = cmdToType[proto];
        var node = rootPatch.addNode(nodeType || 'wpd/object');
        nodeToProto[node.id] = proto;
        node.move(pdNode.layout.x, pdNode.layout.y);
        // node.webPdObject = webPdPatch.objects[idx];
        model.markResolvedAndApply(node, proto, pdNode.args, webPdPatch.objects[idx]);
        nodes.push(node);
    });

    patchData.connections.forEach(function(connection) {
        var fromNodeIdx = connection.source.id,
            toNodeIdx = connection.sink.id;
        var outletIdx = connection.source.port,
            inletIdx = connection.sink.port;
        var fromNode = nodes[fromNodeIdx],
            toNode = nodes[toNodeIdx];
        if (nodeToOutlets[fromNode.id] && nodeToInlets[toNode.id]) {
            var outlet = nodeToOutlets[fromNode.id][outletIdx],
                inlet = nodeToInlets[toNode.id][inletIdx];
            if (!inlet.allows(outlet)) {
                // FIXME: actually, a dirty hack
                console.warn('Different types of channels were encountered while connecting',
                             'from', nodeToProto[fromNode.id], 'outlet', outletIdx, outlet.type,
                             'to', nodeToProto[toNode.id], 'inlet', inletIdx, inlet.type,
                             ', rewriting the outlet type');
                outlet.type = inlet.type;
            }
            if (inlet && outlet) { outlet.connect(inlet); }
            else { console.error('Failed to connect object ' + fromNodeIdx + ' to object ' + toNodeIdx); };
        } else { console.error('Failed to connect object ' + fromNodeIdx + ' to object ' + toNodeIdx); };
    });

    addInletStream.offValue(pushInlet); addOutletStream.offValue(pushOutlet);
    removeInletStream.offValue(popInlet); removeOutletStream.offValue(popOutlet);

    model.listenForNewNodes();

    return rootPatch;

}

}(this));
