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
        arrays = [],
        connections = [];

    var rootPatch = Rpd.addPatch('PD');

    var node;

    lines.forEach(function(line) {
        if (!line.length) return;
        var rest = line.slice(1).split(' ');
        if (line[1] === 'A') {
            arrays.push(rest);
        } else if (line[1] === 'N') {

        } else if (line[1] === 'X') {

            if (rest[0] === 'connect') {

            } else if (rest[0] === 'floatatom') {

            } else if (rest[0] === 'symbolatom') {

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

                if (rest[1] === 'bng') {
                    node = rootPatch.addNode('pd/bang');
                    node.move(parseInt(rest[1]), parseInt(rest[2]));
                    objects.push(node);
                } else if (rest[1] === 'tgl') {
                    node = rootPatch.addNode('pd/toggle');
                    node.move(parseInt(rest[1]), parseInt(rest[2]));
                    objects.push(node);
                } else if (rest[1] === 'nbx') {

                } else if (rest[1] === 'vsl') {

                } else if (rest[1] === 'hsl') {

                } else if (rest[1] === 'vradio') {

                } else if (rest[1] === 'hradio') {

                } else if (rest[1] === 'vu') {

                } else if (rest[1] === 'cnv') {

                }

            }

        }
    });
}

function

}(this));
