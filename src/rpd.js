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

    var event_conf = {
        'node/process':  function(channels) { return { inlets: channels[0], outlets: channels[1] } },
        'inlet/add':     function(inlet) { return { inlet: inlet } },
        'inlet/remove':  function(inlet) { return { inlet: inlet } },
        'outlet/add':    function(outlet) { return { outlet: outlet } },
        'outlet/remove': function(outlet) { return { outlet: outlet } },
    };
    this.event = event_map(event_conf);
    this.events = events_stream(event_conf, this.event);

    if (models[cur_model]) {
        models[cur_model].addNode(this);
    } else {
        report_error('No model started!');
    }

    if (this.def.process) {
        var process_f = this.def.process;
        var myself = this;
        Kefir.combine([
            this.event['inlet/add'].flatMap(function(inlet) {
                return inlet.event['inlet/update'].map(function(value) {
                    return { inlet: inlet.name, value: value };
                });
            }).scan(function(values, update) {
                var values = values || {};
                var inlet = update.inlet;
                values[inlet] = update.value;
                return values;
            }, null),
            this.event['outlet/add'].scan(function(outlets, outlet) {
                var outlets = outlets || {};
                outlets[outlet.name] = outlet;
                return outlets;
            }, null)
        ]).onValue(function(value) {
            var inlets_vals = value[0]; var outlets = value[1];
            var outlets_vals = process_f(inlets_vals || {});
            myself.event['node/process'].emit([inlets_vals, outlets_vals]);
            for (var outlet_name in outlets_vals) {
                outlets[outlet_name].stream(outlets_vals[outlet_name]);
            }
        });
    }
}
Node.prototype.addInlet = function(type, name) {
    var inlet = new Inlet(type, this, name);
    this.events.plug(inlet.events);
    this.event['inlet/add'].emit(inlet);
    return inlet;
}
Node.prototype.addOutlet = function(type, name, value) {
    var outlet = new Outlet(type, this, name);
    this.events.plug(outlet.events);
    this.event['outlet/add'].emit(outlet);
    outlet.send(value);
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

function Inlet(type, node, name) {
    this.type = type || 'core/bool';
    this.id = short_uid();
    var def = channeltypes[this.type];
    if (!def) report_error('Inlet type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';

    this.node = node;

    this.value = Kefir.bus();

    var myself = this;
    var event_conf = {
        'inlet/update': function(value) { return { inlet: myself, value: value } }
    };
    this.event = event_map(event_conf);
    this.event['inlet/update'] = this.event['inlet/update'].merge(this.value);
    this.events = events_stream(event_conf, this.event);
}
Inlet.prototype.receive = function(value) {
    this.value.emit(value);
}
Inlet.prototype.stream = function(stream) {
    this.value.plug(stream);
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

    var myself = this;
    var event_conf = {
        'outlet/update':     function(value) { return { outlet: myself, value: value } },
        'outlet/connect':    function(link)  { return { outlet: myself, link: link } },
        'outlet/disconnect': function(link) { return { outlet: myself, link: link } }
    };
    this.event = event_map(event_conf);
    this.event['outlet/update'] = this.event['outlet/update'].merge(this.value);
    this.events = events_stream(event_conf, this.event);

}
Outlet.prototype.connect = function(inlet, adapter) {
    var link = new Link(null, this, inlet, adapter);
    this.events.plug(link.events);
    this.event['outlet/connect'].emit(link);
    this.value.onValue(link.receiver);
}
Outlet.prototype.disconnect = function(link) {
    this.value.offValue(link.receiver);
    this.event['outlet/disconnect'].emit(link);
    this.events.unplug(link.events);
}
Outlet.prototype.send = function(value) {
    this.value.emit(value);
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

    var myself = this;

    this.receiver = function(x) {
        inlet.receive(myself.adapt(x));
    };

    var event_conf = {
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
Link.prototype.disconnectOutlet = function() {
    console.log('disconnect outlet');
}

// ================================== utils ====================================
// =============================================================================

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
