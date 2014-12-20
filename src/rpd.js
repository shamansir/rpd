var nodetypes = {};
var linktypes = {};
var channeltypes = {};

function Model() {
    this.nodes = Kefir.emitter();
    this.targets = Kefir.emitter();
    this.renderers = Kefir.emitter();

    function rev_cons(prev, cur) {
        return [ cur, Array.isArray(prev) ? prev : [ prev, null ] ];
    };

    function walk_cons(cell, f) {
        if (!cell) return;
        if (cell[0]) f(cell[0]);
        walk_cons(cell[1], f);
    }

    Kefir.combine([ this.nodes,
                    this.targets.scan(rev_cons),
                    this.renderers.scan(rev_cons) ]).onValue(
        function(value) {
            var node = value[0], targets = value[1],
                                 renderers = value[2];
            console.log('update');
            walk_cons(targets, function(target) {
                walk_cons(renderers, function(renderer) {
                    console.log(node, target, renderer);
                });
            });
        }
    );

    var nodes = this.nodes;
    var targets = this.targets;
    var renderers = this.renderers;

    targets.emit('t-1');
    renderers.emit('r-1');
    renderers.emit('r-2');
    targets.emit('t-2');
    nodes.emit('n-a');
    nodes.emit('n-b');
    nodes.emit('n-c');
    nodes.emit('n-d');
    renderers.emit('r-3');
    nodes.emit('n-e');
    targets.emit('t-3');
    nodes.emit('n-f');
    targets.emit('t-4');
    targets.emit('t-5');
    nodes.emit('n-g');
    renderers.emit('r-4');
    nodes.emit('n-h');
}
Model.prototype.attach = function(elm) {
    this.targets.emit(elm);
    return this;
}
Model.prototype.add = function(node) {
    this.nodes.emit(node);
    return this;
}
Model.prototype.start = function() {
    return this;
}

function Node(type, name) {
    this.type = type || 'core/empty';
    var def = nodetypes[this.type];
    if (!def) throw new Error('Node type' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';
    this.inlets = [];
    this.outlets = [];
    this.def = def;
}

function Link(type, name) {
    this.type = type || 'core/direct';
    var def = linktypes[this.type];
    if (!def) throw new Error('Node type' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || '';
    this.start = null;
    this.end = [];
}

function Channel(type, name) {
    this.type = type || 'core/bool';
    var def = linktypes[this.type];
    if (!def) throw new Error('Channel type' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';
    this.node = null;
}

function nodetype(id, def) {
    nodetypes[name] = def;
}


function linktype(id, def) {
    linktypes[name] = def;
}

function channeltype(id, def) {
    channeltypes[name] = def;
}
