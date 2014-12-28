var Rpd = (function() {

var nodetypes = {};
var linktypes = {};
var channeltypes = {};

var renderer_registry = {};

var cur_model = -1;
var models = [];

// ================================== Model ====================================
// =============================================================================

function Model(name) {
    this.name = name;

    this.targets = Kefir.emitter();
    this.renderers = Kefir.emitter();

    this.events = {
        'model/new': Kefir.emitter(),
        'node/add': Kefir.emitter(),
        'node/remove': Kefir.emitter(),
    };

    this.updates = Kefir.pool().plug(this.events['model/new'].map(function(model) {
                                         return { type: 'model/new', model: model };
                                     }))
                               .plug(this.events['node/add'].map(function(node) {
                                         return { type: 'node/add', node: node };
                                     }))
                               .plug(this.events['node/remove'].map(function(node) {
                                         return { type: 'node/remove', node: node };
                                     }));

    Kefir.combine([ this.updates,
                    this.targets.scan(cons),
                    this.renderers.scan(cons) ]).onValue(
        function(value) {
            var update = value[0], targets = value[1],
                                 renderers = value[2];
            walk_cons(targets, function(target) {
                walk_cons(renderers, function(renderer) {
                    renderer(target, update);
                });
            });
        }
    );

    this.events['model/new'].emit(this);
}
Model.prototype.attachTo = function(elm) {
    this.targets.emit(elm);
    return this;
}
Model.prototype.addNode = function(node) {
    this.updates.plug(node.updates);
    this.events['node/add'].emit(node);
    // TODO: node.turnOn
    return this;
}
Model.prototype.removeNode = function(node) {
    this.events['node/remove'].emit(node);
    this.updates.unplug(node.updates);
    // TODO: node.turnOff
    return this;
}
Model.prototype.renderWith = function(alias, conf) {
    if (!renderer_registry[alias]) throw new Error('Renderer ' + alias + ' is not registered');
    this.renderers.emit(renderer_registry[alias](conf));
    return this;
}
Model.start = function(name) {
    var instance = new Model(name);
    models.push(instance);
    cur_model++;
    return instance;
}

// ================================= Node ======================================
// =============================================================================

function Node(type, name) {
    this.type = type || 'core/empty';
    this.id = short_uid();
    var def = nodetypes[this.type];
    if (!def) report_error('Node type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';
    this.def = def;

    this.events = {
        'node/process': Kefir.emitter(),
        'inlet/add': Kefir.emitter(),
        'inlet/remove': Kefir.emitter(),
        'outlet/add': Kefir.emitter(),
        'outlet/remove': Kefir.emitter()
    };

    this.updates = Kefir.pool().plug(this.events['node/process'].map(function(inlets, outlets) {
                                         return { type: 'node/process', inlets: inlets, outlets: outlets };
                                     }))
                               .plug(this.events['inlet/add'].map(function(inlet) {
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

    if (this.def.process) {
        var process_f = this.def.process;
        Kefir.combine([
            this.events['inlet/add'].flatMap(function(inlet) {
                return inlet.events['inlet/update'].map(function(value) {
                    return { inlet: inlet.name, value: value };
                });
            }).scan(function(values, update) {
                var values = values || {};
                var inlet = update.inlet;
                values[inlet] = update.value;
                return values;
            }, null),
            this.events['outlet/add'].scan(function(outlets, outlet) {
                var outlets = outlets || {};
                outlets[outlet.name] = outlet;
                return outlets;
            }, null)
        ]).onValue(function(value) {
            var inlets_vals = value[0]; var outlets = value[1];
            var outlets_vals = process_f(inlets_vals || {});
            for (var outlet_name in outlets_vals) {
                outlets[outlet_name].stream(outlets_vals[outlet_name]);
            }
        });
    }
}
Node.prototype.addInlet = function(type, name) {
    var inlet = new Inlet(type, this, name);
    this.updates.plug(inlet.updates);
    this.events['inlet/add'].emit(inlet);
    return inlet;
}
Node.prototype.addOutlet = function(type, value, name) {
    var outlet = new Outlet(type, this, name);
    this.updates.plug(outlet.updates);
    this.events['outlet/add'].emit(outlet);
    outlet.send(value);
    return outlet;
}
/* Node.prototype.removeInlet = function(inlet) {
    // TODO:
} */
/* Node.prototype.removeOutlet = function(outlet) {
    // TODO:
} */

// ================================== Inlet ====================================
// =============================================================================

function Inlet(type, node, name) {
    this.type = type || 'core/bool';
    this.id = short_uid();
    var def = channeltypes[this.type];
    if (!def) report_error('Inlet type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';

    this.node = node;
    this.value = Kefir.emitter();

    this.events = {};
    this.events['inlet/update'] = Kefir.emitter().merge(this.value);

    var me = this;
    this.updates = Kefir.pool().plug(this.events['inlet/update'].map(function(value) {
                                         return { type: 'inlet/update', inlet: me, value: value };
                                     }));

}
Inlet.prototype.receive = function(value) {
    // TODO: pass to the node, so it will process outlet values
    this.value.emit(value);
}

// ================================= Outlet ====================================
// =============================================================================

function Outlet(type, node, name) {
    this.type = type || 'core/bool';
    this.id = short_uid();
    var def = channeltypes[this.type];
    if (!def) report_error('Outlet type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';

    this.node = node;
    this.value = Kefir.bus();

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
Outlet.prototype.connect = function(inlet, adapter) {
    var link = new Link(null, this, inlet, adapter);
    this.updates.plug(link.updates);
    this.events['outlet/connect'].emit(link);
    this.value.onValue(function(x) { inlet.receive(link.adapt(x)); });
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

// ================================= Link ======================================
// =============================================================================

function Link(type, outlet, inlet, adapter, name) {
    this.type = type || 'core/normal';
    this.id = short_uid();
    var def = linktypes[this.type];
    if (!def) report_error('Link type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || '';

    this.outlet = outlet;
    this.inlet = inlet;

    this.adapter = adapter || def.adapter || undefined;

    this.events = {
        'link/adapt': Kefir.emitter(),
        'link/error': Kefir.emitter()
    };

    var me = this;
    this.updates = Kefir.pool().plug(this.events['link/adapt'].map(function(values) {
                                         return { type: 'link/adapt', link: me, before: values[0], after: values[1] };
                                     }))
                               .plug(this.events['link/error'].map(function(error) {
                                         return { type: 'link/error', link: me, error: error };
                                     }));
}
Link.prototype.adapt = function(before) {
    if (this.adapter) {
        try {
            var after = this.adapter(before);
            this.events['link/adapt'].emit([before, after]);
            return after;
        } catch(err) {
            this.events['link/error'].emit(err);
            return;
        }
    } else {
        this.events['link/adapt'].emit([before, before]);
        return before;
    }
}

// ================================== utils ====================================
// =============================================================================

function report_error(desc, err) {
    var err = err || new Error(desc);
    if (console) (console.error ? console.error(err) : console.log(err));
    throw err;
}

function short_uid() {
    return ("0000" + (Math.random() * Math.pow(36,4) << 0).toString(36)).slice(-4);
}

function cons(prev, cur) {
    return [ cur, Array.isArray(prev) ? prev : [ prev, null ] ];
};

function walk_cons(cell, f) {
    if (!cell) return;
    // seed for .scan is not set in our case, so first item it is called
    // with first cell
    if (!Array.isArray(cell)) { f(cell); return; }
    f(cell[0]); walk_cons(cell[1], f);
}

// =========================== registration ====================================
// =============================================================================

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

// =============================== export ======================================
// =============================================================================

return {
    'Model': Model,
    'Node': Node,
    'Inlet': Inlet,
    'Outlet': Outlet,
    'Link': Link,
    'nodetype': nodetype,
    'linktype': linktype,
    'channeltype': channeltype,
    'renderer': renderer
}

})();
