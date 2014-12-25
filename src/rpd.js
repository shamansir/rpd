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

var cur_model = -1;
var models = [];

function Model(name) {
    this.name = name;

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
Model.prototype.addNode = function(node) {
    this.events['node/add'].emit(node);
    this.updates.plug(node.updates);
    // TODO: node.turnOn
    return this;
}
Model.prototype.removeNode = function(node) {
    this.events['node/remove'].emit(node);
    this.updates.unplug(node.updates);
    // TODO: node.turnOff
    return this;
}
Model.prototype.renderWith = function(alias) {
    if (!renderer_registry[alias]) throw new Error('Renderer ' + alias + ' is not registered');
    this.renderers.emit(renderer_registry[alias]);
    return this;
}
Model.start = function(name) {
    var instance = new Model(name);
    models.push(instance);
    cur_model++;
    return instance;
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

    if (models[cur_model]) {
        models[cur_model].addNode(this);
    } else {
        report_error('No model started!');
    }
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
/* Node.prototype.removeInlet = function(inlet) {
    // TODO:
} */
/* Node.prototype.removeOutlet = function(outlet) {
    // TODO:
} */

function Inlet(type, node, name) {
    this.type = type || 'core/bool';
    var def = channeltypes[this.type];
    if (!def) report_error('Inlet type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';

    this.value = Kefir.emitter();

    this.events = {};
    this.events['inlet/update'] = Kefir.emitter().merge(this.value);

    var me = this;
    this.updates = Kefir.pool().plug(this.events['inlet/update'].map(function(value) {
                                         return { type: 'inlet/update', inlet: me, value: value };
                                     }));

}
Inlet.prototype.receive = function(value) {
    this.value.emit(value);
}

function Outlet(type, node, name) {
    this.type = type || 'core/bool';
    var def = channeltypes[this.type];
    if (!def) report_error('Outlet type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';

    this.value = Kefir.pool();

    this.events = {};
    this.events['outlet/update'] = Kefir.emitter().merge(this.value);
    this.events['outlet/connect'] = Kefir.emitter();

    var me = this;
    this.updates = Kefir.pool().plug(this.events['outlet/update'].map(function(value) {
                                         return { type: 'outlet/update', outlet: me, value: value };
                                     }))
                               .plug(this.events['outlet/connect'].map(function(link) {
                                         return { type: 'outlet/connect', outlet: me, link: link };
                                     }));

}
Outlet.prototype.connect = function(inlet, f) {
    var link = new Link((f ? 'core/adapted' : 'core/direct'),
                        this, inlet, f);
    this.events['outlet/connect'].emit(link);
    this.value.onValue(function(x) { inlet.receive(x); });
}
/* Outlet.prototype.disconnect = function(inlet) {
    // TODO:
} */
Outlet.prototype.send = function(value) {
    this.value.plug(Kefir.constant(value));
}
Outlet.prototype.stream = function(stream) {
    this.value.plug(stream);
}

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
