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

function Model() {
    this.targets = Kefir.emitter();
    this.renderers = Kefir.emitter();

    this.events = {
        'node/add': Kefir.emitter(),
        'node/remove': Kefir.emitter(),
    };

    this.updates = Kefir.pool().plug(this.events['node/add'].map(function(node) {
                                         return { type: 'node/add', node: node };
                                     }))
                               .plug(this.events['node/remove'].map(function(node) {
                                         return { type: 'node/remove', node: node };
                                     }));

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
    this.events['node/add'].emit(node);
    this.updates.plug(node.updates);
    // TODO: node.turnOn
    return this;
}
Model.prototype.remove = function(node) {
    this.events['node/remove'].emit(node);
    this.updates.unplug(node.updates);
    // TODO: node.turnOff
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

    this.events = {
        'inlet/add': Kefir.emitter(),
        'inlet/remove': Kefir.emitter(),
        'outlet/add': Kefir.emitter(),
        'outlet/remove': Kefir.emitter()
    };
    this.updates = Kefir.pool().plug(this.events['inlet/add'].map(function(inlet) {
                                         return { type: 'inlet/add', inlet: inlet };
                                     }))
                               .plug(this.events['inlet/remove'].map(function(inlet) {
                                         return { type: 'inlet/remove', inlet: inlet };
                                     }))
                               .plug(this.events['outlet/add'].map(function(outlet) {
                                         return { type: 'outlet/add', outlet: outlet };
                                     }))
                               .plug(this.events['outlet/remove'].map(function(outlet) {
                                         return { type: 'outlet/remove', outlet: outlet };
                                     }));
}
Node.prototype.addInlet = function(type, name) {
    var inlet = new Inlet(type, this, name);
    this.events['inlet/add'].emit(inlet);
    this.updates.plug(inlet.updates);
    return inlet;
}
Node.prototype.addOutlet = function(type, value, name) {
    var outlet = new Outlet(type, this, name);
    this.events['outlet/add'].emit(outlet);
    this.updates.plug(outlet.updates);
    outlet.send(value);
    return outlet;
}
/* Node.prototype.removeChannel = function(channel) {
    // TODO:
} */


function Channel(what, type, node, name) {
    this.type = type || 'core/bool';
    this.what = what;
    var def = channeltypes[this.type];
    if (!def) report_error('Channel type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';

    this.value = Kefir.pool();

    this.events = {};
    this.events[what + '/update'] = Kefir.emitter().merge(this.value);
    this.events[what + '/connect'] = Kefir.emitter();

    this.updates = Kefir.pool().plug(this.events[what + '/update'].map(function(subj) {
                                         var res = {};
                                         res.type = what + '/update'; res[what] = subj;
                                         return res;
                                     }))
                               .plug(this.events[what + '/connect'].map(function(subj) {
                                         var res = {};
                                         res.type = what + '/connect'; res[what] = subj;
                                         return res;
                                     }));

}
Channel.prototype.connect = function(other, f) {
    var link = new Link((f ? 'core/adapted' : 'core/direct'),
                        this, other, f);
    this.events[this.concavity + '/connect'].emit(link);
    return this;
}
Channel.prototype.send = function(value) {
    this.value.plug(Kefir.constant(value));
    return this;
}
Channel.prototype.stream = function(stream) {
    this.value.plug(stream);
    return this;
}
function Inlet() { return Channel.call(this, ['in'].concat(arguments)); }
function Outlet() { return Channel.call(this, ['out'].concat(arguments)); }
Outlet.prototype.send = Channel.prototype.send;

function Link(type, outlet, inlet, f, name) {
    this.type = type || 'core/direct';
    var def = linktypes[this.type];
    if (!def) report_error('Link type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || '';

    this.outlet = outlet;
    this.inlet = inlet;

    this.adapter = f || def.f || undefined;

    // TODO: link/convert event?
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
