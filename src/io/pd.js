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
    var objects = [],
        arrays = [];

    var rootPatch = Rpd.addPatch('PD').enter();

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
                connect(objects[rest[2]], rest[3],
                        objects[rest[4]], rest[5]);
            } else if (rest[1] === 'restore') {
                // TODO
            } else if (rest[1] === 'floatatom') {
                node = rootPatch.addNode('pd/number');
                node.move(parseInt(rest[2]), parseInt(rest[3]));
                configureSymbol(node, rest.slice(4));
                objects.push(node);
            } else if (rest[1] === 'symbolatom') {
                node = rootPatch.addNode('pd/symbol');
                node.move(parseInt(rest[2]), parseInt(rest[3]));
                configureSymbol(node, rest.slice(4));
                objects.push(node);
            } else if (rest[1] === 'msg') {
                node = rootPatch.addNode('pd/message');
                node.move(parseInt(rest[2]), parseInt(rest[3]));
                node.inlets['receive'].send(rest.slice(4));
                objects.push(node);
            } else if (rest[1] === 'text') {
                node = rootPatch.addNode('pd/text');
                node.move(parseInt(rest[2]), parseInt(rest[3]));
                node.inlets['text'].send(rest[4]);
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
                    configureObject(node, rest.slice(4));
                }
                objects.push(node || {});

            } else {
                // TODO
            }

        }
    });
}

function connect(fromNode, inletId, toNode, outletId) {

}

function configureSymbol(node, conf) {

}

function configureObject(node, conf) {
    //PdView.configureObjectNode(node, conf);
}

}(this));
