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

/* console.log('----');

var nodes = Kefir.emitter();
var targets = Kefir.emitter();
var renderers = Kefir.emitter();

var joined = Kefir.combine([
nodes.scan(function(prev, next) { return [ prev, next, 'bar' ]; }),
targets.scan(function(prev, next) { return [ prev, next, 'foo' ]; }),
renderers]);

joined.log();
targets.emit('t-abcdefgh-1');
renderers.emit('r-abcdefgh-1');
renderers.emit('r-abcdefgh-2');
targets.emit('t-abcdefgh-2');
nodes.emit('n-a');
nodes.emit('n-b');
nodes.emit('n-c');
nodes.emit('n-d');
renderers.emit('r-efgh');
nodes.emit('n-e');
targets.emit('t-fgh');
nodes.emit('n-f');
targets.emit('t-gh-1');
targets.emit('t-gh-2');
nodes.emit('n-g');
renderers.emit('r-h');
nodes.emit('n-h'); */
