;(function(global) {
  "use strict";

var Kefir = global.Kefir;
if ((typeof Kefir === 'undefined') &&
    (typeof require !== 'undefined')) Kefir = require('../vendor/kefir.min.js');
if (!Kefir) throw new Error('Kefir.js (https://github.com/rpominov/kefir) is required for Rpd to work');

var VERSION = 'v2.0';

var Rpd = (function() {

injectKefirEmitter();

// Rpd.NOTHING, Rpd.ID_LENGTH, ...

var nodetypes = {};
var channeltypes = {};
var noderenderers = {};
var channelrenderers = {};
var nodedescriptions = {};
var styles = {};

var renderer_registry = {};

var event_types = { 'network/add-patch': [ 'patch' ] };
var event = event_map(event_types);
var events = events_stream(event_types, event, 'network', Rpd);

event['network/add-patch'].onValue(function(patch) { events.plug(patch.events); });

var rendering = Kefir.emitter();

function ƒ(v) { return function() { return v; } }

function addPatch(name) {
    var instance = new Patch(name);
    event['network/add-patch'].emit(instance);
    return instance;
}

function render(aliases, targets, conf) {
    rendering.emit([ aliases, targets, conf ]);
    var handler = function(patch) { patch.render(aliases, targets, conf); };
    event['network/add-patch'].onValue(handler);
    return function() { event['network/add-patch'].offValue(handler); };
}

// =============================================================================
// ================================== Patch ====================================
// =============================================================================

function Patch(name) {
    this.id = short_uid();
    this.name = name;

    var patch = this;

    var event_types = {
        'patch/is-ready':    [ ],
        'patch/enter':       [ ],
        'patch/exit':        [ ],
        'patch/set-inputs':  [ 'inputs' ],
        'patch/set-outputs': [ 'outputs' ],
        'patch/project':     [ 'node', 'target' ],
        'patch/refer':       [ 'node', 'target' ],
        'patch/add-node':    [ 'node' ],
        'patch/remove-node': [ 'node' ]
    };
    this.event = event_map(event_types);
    this.events = events_stream(event_types, this.event, 'patch', this);

    // this stream controls the way patch events reach the assigned renderer
    this.renderQueue = Kefir.emitter();
    var renderStream = Kefir.combine([ this.events ],
                  [ this.renderQueue.scan(function(storage, event) {
                        var alias = event.alias, target = event.target, configuration = event.config;
                        var renderer = storage[alias];
                        if (!renderer) {
                            renderer = {};
                            renderer.produce = renderer_registry[alias](patch);
                            renderer.handlers = [];
                            storage[alias] = renderer;
                        }
                        if (renderer.produce) {
                            var handler = renderer.produce(target, configuration);
                            if (handler) {
                                renderer.handlers.push(
                                    (typeof handler === 'function') ? handler
                                                                    : function(event) {
                                                                          if (handler[event.type]) handler[event.type](event);
                                                                      } );
                            }
                        }
                        return storage;
                    }, {}) ]);
    // we need to wait for first renderer and then push there events happened before, then proceed
    renderStream = renderStream.bufferBy(this.renderQueue).take(1).flatten().concat(renderStream);
    renderStream.onValue(function(value) {
                    var event = value[0], renderers = value[1];
                    var aliases = Object.keys(renderers);
                    var renderer, handlers;
                    for (var i = 0, il = aliases.length; i < il; i++) {
                        renderer = renderers[aliases[i]]; handlers = renderer.handlers;
                        for (var j = 0, jl = handlers.length; j < jl; j++) {
                            handlers[j](inject_render(clone_obj(event), aliases[i]));
                        }
                    }
                });

    // projections are connections between different patches; patch inlets looking in the outer
    // world are called "inputs" here, and outlets looking in the outer world are, correspondingly,
    // called "outlets"
    this.projections = Kefir.emitter();
    Kefir.combine(
        [ this.projections ],
        [ this.event['patch/set-inputs'],
          this.event['patch/set-outputs'] ]
    ).onValue(function(value) {
        var node = value[0], inputs = value[1], outputs = value[2];
        var inlet, outlet, input, output;
        for (var i = 0; i < inputs.length; i++) {
            inlet = node.addInlet(inputs[i].type, inputs[i].name);
            inlet.event['inlet/update'].onValue((function(input) {
                return function(value) { input.receive(value); };
            })(inputs[i]));
        } // use inlet.onUpdate?
        for (i = 0; i < outputs.length; i++) {
            outlet = node.addOutlet(outputs[i].type, outputs[i].name);
            outputs[i].event['outlet/update'].onValue((function(outlet) {
                return function(value) { outlet.send(value); };
            })(outlet));
        } // use output.onUpdate?
        patch.event['patch/project'].emit({ node: node, target: node.patch });
        node.patch.event['patch/refer'].emit({ node: node, target: patch });
    });

    this.nodesToRemove = Kefir.emitter();

    this.event['patch/is-ready'].emit();
}
Patch.prototype.render = function(aliases, targets, config) {
    aliases = Array.isArray(aliases) ? aliases : [ aliases ];
    targets = Array.isArray(targets) ? targets : [ targets ];
    for (var i = 0, il = aliases.length, alias; i < il; i++) {
        for (var j = 0, jl = targets.length, target; j < jl; j++) {
            alias = aliases[i]; target = targets[j];
            if (!renderer_registry[alias]) throw new Error('Renderer ' + alias + ' is not registered');
            this.renderQueue.emit({ alias: alias, target: target, config: config });
        }
    }
    return this;
}
Patch.prototype.addNode = function(type, name) {
    var patch = this;

    var node = new Node(type, this, name, function(node) {
        patch.events.plug(node.events);
        patch.event['patch/add-node'].emit(node);

        node.turnOn();
    });

    return node;
}
Patch.prototype.removeNode = function(node) {
    node.turnOff();
    this.event['patch/remove-node'].emit(node);
    this.events.unplug(node.events);
}
Patch.prototype.enter = function() {
    this.event['patch/enter'].emit();
    return this;
}
Patch.prototype.exit = function() {
    this.event['patch/exit'].emit();
    return this;
}
Patch.prototype.inputs = function(list) {
    this.event['patch/set-inputs'].emit(list);
}
Patch.prototype.outputs = function(list) {
    this.event['patch/set-outputs'].emit(list);
}
Patch.prototype.project = function(node) {
    this.projections.emit(node);
}

// =============================================================================
// ================================= Node ======================================
// =============================================================================

function Node(type, patch, name, callback) {
    this.type = type || 'core/empty';
    this.id = short_uid();
    var def = adapt_to_obj(nodetypes[this.type], this);
    if (!def) report_error('Node type ' + this.type + ' is not registered!');
    this.def = def;

    this.name = name || def.name || type;

    this.patch = patch;

    this.render = prepare_render_obj(noderenderers[this.type], this);

    var event_types = {
        'node/turn-on':       [ ],
        'node/is-ready':      [ ],
        'node/process':       [ 'inlets', 'outlets' ],
        'node/turn-off':      [ ],
        'node/add-inlet':     [ 'inlet' ],
        'node/remove-inlet':  [ 'inlet' ],
        'node/add-outlet':    [ 'outlet' ],
        'node/remove-outlet': [ 'outlet' ],
        'node/move':          [ 'position' ]
    };
    this.event = event_map(event_types);
    this.events = events_stream(event_types, this.event, 'node', this);

    if (callback) callback(this);

    var node = this;

    if (this.def.handle) {
        this.events.onValue(function(event) {
            if (node.def.handle[event.type]) {
                node.def.handle[event.type](event);
            };
        });
    }

    if (this.def.process) {

        var process_f = this.def.process;

        var process = Kefir.combine([

            // when new inlet was added, start monitoring its updates
            // as an active stream
            this.event['node/add-inlet'].flatMap(function(inlet) {
                var updates = inlet.event['inlet/update'].map(function(value) {
                    return { inlet: inlet, value: value };
                });;
                if (node.def.tune) updates = node.def.tune(updates);
                return updates;
            })

        ],
        [
            // collect all the existing outlets aliases as a passive stream
            this.event['node/add-outlet'].scan(function(storage, outlet) {
                storage[outlet.alias] = outlet;
                return storage;
            }, {})

        ])

        // do not fire any event until node is ready, then immediately fire them one by one, if any occured;
        // later events are fired after node/is-ready, corresponding to their time of firing, as usual
        process = process.bufferBy(this.event['node/is-ready']).take(1).flatten().concat(process);

        process = process.scan(function(storage, update) {
            // update[0] is inlet value update, update[1] is a list of outlets
            var inlet = update[0].inlet;
            var alias = inlet.alias;
            storage.inlets.prev[alias] = storage.inlets.cur[alias];
            storage.inlets.cur[alias] = update[0].value;
            storage.outlets = update[1];
            storage.source = inlet;
            return storage;
        }, { inlets: { prev: {}, cur: {} }, outlets: {} }).changes();

        // filter cold inlets, so the update data will be stored, but process event won't fire
        process = process.filter(function(data) { return !data.source.cold; });

        process.onValue(function(data) {
            // call a node/process event using collected inlet values
            var outlets_vals = process_f.bind(node)(data.inlets.cur, data.inlets.prev);
            node.event['node/process'].emit({ inlets: data.inlets.cur, outlets: outlets_vals });
            // send the values provided from a `process` function to corresponding outlets
            var outlets = data.outlets;
            for (var outlet_name in outlets_vals) {
                if (outlets[outlet_name]) {
                    if (outlets_vals[outlet_name] instanceof Kefir.Stream) {
                        outlets[outlet_name].stream(outlets_vals[outlet_name]);
                    } else {
                        outlets[outlet_name].send(outlets_vals[outlet_name]);
                    }
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

    this.event['node/is-ready'].emit();
}
Node.prototype.turnOn = function() {
    this.event['node/turn-on'].emit();
}
Node.prototype.turnOff = function() {
    this.event['node/turn-off'].emit();
}
Node.prototype.addInlet = function(type, alias, name, _default, hidden, readonly, cold) {
    var inlet = new Inlet(type, this, alias, name, _default, hidden, readonly, cold);
    this.events.plug(inlet.events);

    //this.events['outlet/connect'].filter(function(update) { return update.inlet.id === inlet.id; })

    this.event['node/add-inlet'].emit(inlet);
    inlet.toDefault();
    return inlet;
}
Node.prototype.addOutlet = function(type, alias, name, _default) {
    var outlet = new Outlet(type, this, alias, name, _default);
    this.events.plug(outlet.events);
    this.event['node/add-outlet'].emit(outlet);
    outlet.toDefault();
    return outlet;
}
Node.prototype.removeInlet = function(inlet) {
    this.event['node/remove-inlet'].emit(inlet);
    this.events.unplug(inlet.events);
}
Node.prototype.removeOutlet = function(outlet) {
    this.event['node/remove-outlet'].emit(outlet);
    this.events.unplug(outlet.events);
}
Node.prototype.move = function(x, y) {
    this.event['node/move'].emit([ x, y ]);
    return this;
}

// =============================================================================
// ================================== Inlet ====================================
// =============================================================================

function Inlet(type, node, alias, name, _default, hidden, readonly, cold) {
    this.type = type || 'core/any';
    this.id = short_uid();
    var def = adapt_to_obj(channeltypes[this.type], this);
    if (!def) report_error('Channel type ' + this.type + ' is not registered!');
    this.def = def;

    this.alias = alias || def.alias || name;
    if (!this.alias) report_error('Inlet should have either alias or name');
    this.name = name || def.name || this.alias || type;

    this.node = node;
    this.hidden = hidden || false;
    this.readonly = is_defined(readonly || def.readonly) ? readonly || def.readonly : true;
    this.cold = cold || false;
    this.default = is_defined(_default) ? _default : def.default;
    this.value = Kefir.pool();

    this.render = prepare_render_obj(channelrenderers[this.type], this);

    var event_types = {
        'inlet/update': [ 'value' ]
    };
    this.event = event_map(event_types);
    var orig_updates = this.event['inlet/update'];
    var updates = orig_updates.merge(this.value);
    if (def.tune) updates = def.tune(updates)
    if (def.accept) updates = updates.flatten(function(v) {
        if (def.accept(v)) { return [v]; } else { orig_updates.error(); return []; }
    });
    if (def.adapt) updates = updates.map(def.adapt);
    // rewrite with the modified stream
    this.event['inlet/update'] = updates.onValue(function(){});
    this.events = events_stream(event_types, this.event, 'inlet', this);
}
Inlet.prototype.receive = function(value) {
    this.value.plug(Kefir.constant(value));
}
Inlet.prototype.stream = function(stream) {
    this.value.plug(stream);
}
Inlet.prototype.toDefault = function() {
    if (is_defined(this.default)) {
        if (this.default instanceof Kefir.Stream) {
            this.stream(this.default);
        } else this.receive(this.default);
    }
}

// =============================================================================
// ================================= Outlet ====================================
// =============================================================================

function Outlet(type, node, alias, name, _default) {
    this.type = type || 'core/any';
    this.id = short_uid();
    var def = adapt_to_obj(channeltypes[this.type], this);
    if (!def) report_error('Channel type ' + this.type + ' is not registered!');
    this.def = def;

    this.alias = alias || def.alias || name;
    if (!this.alias) report_error('Outlet should have either alias or name');
    this.name = name || this.alias || def.name || type;

    this.node = node;
    this.default = is_defined(_default) ? _default : def.default;
    this.value = Kefir.pool();

    this.render = prepare_render_obj(channelrenderers[this.type], this);

    // outlets values are not editable

    var event_types = {
        'outlet/update':     [ 'value' ],
        'outlet/connect':    [ 'link', 'inlet' ],
        'outlet/disconnect': [ 'link' ]
    };
    this.event = event_map(event_types);
    var orig_updates = this.event['outlet/update'];
    var updates = orig_updates.merge(this.value);
    // rewrite with the modified stream
    this.event['outlet/update'] = updates.onValue(function(v){});
    this.events = events_stream(event_types, this.event, 'outlet', this);

    // re-send last value on connection
    var outlet = this;
    Kefir.combine([ this.event['outlet/connect'] ],
                  [ this.event['outlet/update'] ])
         .onValue(function(update) {
             outlet.value.plug(Kefir.constant(update[1]));
         });

}
Outlet.prototype.connect = function(inlet) {
    if (!this.allows(inlet)) {
        throw new Error('Outlet of type ' + this.type + ' is not allowed to connect to inlet of type ' + inlet.type);
    }
    var link = new Link(this, inlet);
    this.events.plug(link.events);
    this.value.onValue(link.receiver);
    this.event['outlet/connect'].emit({ link: link, inlet: inlet });
    return link;
}
Outlet.prototype.disconnect = function(link) {
    this.event['outlet/disconnect'].emit(link);
    this.value.offValue(link.receiver);
    this.events.unplug(link.events);
    return this;
}
Outlet.prototype.send = function(value) {
    this.value.plug(Kefir.constant(value));
}
Outlet.prototype.stream = function(stream) {
    this.value.plug(stream);
}
Outlet.prototype.toDefault = function() {
    if (is_defined(this.default)) {
        if (this.default instanceof Kefir.Stream) {
            this.stream(this.default);
        } else this.send(this.default);
    }
}
Outlet.prototype.allows = function(inlet) {
    if (inlet.type === this.type) return true;
    if (!this.def.allow && (inlet.type !== this.type)) return false;
    if (!inlet.def.allow && (inlet.type !== this.type)) return false;
    if (this.def.allow || inlet.def.allow) {
        var matchedOutlet = false;
        this.def.allow.forEach(function(allowedType) {
            if (inlet.type === allowedType) { matchedOutlet = true; };
        });
        var matchedInlet = false;
        inlet.def.allow.forEach(function(allowedType) {
            if (this.type === allowedType) { matchedInlet = true; };
        }.bind(this));
        return matchedOutlet && matchedInlet;
    }
    return true;
}

// =============================================================================
// ================================= Link ======================================
// =============================================================================

function Link(outlet, inlet, name) {
    this.id = short_uid();

    this.name = name || '';

    this.outlet = outlet;
    this.inlet = inlet;

    this.value = Kefir.emitter();

    var link = this;

    this.receiver = (outlet.node.id !== inlet.node.id)
        ? function(x) { link.pass(x); }
        : function(x) {
            // this avoids stack overflow on recursive connections
            setTimeout(function() { link.pass(x); }, 0);
        };

    var event_types = {
        'link/enable':  [ ],
        'link/disable': [ ],
        'link/pass':    [ 'value' ]
    };

    this.event = event_map(event_types);
    var orig_updates = this.event['link/pass'];
    var updates = orig_updates.merge(this.value);
    // rewrite with the modified stream
    this.event['link/pass'] = updates.onValue(function(v){});
    this.events = events_stream(event_types, this.event, 'link', this);

    this.enabled = Kefir.merge([ this.event['link/disable'].map(ƒ(false)),
                                 this.event['link/enable'].map(ƒ(true)) ]).toProperty(ƒ(true));

    this.event['link/pass'].filterBy(this.enabled).onValue(function(value) {
        inlet.receive(value);
    });

    // re-send last value on enable
    Kefir.combine([ this.event['link/enable'] ],
                  [ this.event['link/pass'] ])
         .onValue(function(event) {
              link.pass(event[1]);
          });
}
Link.prototype.pass = function(value) {
    this.value.emit(value);
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

// =============================================================================
// ================================== utils ====================================
// =============================================================================

function injectKefirEmitter() {
    Kefir.emitter = function() {
        var e, stream = Kefir.stream(function(_e) {
            e = _e; return function() { e = undefined; }
        });
        stream.emit = function(x) { e && e.emit(x); return this; }
        stream.error = function(x) { e && e.error(x); return this; }
        stream.end = function() { e && e.end(); return this; }
        stream.emitEvent = function(x) { e && e.emitEvent(x); return this; }
        return stream.setName('emitter');
    }
}

function clone_obj(src) {
    // this way is not a deep-copy and actually not cloning at all, but that's ok,
    // since we use it few times for events, which are simple objects and the objects they
    // pass, should be the same objects they got; just events by themselves should be different.
    var res = {}; var keys = Object.keys(src);
    for (var i = 0, il = keys.length; i < il; i++) {
        res[keys[i]] = src[keys[i]];
    }
    return res;
}

function is_defined(val) {
    return (typeof val !== 'undefined');
}

function adapt_to_obj(val, subj) {
    if (!val) return null;
    if (typeof val === 'function') return val(subj);
    return val;
}

function prepare_render_obj(template, subj) {
    if (!template) return {};
    var render_obj = {};
    for (var render_type in template) {
        render_obj[render_type] = adapt_to_obj(template[render_type], subj);
    }
    return render_obj;
}

function event_map(conf) {
    var map = {}; var types = Object.keys(conf);
    for (var i = 0, type; i < types.length; i++) {
        type = types[i];
        map[type] = Kefir.emitter();
    }
    return map;
}

function map_events(type, spec) {
    if (spec.length === 0) return function() { return { type: type } };
    if (spec.length === 1) return function(value) { var evt = {}; evt.type = type; evt[spec[0]] = value; return evt; };
    if (spec.length > 1)   return function(event) { event = clone_obj(event); event.type = type; return event; };
}
function events_stream(conf, event_map, subj_as, subj) {
    var stream = Kefir.pool(); var types = Object.keys(conf);
    for (var i = 0; i < types.length; i++) {
        stream.plug(event_map[types[i]]
                         .map(map_events(types[i], conf[types[i]]))
                         .map(function(evt) {
                             evt[subj_as] = subj;
                             return evt;
                         }));
    }
    return stream;
}

function report_error(desc, err) {
    throw err || new Error(desc);
}

function short_uid() {
    return ("0000" + (Math.random() * Math.pow(36,4) << 0).toString(36)).slice(-4);
}

function inject_render(update, alias) {
    var type = update.type;
    if ((type === 'patch/add-node') || (type === 'node/process')) {
        update.render = update.node.render[alias] || {};
    } else if ((type === 'node/add-inlet')  || (type === 'inlet/update')) {
        update.render = update.inlet.render[alias] || {};
    } else if ((type === 'node/add-outlet')  || (type === 'outlet/update')) {
        update.render = update.outlet.render[alias] || {};
    }
    return update;
}

function getStyle(name, renderer) {
    if (!name) throw new Error('Unknown style requested: ' + name);
    if (!styles[name]) throw new Error('Style \'' + name + '\' is not registered');
    var style = styles[name][renderer];
    if (!style) throw new Error('Style \'' + name + '\' has no definition for \'' + renderer + '\' renderer');
    return style;
}

// =============================================================================
// =========================== registration ====================================
// =============================================================================

function nodetype(type, def) {
    nodetypes[type] = def || {};
}

function channeltype(type, def) {
    channeltypes[type] = def || {};
}

function renderer(alias, f) {
    renderer_registry[alias] = f;
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

function style(name, renderer, func) {
    if (!styles[name]) styles[name] = {};
    styles[name][renderer] = func;
}

// =============================================================================
// =============================== export ======================================
// =============================================================================

return {

    'VERSION': VERSION,

    '_': { 'Patch': Patch, 'Node': Node, 'Inlet': Inlet, 'Outlet': Outlet, 'Link': Link },

    'unit': ƒ,
    'not': function(value) { return !value; },

    'event': event,
    'events': events,

    'addPatch': addPatch,
    'render': render,

    'nodetype': nodetype,
    'channeltype': channeltype,
    'nodedescription': nodedescription,

    'renderer': renderer, 'styles': styles, 'style': style,
    'noderenderer': noderenderer,
    'channelrenderer': channelrenderer,

    'import': {}, 'export': {},

    'allNodeTypes': nodetypes,
    'allNodeDescriptions': nodedescriptions,

    'getStyle': getStyle,

    'short_uid': short_uid
}

})();

if (typeof define === 'function' && define.amd) {
    define([], function() { return Rpd; });
    global.Rpd = Rpd;
} else if (typeof module === "object" && typeof exports === "object") {
    module.exports = Rpd;
    Rpd.Rpd = Rpd;
} else {
    global.Rpd = Rpd;
}

}(this));
