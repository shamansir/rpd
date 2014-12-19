var nodetypes = {};
var linktypes = {};
var channeltypes = {};

function Model() {
    this.nodes = Kefir.emitter();
    this.targets = Kefir.emitter();
    this.renderers = Kefir.emitter();

    var chain = function(prev, next) {
        return { prev: prev, next: next };
    };

    Kefir.combine([ this.nodes,
                    this.targets.scan(chain),
                    this.renderers.scan(chain) ]).onValue(
        function(value) {
            var node = value[0], last_target = value[1],
                                 last_renderer = value[2];
            console.log('update');
            console.log(node, last_target, last_renderer);
            var last_target = last_target,
                last_renderer = last_renderer;
            while (last_target.prev) {
                last_target = last_target.prev;
                while (last_renderer.prev) {
                    last_renderer = last_renderer.prev;
                    console.log(node, last_target, last_renderer);
                }
            }
        }
    );

    var nodes = this.nodes;
    var targets = this.targets;
    var renderers = this.renderers;

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
