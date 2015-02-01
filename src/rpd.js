var Rpd = (function() {

var nodetypes = {};
var linktypes = {};
var channeltypes = {};
var noderenderers = {};
var channelrenderers = {};
var nodedescriptions = {};

var renderer_registry = {};
var subrenderers = {};

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
    node.turnOn();
    return this;
}
Model.prototype.removeNode = function(node) {
    node.turnOff();
    this.event['node/remove'].emit(node);
    this.events.unplug(node.events);
    return this;
}
Model.prototype.renderWith = function(alias, conf) {
    if (!renderer_registry[alias]) throw new Error('Renderer ' + alias + ' is not registered');
    var main_renderer = renderer_registry[alias](conf);
    if (!subrenderers[alias] || !subrenderers[alias].length) {
        this.renderers.emit(main_renderer);
    } else {
        this.renderers.emit(join_subrenderers(main_renderer,
                                              subrenderers[alias]), conf);
    }
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
    var def = adapt_to_obj(nodetypes[this.type]);
    if (!def) report_error('Node type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || 'Unnamed';
    this.def = def;

    this.render = prepare_render_obj(noderenderers[this.type]);

    var myself = this;
    var event_conf = {
        'node/turn-on':  function(node) { return { node: myself } },
        'node/ready':    function(node) { return { node: myself } },
        'node/process':  function(channels) { return { inlets: channels[0], outlets: channels[1], node: myself } },
        'node/turn-off': function(node) { return { node: myself } },
        'inlet/add':     function(inlet) { return { inlet: inlet } },
        'inlet/remove':  function(inlet) { return { inlet: inlet } },
        'outlet/add':    function(outlet) { return { outlet: outlet } },
        'outlet/remove': function(outlet) { return { outlet: outlet } }
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
            // when new inlet was added, start monitoring its updates
            this.event['inlet/add'].flatMap(function(inlet) {
                var updates = inlet.event['inlet/update'].map(function(value) {
                    return { inlet: inlet, alias: inlet.alias, value: value };
                });
                if (myself.def.tune) updates = myself.def.tune(updates);
                return updates;
            // join inlet updates in one inlet_alias=value hash, plus store
            // previous values in a similar hash, add a source of update,
            // and return all three
            }).scan(function(values, update) {
                var alias = update.alias,
                    inlet = update.inlet;
                var prev_values, cur_values;
                if (!values) {
                    prev_values = {}; cur_values = {};
                    cur_values[alias] = update.value;
                    return { prev: prev_values, cur: cur_values, source: inlet };
                } else {
                    prev_values = values.prev; cur_values  = values.cur;
                    prev_values[alias] = cur_values[alias];
                    cur_values[alias]  = update.value;
                    values.source = inlet;
                    return values;
                }
            }, null).filter(function(updates) {
                return !(updates && updates.source.cold);
            }),
            // prepare an object with all new outlets names to know which
            // outlets are ready to be monitored for new values
            this.event['outlet/add'].scan(function(outlets, outlet) {
                var outlets = outlets || {};
                outlets[outlet.alias] = outlet;
                return outlets;
            }, null)
        ]).onValue(function(value) {
            // call a node/process event using collected inlet values
            var inlets_vals = value[0] || { prev: {}, cur: {} }; var outlets = value[1] || {};
            var outlets_vals = process_f(inlets_vals.cur, inlets_vals.prev);
            myself.event['node/process'].emit([inlets_vals.cur, outlets_vals, inlets_vals.prev]);
            // send the values provided from a `process` function to corresponding outlets
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
            var inlet = this.addInlet(conf.type, alias, conf.name, conf.default, conf.hidden, conf.readonly, conf.cold);
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
Node.prototype.turnOn = function() {
    this.event['node/turn-on'].emit(this);
}
Node.prototype.turnOff = function() {
    this.event['node/turn-off'].emit(this);
}
Node.prototype.addInlet = function(type, alias, name, _default, hidden, readonly, cold) {
    var inlet = new Inlet(type, this, alias, name, _default, hidden, readonly, cold);
    this.events.plug(inlet.events);
    this.event['inlet/add'].emit(inlet);
    inlet.toDefault();
    return inlet;
}
Node.prototype.addOutlet = function(type, alias, name, _default) {
    var outlet = new Outlet(type, this, alias, name, _default);
    this.events.plug(outlet.events);
    this.event['outlet/add'].emit(outlet);
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

function Inlet(type, node, alias, name, _default, hidden, readonly, cold) {
    this.type = type || 'core/number';
    this.id = short_uid();
    var def = adapt_to_obj(channeltypes[this.type]);
    if (!def) report_error('Inlet type ' + this.type + ' is not registered!');
    this.def = def;

    this.alias = alias || name || def.alias;
    if (!this.alias) report_error('Inlet should have either alias or name');
    this.name = name || this.alias || def.name || 'Unnamed';

    this.node = node;
    this.hidden = hidden || false;
    this.readonly = is_defined(readonly || def.readonly) ? readonly || def.readonly : true;
    this.cold = cold || false;
    this.default = is_defined(_default) ? _default : def.default;
    this.value = Kefir.bus();

    this.render = prepare_render_obj(channelrenderers[this.type]);

    var myself = this;
    var event_conf = {
        'inlet/update': function(value) { return { inlet: myself, value: value } }
    };
    this.event = event_map(event_conf);
    var orig_updates = this.event['inlet/update'];
    var updates = orig_updates.merge(this.value);
    if (def.tune) updates = def.tune(updates);
    if (def.accept) updates = updates.flatten(function(v) {
        if (def.accept(v)) { return [v]; } else { orig_updates.error(); return []; }
    });
    if (def.adapt) updates = updates.map(def.adapt);
    // rewrire with the modified stream
    this.event['inlet/update'] = updates.onValue(function(){});
    this.events = events_stream(event_conf, this.event);
}
Inlet.prototype.receive = function(value) {
    this.value.emit(value);
}
Inlet.prototype.stream = function(stream) {
    this.value.plug(stream);
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
    var def = adapt_to_obj(channeltypes[this.type]);
    if (!def) report_error('Outlet type ' + this.type + ' is not registered!');
    this.def = def;

    this.alias = alias || name || def.alias;
    if (!this.alias) report_error('Outlet should have either alias or name');
    this.name = name || this.alias || def.name || 'Unnamed';

    this.node = node;
    this.default = is_defined(_default) ? _default : def.default;
    this.value = Kefir.bus();

    this.render = prepare_render_obj(channelrenderers[this.type]);

    // outlets values are not editable

    var myself = this;
    var event_conf = {
        'outlet/update':     function(value) { return { outlet: myself, value: value } },
        'outlet/connect':    function(link)  { return { outlet: myself, link: link } },
        'outlet/disconnect': function(link) { return { outlet: myself, link: link } }
    };
    this.event = event_map(event_conf);
    this.event['outlet/update'] = this.event['outlet/update'].merge(this.value).onValue(function(){});
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
    return link;
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

// ================================= Link ======================================
// =============================================================================

function Link(type, outlet, inlet, adapter, name) {
    this.type = type || 'core/pass';
    this.id = short_uid();
    var def = adapt_to_obj(linktypes[this.type]);
    if (!def) report_error('Link type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || '';

    this.outlet = outlet;
    this.inlet = inlet;

    this.adapter = adapter || def.adapt || undefined;

    var myself = this;

    this.receiver = (outlet.node.id !== inlet.node.id)
        ? (function(link) {
            return function(x) {
                link.pass(x);
            }
          })(myself)
        : function(x) {
            // this avoids stack overflow on recursive connections
            setTimeout(function() { myself.pass(x); }, 0);
        };

    var event_conf = {
        'link/enable': function() { return { link: myself } },
        'link/disable': function() { return { link: myself } },
        'link/pass': function(value) { return { link: myself, value: value } },
        'link/adapt': function(values) { return { link: myself, before: values[0], after: values[1] } }
    };
    this.event = event_map(event_conf);
    this.events = events_stream(event_conf, this.event);

    this.enabled = Kefir.merge([ this.event['link/disable'].mapTo(false),
                                 this.event['link/enable'].mapTo(true) ]).toProperty(true);

    this.event['link/pass'].filterBy(this.enabled).onValue(function(x) {
        inlet.receive(myself.adapt(x));
    });

    // re-send last value on enable
    Kefir.sampledBy([ this.event['link/pass'] ],
                    [ this.event['link/enable'] ])
         .onValue(function(update) {
              myself.pass(update[0]);
          });
}
Link.prototype.pass = function(value) {
    this.event['link/pass'].emit(value);
}
Link.prototype.adapt = function(before) {
    if (this.adapter) {
        var after = this.adapter(before);
        this.event['link/adapt'].emit([before, after]);
        return after;
    } else {
        this.event['link/adapt'].emit([before, before]);
        return before;
    }
}
Link.prototype.enable = function() {
    this.event['link/enable'].emit();
}
Link.prototype.disable = function() {
    this.event['link/disable'].emit();
}
Link.prototype.disconnect = function() {
    this.outlet.disconnect(this);
}

// ================================== utils ====================================
// =============================================================================

function is_defined(val) {
    return (typeof val !== 'undefined');
}

function adapt_to_obj(val) {
    if (!val) return null;
    if (typeof val === 'function') return val();
    return val;
}

function prepare_render_obj(template) {
    if (!template) return {};
    var render_obj = {};
    for (var render_type in template) {
        render_obj[render_type] = adapt_to_obj(template[render_type]);
    }
    return render_obj;
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

function join_subrenderers(main_renderer, subrenderers, conf) {
    var src = subrenderers;
    var trg = [];
    for (var i = 0, il = src.length; i < il; i++) {
        trg.push(src[i](conf));
    }
    return function(target, update) {
        main_renderer(target, update);
        var renderers = trg;
        for (var i = 0, il = renderers.length; i < il; i++) {
            renderers[i](target, update);
        }
    };
}

// =========================== registration ====================================
// =============================================================================

function nodetype(type, def) {
    nodetypes[type] = def;
}

function linktype(type, def) {
    linktypes[type] = def;
}

function channeltype(type, def) {
    channeltypes[type] = def;
}

function renderer(alias, f) {
    renderer_registry[alias] = f;
}

function subrenderer(alias, f) {
    if (!subrenderers[alias]) subrenderers[alias] = [];
    subrenderers[alias].push(f);
}

function noderenderer(type, alias, data) {
    if (!nodetypes[type]) throw new Error('Node type ' + type + ' is not registered');
    if (!noderenderers[type]) noderenderers[type] = {};
    noderenderers[type][alias] = data;
}

function channelrenderer(type, alias, data) {
    if (!channeltypes[type]) throw new Error('Channel type ' + type + ' is not registered');
    if (!channelrenderers[type]) channelrenderers[type] = {};
    channelrenderers[type][alias] = data;
}

function nodedescription(type, description) {
    nodedescriptions[type] = description;
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
    'nodedescription': nodedescription,

    'renderer': renderer,
    'subrenderer': subrenderer,
    'noderenderer': noderenderer,
    'channelrenderer': channelrenderer,

    'allNodeTypes': nodetypes,
    'allDescriptions': nodedescriptions,

    'short_uid': short_uid,

    'currentModel': function() { return models[cur_model]; }
}

})();
