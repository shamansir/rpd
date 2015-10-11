;(function(global) {
  "use strict";

Rpd.export.json = function(name) {
    var spec = exportSpec;

    var commands = [];
    var json = { name: name || 'Untitled',
                 kind: 'RPD Network',
                 version: Rpd.VERSION,
                 commands: commands };

    var moves = {};

    var knownEvents = Rpd.events.filter(function(update) { return spec[update.type]; });

    var pushCommand = function(update) {
        if (update.type === 'node/move') {
            moves[update.node.id] = spec['node/move'](update);
        } else {
            commands.push(spec[update.type](update));
        }
    };

    function storeMoves() {
        Object.keys(moves).forEach(function(nodeId) {
            commands.push(moves[nodeId]);
        });
    };

    knownEvents.onValue(pushCommand);

    return function() {
        knownEvents.offValue(pushCommand);
        storeMoves();
        return json;
    };
}

Rpd.import.json = function(json) {
    var spec = makeImportSpec();

    if ((json.version !== Rpd.VERSION) && console && console.warn) {
        console.warn('JSON version', json.version, 'and RPD Version',
                                     Rpd.VERSION, 'are not equal to each other');
    }

    var commands = json.commands;

    commands.forEach(function(command) {
        if (command.event) spec[command.event](command);
    });
}

// ================================= EXPORT =================================

var exportSpec = {
    'network/add-patch': function(update) {
        var patch = update.patch;
        return { event: 'network/add-patch', patchName: patch.name, patchId: patch.id };
    },
    'patch/enter': function(update) {
        return { event: 'patch/enter', patchId: update.patch.id };
    },
    'patch/exit': function(update) {
        return { event: 'patch/exit', patchId: update.patch.id };
    },
    'patch/set-inputs': function(update) {
        var patch = update.patch;
        var srcInputs = update.inputs,
            inputs = [];
        srcInputs.forEach(function(srcInput) { inputs.push(srcInput.id); });
        return { event: 'patch/set-inputs', patchId: update.patch.id, inputs: inputs };
    },
    'patch/set-outputs': function(update) {
        var patch = update.patch;
        var srcOutputs = update.outputs,
            outputs = [];
        srcOutputs.forEach(function(srcOutput) { outputs.push(srcOutput.id); });
        return { event: 'patch/set-outputs', patchId: update.patch.id, outputs: outputs };
    },
    'patch/project': function(update) {
        return { event: 'patch/project', patchId: update.patch.id, targetPatchId: update.target.id, nodeId: update.node.id };
    },
    'patch/add-node': function(update) {
        var node = update.node;
        return { event: 'patch/add-node', patchId: node.patch.id, nodeType: node.type, nodeName: node.name, nodeId: node.id };
    },
    'patch/remove-node': function(update) {
        return { event: 'patch/remove-node', patchId: update.patch.id, nodeId: update.node.id };
    },
    'node/turn-on': function(update) {
        return { event: 'node/turn-on', nodeId: update.node.id };
    },
    'node/turn-off': function(update) {
        return { event: 'node/turn-off', nodeId: update.node.id };
    },
    'node/add-inlet': function(update) {
        var inlet = update.inlet;
        return { event: 'node/add-inlet', nodeId: update.node.id, inletId: inlet.id,
                 inletType: inlet.type, inletAlias: inlet.alias, inletName: inlet.name };
    },
    'node/remove-inlet': function(update) {
        return { event: 'node/remove-inlet', nodeId: update.node.id, inletId: update.inlet.id };
    },
    'node/add-outlet': function(update) {
        var outlet = update.outlet;
        return { event: 'node/add-outlet', nodeId: update.node.id, outletId: outlet.id,
                 outletType: outlet.type, outletAlias: outlet.alias, outletName: outlet.name };
    },
    'node/remove-outlet': function(update) {
        return { event: 'node/remove-outlet', nodeId: update.node.id, outletId: update.outlet.id };
    },
    'node/move': function(update) {
        return { event: 'node/move', nodeId: update.node.id, position: update.position };
    },
    'outlet/connect': function(update) {
        var link = update.link;
        return { event: 'outlet/connect', outletId: update.outlet.id, inletId: update.inlet.id,
                 linkType: link.type, linkId: link.id };
    },
    'outlet/disconnect': function(update) {
        return { event: 'outlet/disconnect', outletId: update.outlet.id, linkId: update.link.id };
    },
    'link/enable': function(update) {
        return { event: 'link/enable', linkId: update.link.id };
    },
    'link/disable': function(update) {
        return { event: 'link/disable', linkId: update.link.id };
    }
};

// ================================= IMPORT =================================

function makeImportSpec() {
    var patches = {},
        nodes = {},
        inlets = {},
        outlets = {},
        links = {};

    return {
        'network/add-patch': function(command) {
            patches[command.patchId] = Rpd.addPatch(command.patchName);
        },
        'patch/enter': function(command) {
            patches[command.patchId].enter();
        },
        'patch/exit': function(command) {
            patches[command.patchId].exit();
        },
        'patch/set-inputs': function(command) {
            var inputs = command.inputs,
                inputsTrg = [];
            inputs.forEach(function(input) {
                inputsTrg.push(inlets[input]);
            });
            patches[command.patchId].inputs(inputsTrg);
        },
        'patch/set-outputs': function(command) {
            var outputs = command.outputs,
                outputsTrg = [];
            outputs.forEach(function(output) {
                outputsTrg.push(outlets[output]);
            });
            patches[command.patchId].outputs(outputsTrg);
        },
        'patch/project': function(command) {
            patches[command.patchId].project(nodes[command.nodeId]);
        },
        'patch/add-node': function(command) {
            nodes[command.nodeId] = patches[command.patchId].addNode(command.nodeType, command.nodeName);
        },
        'patch/remove-node': function(command) {
            patches[command.patchId].removeNode(nodes[command.nodeId]);
        },
        'node/turn-on': function(command) {
            nodes[command.nodeId].turnOn();
        },
        'node/turn-off': function(command) {
            nodes[command.nodeId].turnOff();
        },
        'node/add-inlet': function(command) {
            inlets[command.inletId] = nodes[command.nodeId].addInlet(command.inletType, command.inletName, command.inletAlias);
        },
        'node/remove-inlet': function(command) {
            nodes[command.nodeId].removeInlet(inlets[command.inletId]);
        },
        'node/add-outlet': function(command) {
            outlets[command.outletId] = nodes[command.nodeId].addOutlet(command.outletType, command.outletName, command.outletAlias);
        },
        'node/remove-outlet': function(command) {
            nodes[command.nodeId].removeOutlet(outlets[command.outletId]);
        },
        'node/move': function(command) {
            var position = command.position;
            nodes[command.nodeId].move(position[0], position[1]);
        },
        'outlet/connect': function(command) {
            links[command.linkId] = outlets[command.outletId].connect(inlets[command.inletId], command.linkType);
        },
        'outlet/disconnect': function(command) {
            outlets[command.outletId].disconnect(links[command.linkId]);
        },
        'link/enable': function(command) {
            links[command.linkId].enable();
        },
        'link/disable': function(command) {
            links[command.linkId].disable();
        }
    }
}

}(this));
