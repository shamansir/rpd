;(function(global) {
  "use strict";

Rpd.import.json = function(json) {

    var spec = makeImportSpec();

    if ((json.version !== Rpd.VERSION) && console && console.warn) {
        console.warn('JSON version', json.version, 'and RPD Version',
                                     Rpd.VERSION, 'are not equal to each other');
    }

    var commands = json.commands;

    for (var i = 0; i < commands.length; i++) {
        if (spec[commands[i].command]) spec[commands[i].command](commands[i]);
    }

}

Rpd.export.json = function(name) {
    var spec = exportSpec;

    var commands = [];
    var json = { name: name || 'Untitled',
                 kind: 'RPD Network',
                 version: Rpd.VERSION,
                 commands: commands };

    Rpd.events.filter(function(update) { return spec[update.type]; })
              .onValue(function(update) {
                  commands.push(spec[update.type](update));
              });

    return json;
}

var exportSpec = {
    'network/add-patch': function(update) {
        var patch = update.patch;
        return { command: 'network/add-patch', patchName: patch.name, patchId: patch.id };
    },
    'patch/enter': function(update) {
        return { command: 'patch/enter', patchId: update.patch.id };
    },
    'patch/exit': function(update) {
        return { command: 'patch/exit', patchId: update.patch.id };
    },
    'patch/set-inputs': function(update) {
        var patch = update.patch;
        var srcInputs = update.inputs,
            inputs = [];
        for (var i = 0; i < srcInputs.length; i++) { inputs.push(srcInputs[i].id); }
        return { command: 'patch/set-inputs', patchId: update.patch.id, inputs: inputs };
    },
    'patch/set-outputs': function(update) {
        var patch = update.patch;
        var srcOutputs = update.outputs,
            outputs = [];
        for (var i = 0; i < srcOutputs.length; i++) { outputs.push(srcOutputs[i].id); }
        return { command: 'patch/set-outputs', patchId: update.patch.id, outputs: outputs };
    },
    'patch/refer': function(update) {
        return { command: 'patch/refer', patchId: update.patch.id, targetPatchId: update.target.id, nodeId: update.node.id };
    },
    'patch/add-node': function(update) {
        var node = update.node;
        return { command: 'patch/add-node', nodeType: node.type, nodeName: node.name, nodeId: node.id };
    },
    'patch/remove-node': function(update) {
        return { command: 'patch/remove-node', nodeId: update.node.id };
    },
    'node/turn-on': function(update) {
        return { command: 'node/turn-on', nodeId: update.node.id };
    },
    'node/turn-off': function(update) {
        return { command: 'node/turn-off', nodeId: update.node.id };
    },
    'node/add-inlet': function(update) {
        var inlet = update.inlet;
        return { command: 'node/add-inlet', nodeId: update.node.id,
                 inletType: inlet.type, inletAlias: inlet.alias, inletName: inlet.name };
    },
    'node/remove-inlet': function(update) {
        return { command: 'node/remove-inlet', nodeId: update.node.id, inletId: update.inlet.id };
    },
    'node/add-outlet': function(update) {
        var outlet = update.outlet;
        return { command: 'node/add-inlet', nodeId: update.node.id,
                 outletType: outlet.type, outletAlias: outlet.alias, outletName: outlet.name };
    },
    'node/remove-outlet': function(update) {
        return { command: 'node/remove-inlet', nodeId: update.node.id, outletId: update.outlet.id };
    },
    'outlet/connect': function(update) {
        var link = update.link;
        return { command: 'outlet/connect', outletId: update.outlet.id, inletId: link.inlet.id,
                 linkType: link.type, linkId: link.id }; /* TODO: adapter? */
    },
    'outlet/disconnect': function(update) {
        return { command: 'outlet/disconnect', linkId: update.link.id };
    },
    'link/enable': function(update) {
        return { command: 'link/enable', linkId: update.link.id };
    },
    'link/disable': function(update) {
        return { command: 'link/disable', linkId: update.link.id };
    }
};

function makeImportSpec() {
    var patches = {},
        nodes = {},
        inlets = {},
        outlets = {},
        links = {};

    return {

    }
}

}(this));
