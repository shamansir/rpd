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
    var spec = makeImportSpec();

    var objects = [],
        arrays = [];

    var rootPatch = Rpd.addPatch('PD');

    var node;

    lines.forEach(function(line) {
        if (!line.length) return;
        var rest = line.slice(1).split(' ');
        if (line[1] === 'A') {
            arrays.push(rest);
        } else if (line[1] === 'N') {
            // TODO
        } else if (line[1] === 'X') {

            if (rest[0] === 'connect') {
                connect(objects[rest[1]], rest[2],
                        objects[rest[3]], rest[4]);
            } else if (rest[0] === 'restore') {
                // TODO
            } else if (rest[0] === 'floatatom') {
                node = rootPatch.addNode('pd/gatom');
                node.move(parseInt(rest[1]), parseInt(rest[2]));
                configureSymbol(node, rest.slice(3));
                objects.push(node);
            } else if (rest[0] === 'symbolatom') {
                node = rootPatch.addNode('pd/gatom');
                node.move(parseInt(rest[1]), parseInt(rest[2]));
                configureSymbol(node, rest.slice(3));
                objects.push(node);
            } else if (rest[0] === 'msg') {
                node = rootPatch.addNode('pd/message');
                node.move(parseInt(rest[1]), parseInt(rest[2]));
                node.inlets['in'].send(rest.slice(3));
                objects.push(node);
            } else if (rest[0] === 'text') {
                node = rootPatch.addNode('pd/text');
                node.move(parseInt(rest[1]), parseInt(rest[2]));
                node.inlets['text'].send(rest[3]);
                objects.push(node);
            } else if (rest[0] === 'obj') {

                if (rest[3] === 'bng') {
                    node = rootPatch.addNode('pd/bang');
                    node.move(parseInt(rest[1]), parseInt(rest[2]));
                } else if (rest[3] === 'tgl') {
                    node = rootPatch.addNode('pd/toggle');
                    node.move(parseInt(rest[1]), parseInt(rest[2]));
                } else if (rest[3] === 'nbx') {

                } else if (rest[3] === 'vsl') {

                } else if (rest[3] === 'hsl') {

                } else if (rest[3] === 'vradio') {

                } else if (rest[3] === 'hradio') {

                } else if (rest[3] === 'vu') {

                } else if (rest[3] === 'cnv') {

                } else {

                }
                objects.push(node || {});

            } else {
                // TODO
            }

        }
    });
}

function connect(node, inletId, node, outletId) {

}

function configureSymbol(node, conf) {

}

}(this));
