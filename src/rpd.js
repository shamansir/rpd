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

    this.updates = Kefir.pool().plug(this.nodes);

    Kefir.combine([ this.updates,
                    this.targets.scan(rev_cons),
                    this.renderers.scan(rev_cons) ]).onValue(
        function(value) {
            var update = value[0], targets = value[1],
                                 renderers = value[2];
            walk_rev_cons(targets, function(target) {
                walk_rev_cons(renderers, function(renderer) {
                    if (!renderer_registry[renderer]) report_error('Renderer ' + renderer +
                                                                   ' is not registered.');
                    renderer(target, update);
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
    this.nodes.emit({
        type: 'node/add',
        subject: node
    });
    this.updates.plug(node.updates);
    return this;
}
Model.prototype.remove = function(node) {
    this.nodes.emit({
        type: 'node/remove',
        subject: node
    });
    this.updates.unplug(node.updates);
    return this;
}
Model.prototype.renderWith = function(alias) {
    if (!renderer_registry[renderer]) throw new Error('Renderer ' + alias + ' is not registered');
    this.renderers.emit(renderer_registry[renderer]);
    return this;
}

function Node(type, name) {
    this.type = type || 'core/empty';
    this.id = short_uid();
    var def = nodetypes[this.type];
    if (!def) report_error('Node type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';
    this.def = def;

    this.channels = Kefir.emitter();
    this.links = Kefir.emitter();
    this.updates = Kefir.pool().plug(this.channels).plug(this.links);
}
Node.prototype.addInlet = function(pos, type, name) {
    var inlet = new Channel(type, 'in', this, pos, name);
    this.channels.emit({
        type: 'inlet/new',
        subject: inlet
    });
    this.updates.plug(inlet.value.map(function(value) {
        return {
            type: 'inlet/update',
            subject: [ inlet, value ]
        }
    }));
    return this; // return inlet?
}
Node.prototype.addOutlet = function(pos, type, value, name) {
    var outlet = new Channel(type, 'out', this, pos, name);
    this.channels.emit({
        type: 'outlet/new',
        subject: outlet
    });
    this.updates.plug(outlet.value.map(function(value) {
        return {
            type: 'outlet/update',
            subject: [ outlet, value ]
        }
    }));
    outlet.set(value);
    return this; // return outlet?
}
Node.prototype.removeChannel = function(channel) {
    // TODO:
}
Node.prototype.connect = function(outlet_id, other, inlet_id, f) {
    var link = new Link((f ? 'core/adapted' : 'core/direct'),
                        outlet_id, this, inlet_id, f);
    this.links.emit({
        type: 'link/new',
        subject: link
    });
    return this;
}

function Channel(type, dir, node, pos, name) {
    this.type = type || 'core/bool';
    this.direction = dir;
    var def = channeltypes[this.type];
    if (!def) report_error('Channel type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';

    this.value = Kefir.pool();
}
Channel.prototype.set = function(value) {
    this.value.plug(value);
    return this;
}

function Link(type, from_pos, from_node, to_pos, to_node, f, name) {
    this.type = type || 'core/direct';
    var def = linktypes[this.type];
    if (!def) report_error('Link type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || '';

    this.from_pos = from_pos;
    this.from_node = from_node;
    this.to_pos = to_pos;
    this.to_node = to_node;

    this.adapter = f || def.f || undefined;
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
