var nodetypes = {};
var linktypes = {};
var channeltypes = {};

function Model() {
    this.nodes = Kefir.emitter();
    this.targets = Kefir.emitter();
    this.renderers = Kefir.emitter();
    // var sampler = Kefir.sampledBy([nodes.bufferBy(targets.combine(renderers))], [targets, renderers]);
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
