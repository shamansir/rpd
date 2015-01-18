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

    var event_conf = {
        'model/new':   function(model) { return { model: model }; },
        'node/add':    function(node) { return { node: node }; },
        'node/remove': function(node) { return { node: node }; }
    };
    this.event = event_map(event_conf);
    this.events = events_stream(event_conf, this.event);

    Kefir.combine([ this.events,
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

    this.event['model/new'].emit(this);
}
Model.prototype.attachTo = function(elm) {
    this.targets.emit(elm);
    return this;
}
Model.prototype.addNode = function(node) {
    this.events.plug(node.events);
    this.event['node/add'].emit(node);
    // TODO: node.turnOn
    return this;
}
Model.prototype.removeNode = function(node) {
    this.event['node/remove'].emit(node);
    this.events.unplug(node.events);
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

    this.render = def.render || {};
    this.renderfirst = def.renderfirst || {};
    this.renderreplace = def.renderreplace || {};

    var myself = this;
    var event_conf = {
        'node/ready':    function(node) { return { node: myself } },
        'node/process':  function(channels) { return { inlets: channels[0], outlets: channels[1], node: myself } },
        'inlet/add':     function(inlet) { return { inlet: inlet } },
        'inlet/remove':  function(inlet) { return { inlet: inlet } },
        'outlet/add':    function(outlet) { return { outlet: outlet } },
        'outlet/remove': function(outlet) { return { outlet: outlet } },
    };
    this.event = event_map(event_conf);
    this.events = events_stream(event_conf, this.event);

    // add node to the model so it will be able to receive events produced with methods below

    if (models[cur_model]) {
        models[cur_model].addNode(this);
    } else {
        report_error('No model started!');
    }

    if (this.def.handle) {
        this.events.onValue(function(update) {
            if (myself.def.handle[update.type]) {
                myself.def.handle[update.type](update);
            };
        });
    }

    if (this.def.process) {
        var process_f = this.def.process;
        var myself = this;
        Kefir.combine([
            this.event['inlet/add'].flatMap(function(inlet) {
                return inlet.event['inlet/update'].map(function(value) {
                    return { inlet: inlet.alias, value: value };
                });
            }).scan(function(values, update) {
                var values = values || {};
                var inlet = update.inlet;
                values[inlet] = update.value;
                return values;
            }, null),
            this.event['outlet/add'].scan(function(outlets, outlet) {
                var outlets = outlets || {};
                outlets[outlet.alias] = outlet;
                return outlets;
            }, null)
        ]).onValue(function(value) {
            var inlets_vals = value[0] || {}; var outlets = value[1] || {};
            var outlets_vals = process_f(inlets_vals);
            myself.event['node/process'].emit([inlets_vals, outlets_vals]);
            for (var outlet_name in outlets_vals) {
                if (outlets[outlet_name]) {
                    outlets[outlet_name].send(outlets_vals[outlet_name]);
                };
            }
        });
    }

    // only inlets / outlets described in type definition are stored inside
    // (since they are constructed once), it lets user easily connect to them

    if (this.def.inlets) {
        this.inlets = {};
        for (var alias in this.def.inlets) {
            var conf = this.def.inlets[alias];
            var inlet = this.addInlet(conf.type, alias, conf.name, conf.default, conf.hidden);
            this.inlets[alias] = inlet;
        }
    }

    if (this.def.outlets) {
        this.outlets = {};
        for (var alias in this.def.outlets) {
            var conf = this.def.outlets[alias];
            var outlet = this.addOutlet(conf.type, alias, conf.name, conf.default);
            this.outlets[alias] = outlet;
        }
    }

    if (this.def.prepare) this.def.prepare(this.inlets, this.outlets);

    this.event['node/ready'].emit(this);

}
Node.prototype.addInlet = function(type, alias, name, _default, hidden) {
    var inlet = new Inlet(type, this, alias, name, _default, hidden);
    this.events.plug(inlet.events);
    this.event['inlet/add'].emit(inlet);
    inlet.toDefault();
    return inlet;
}
Node.prototype.addOutlet = function(type, alias, name, _default) {
    var outlet = new Outlet(type, this, alias, name, _default);
    this.events.plug(outlet.events);
    this.event['outlet/add'].emit(outlet);
    outlet.toDefault();
    return outlet;
}
Node.prototype.removeInlet = function(inlet) {
    this.event['inlet/remove'].emit(inlet);
    this.events.unplug(inlet.events);
}
Node.prototype.removeOutlet = function(outlet) {
    this.event['outlet/remove'].emit(outlet);
    this.events.unplug(outlet.events);
}

// ================================== Inlet ====================================
// =============================================================================

function Inlet(type, node, alias, name, _default, hidden) {
    this.type = type || 'core/bool';
    this.id = short_uid();
    var def = channeltypes[this.type];
    if (!def) report_error('Inlet type ' + this.type + ' is not registered!');
    this.def = def;

    this.alias = alias || name || def.alias;
    if (!this.alias) report_error('Outlet should have either alias or name');
    this.name = name || this.alias || def.name || 'Unnamed';

    this.node = node;
    this.hidden = hidden || false;
    this.default = is_defined(_default) ? _default : def.default;
    this.adapt = def.adapt;
    this.value = Kefir.bus();

    this.render = def.render || {};
    this.renderedit = def.renderedit || {};

    var myself = this;
    var event_conf = {
        'inlet/update': function(value) { return { inlet: myself, value: value } }
    };
    this.event = event_map(event_conf);
    this.event['inlet/update'] = this.event['inlet/update'].merge(this.value);
    this.events = events_stream(event_conf, this.event);
}
Inlet.prototype.receive = function(value) {
    this.value.emit(this.adapt ? this.adapt(value) : value);
}
Inlet.prototype.stream = function(stream) {
    this.value.plug(this.adapt ? stream.map(this.adapt) : stream);
}
Inlet.prototype.toDefault = function() {
    if (is_defined(this.default) && (this.default instanceof Kefir.Stream)) {
        this.stream(this.default);
    } else this.receive(this.default);
}

// ================================= Outlet ====================================
// =============================================================================

function Outlet(type, node, alias, name, _default) {
    this.type = type || 'core/bool';
    this.id = short_uid();
    var def = channeltypes[this.type];
    if (!def) report_error('Outlet type ' + this.type + ' is not registered!');
    this.def = def;

    this.alias = alias || name || def.alias;
    if (!this.alias) report_error('Outlet should have either alias or name');
    this.name = name || this.alias || def.name || 'Unnamed';

    this.node = node;
    this.default = is_defined(_default) ? _default : def.default;
    this.adapt = def.adapt;
    this.value = Kefir.bus();

    this.render = def.render || {};
    // outlets values are not editable

    var myself = this;
    var event_conf = {
        'outlet/update':     function(value) { return { outlet: myself, value: value } },
        'outlet/connect':    function(link)  { return { outlet: myself, link: link } },
        'outlet/disconnect': function(link) { return { outlet: myself, link: link } }
    };
    this.event = event_map(event_conf);
    this.event['outlet/update'] = this.event['outlet/update'].merge(this.value);
    this.events = events_stream(event_conf, this.event);

    // re-send last value on connection
    Kefir.sampledBy([ this.event['outlet/update'] ],
                    [ this.event['outlet/connect'] ])
         .onValue(function(update) {
             myself.value.emit(update[0]);
         });

}
Outlet.prototype.connect = function(inlet, adapter) {
    var link = new Link(null, this, inlet, adapter);
    this.events.plug(link.events);
    this.value.onValue(link.receiver);
    this.event['outlet/connect'].emit(link);
    //this.toDefaultValue();
}
Outlet.prototype.disconnect = function(link) {
    this.event['outlet/disconnect'].emit(link);
    this.value.offValue(link.receiver);
    this.events.unplug(link.events);
}
Outlet.prototype.send = function(value) {
    this.value.emit(this.adapt ? this.adapt(value) : value);
}
Outlet.prototype.stream = function(stream) {
    this.value.plug(this.adapt ? stream.map(this.adapt) : stream);
}
Outlet.prototype.toDefault = function() {
    if (is_defined(this.default) && (this.default instanceof Kefir.Stream)) {
        this.stream(this.default);
    } else this.send(this.default);
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

    var myself = this;

    this.receiver = (outlet.node.id !== inlet.node.id) ? function(x) {
        inlet.receive(myself.adapt(x));
    } : function(x) {
        setTimeout(function() { inlet.receive(myself.adapt(x)) }, 0);
    };

    var event_conf = {
        'link/enable': function() { return { link: myself } },
        'link/disable': function() { return { link: myself } },
        'link/adapt': function(values) { return { link: myself, before: values[0], after: values[1] } },
        'link/error': function(error) { return { link: myself, error: error } }
    };
    this.event = event_map(event_conf);
    this.events = events_stream(event_conf, this.event);
}
Link.prototype.adapt = function(before) {
    if (this.adapter) {
        try {
            var after = this.adapter(before);
            this.event['link/adapt'].emit([before, after]);
            return after;
        } catch(err) {
            this.event['link/error'].emit(err);
            return;
        }
    } else {
        this.event['link/adapt'].emit([before, before]);
        return before;
    }
}
Link.prototype.enable = function() {

}
Link.prototype.disable = function() {

}
Link.prototype.disconnect = function() {
    this.outlet.disconnect(this);
}

// ================================== utils ====================================
// =============================================================================

function is_defined(val) {
    return (typeof val !== 'undefined');
}

function event_map(conf) {
    var map = {};
    for (var event_name in conf) {
        map[event_name] = Kefir.emitter();
    }
    return map;
}

function events_stream(conf, event_map) {
    var stream = Kefir.pool();
    for (var event_name in conf) {
        var handler = conf[event_name];
        (function(event_name, handler) {
            stream.plug(event_map[event_name].map(function(value) {
                var result = handler(value);
                result.type = event_name;
                return result;
            }));
        })(event_name, handler);
    }
    return stream;
}

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

function noderenderer(type, alias, obj) {
    if (!nodetypes[type]) throw new Error('Node type ' + type + ' is not registered');
    if (obj.always) {
        if (!nodetypes[type].render) nodetypes[type].render = {};
        nodetypes[type].render[alias] = obj.always;
    }
    if (obj.first) {
        if (!nodetypes[type].renderfirst) nodetypes[type].renderfirst = {};
        nodetypes[type].renderfirst[alias] = obj.first;
    }
}

function channelrender(type, alias, obj) {
    if (!channeltypes[type]) throw new Error('Channel type ' + type + ' is not registered');
    if (obj.show) {
        if (!channeltypes[type].render) channeltypes[type].render = {};
        channeltypes[type].render[alias] = obj.show;
    }
    if (obj.edit) {
        if (!channeltypes[type].renderedit) channeltypes[type].renderedit = {};
        channeltypes[type].renderedit[alias] = obj.edit;
    }
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
    'renderer': renderer,
    'noderenderer': noderenderer
}

})();
