var nodetypes = {};
var linktypes = {};
var channeltypes = {};

var renderer_registry = {};

function report_error(desc, err) {
    var err = err || new Error(desc);
    if (console) (console.error ? console.error(err) : console.log(err));
    throw err;
}

function short_uid() {
    return ("0000" + (Math.random() * Math.pow(36,4) << 0).toString(36)).slice(-4);
}

function Model() {
    this.nodes = Kefir.emitter();
    this.targets = Kefir.emitter();
    this.renderers = Kefir.emitter();

    function rev_cons(prev, cur) {
        return [ cur, Array.isArray(prev) ? prev : [ prev, null ] ];
    };

    function walk_rev_cons(cell, f) {
        if (!cell) return;
        // rev_cons is not called for a stream with just one item, so cell
        // may be a first object itself, unpacked. since we don't use arrays
        // as values of these streams, it's a safe check
        if (!Array.isArray(cell)) { f(cell); return; }
        f(cell[0]); walk_cons(cell[1], f);
    }

    Kefir.combine([ this.nodes,
                    this.targets.scan(rev_cons),
                    this.renderers.scan(rev_cons) ]).onValue(
        function(value) {
            var node = value[0], targets = value[1],
                                 renderers = value[2];
            walk_rev_cons(targets, function(target) {
                walk_rev_cons(renderers, function(renderer) {
                    if (!renderer_registry[renderer]) report_error('Renderer ' + renderer +
                                                                   ' is not registered.');
                    renderer_registry[renderer](target, node);
                });
            });
        }
    );
}
Model.prototype.attachTo = function(elm) {
    this.targets.emit(elm);
    return this;
}
Model.prototype.add = function(node) {
    this.nodes.emit(node);
    return this;
}
Model.prototype.update = function(node) {
    this.nodes.emit(node);
    return this;
}
Model.prototype.renderWith = function(alias) {
    this.renderers.emit(alias);
    return this;
}

function Node(type, name) {
    this.type = type || 'core/empty';
    this.id = short_uid();
    var def = nodetypes[this.type];
    if (!def) report_error('Node type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';
    this.inlets = [];
    this.outlets = [];
    this.def = def;
}
Node.prototype.addInlet = function(pos, type, value, name) {
    this.inlets.push(new Channel(type, this, name));
    return this;
}
Node.prototype.addOutlet = function(pos, type, value, name) {
    this.outlets.push(new Channel(type, this, name));
    return this;
}
Node.prototype.connect = function(outlet_id, other, inlet_id) {
    // TODO
    return this;
}

function Channel(type, node, name) { // a.k.a. Outlet/Inlet
    this.type = type || 'core/bool';
    var def = channeltypes[this.type];
    if (!def) report_error('Channel type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';
    this.value = def.value;
    this.node = null;
}
Channel.prototype.set = function(value) {
    this.value = value;
}
Channel.prototype.get = function() {
    return this.value;
}

function Link(type, from, to, name) {
    this.type = type || 'core/direct';
    var def = linktypes[this.type];
    if (!def) report_error('Link type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || '';
    this.start = null;
    this.end = [];
}

function nodetype(id, def) {
    nodetypes[id] = def;
}

function linktype(id, def) {
    linktypes[id] = def;
}

function channeltype(id, def) {
    channeltypes[id] = def;
}

function renderer(alias, f) {
    renderer_registry[alias] = f;
}
