;(function(global) {
  "use strict";

var Kefir = global.Kefir;
if ((typeof Kefir === 'undefined') &&
    (typeof require !== 'undefined')) Kefir = require('../vendor/kefir.min.js');
if (!Kefir) throw new Error('Kefir.js (https://github.com/rpominov/kefir) is required for Rpd to work');

var VERSION = 'v2.0.0-alpha';

var Rpd = (function() {

injectKefirEmitter();

// Rpd.NOTHING, Rpd.ID_LENGTH, ...

//var PATCH_PROPS = [ 'title', '*handle' ];
var nodetypes = {}; var NODE_PROPS = [ 'title', '*inlets', '*outlets', 'prepare', 'process', 'tune', '*handle' ];
var channeltypes = {}; var INLET_PROPS = [ 'label', 'default', 'hidden', 'cold', 'readonly', 'allow', 'accept', 'adapt', 'tune', 'show', '*handle' ];
                       var OUTLET_PROPS = [ 'label', 'tune', 'show', '*handle' ];
                       var CHANNEL_PROPS = INLET_PROPS;
var noderenderers = {}; var NODE_RENDERER_PROPS = [ 'prepare', 'size', 'first', 'always' ];
var channelrenderers = {}; var CHANNEL_RENDERER_PROPS = [ 'prepare', 'show', 'edit' ];
var nodedescriptions = {};
var styles = {};
var nodetypeicons = {};
var toolkiticons = {};

var renderer_registry = {};

var event_types = { 'network/add-patch': [ 'patch' ] };
var rpdEvent = create_event_map(event_types);
var rpdEvents = create_events_stream(event_types, rpdEvent, 'network', Rpd);

rpdEvent['network/add-patch'].onValue(function(patch) { rpdEvents.plug(patch.events); });

var rendering;

function ƒ(v) { return function() { return v; } }

function create_rendering_stream() {
    var rendering = Kefir.emitter();
    rendering.map(function(rule) {
        return {
            rule: rule,
            func: function(patch) {
                patch.render(rule.aliases, rule.targets, rule.config)
            }
        }
    }).scan(function(prev, curr) {
        if (prev) rpdEvent['network/add-patch'].offValue(prev.func);
        rpdEvent['network/add-patch'].onValue(curr.func);
        return curr;
    }, null).last().onValue(function(last) {
        rpdEvent['network/add-patch'].offValue(last.func);
    });
    return rendering;
}

function /*Rpd.*/renderNext(aliases, targets, conf) {
    if (!rendering) rendering = create_rendering_stream();
    rendering.emit({ aliases: aliases, targets: targets, config: conf });
}

function /*Rpd.*/stopRendering() {
    if (rendering) {
        rendering.end();
        rendering = null;
    }
}

function /*Rpd.*/addPatch(arg0, arg1, arg2) {
    return addClosedPatch(arg0, arg1).open(arg2);
}

function /*Rpd.*/addClosedPatch(arg0, arg1) {
    var name = !is_object(arg0) ? arg0 : undefined; var def = arg1 || arg0;
    var instance = new Patch(arg0, arg1 || arg0);
    rpdEvent['network/add-patch'].emit(instance);
    return instance;
}

// =============================================================================
// ================================== Patch ====================================
// =============================================================================

function Patch(name, def) {
    this.id = short_uid();
    this.name = name;
    this.def = def || {};

    var patch = this;

    var event_types = {
        'patch/is-ready':      [ ],
        'patch/open':          [ 'parent' ],
        'patch/close':         [ ],
        'patch/move-canvas':   [ 'position' ],
        'patch/resize-canvas': [ 'size' ],
        'patch/set-inputs':    [ 'inputs' ],
        'patch/set-outputs':   [ 'outputs' ],
        'patch/project':       [ 'node', 'target' ],
        'patch/refer':         [ 'node', 'target' ],
        'patch/add-node':      [ 'node' ],
        'patch/remove-node':   [ 'node' ]
    };
    this.event = create_event_map(event_types);
    this.events = create_events_stream(event_types, this.event, 'patch', this);

    if (this.def.handle) subscribe(this.events, this.def.handle);

    // this stream controls the way patch events reach the assigned renderer
    this.renderQueue = Kefir.emitter();
    var renderStream = Kefir.combine([ this.events ],
                  [ this.renderQueue.scan(function(storage, rule) {
                        var alias = rule.alias, target = rule.target, configuration = rule.config;
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
    // called "outputs"
    this.projections = Kefir.emitter();
    Kefir.combine(
        [ this.projections ],
        [ this.event['patch/set-inputs'],
          this.event['patch/set-outputs'] ]
    ).onValue(function(value) {
        var node = value[0], inputs = value[1], outputs = value[2];
        var inlet, outlet, input, output;
        for (var i = 0; i < inputs.length; i++) {
            inlet = node.addInlet(inputs[i].type, inputs[i].alias, inputs[i].def, inputs[i].render);
            inlet.event['inlet/update'].onValue((function(input) {
                return function(value) { input.receive(value); };
            })(inputs[i]));
        } // use inlet.onUpdate?
        for (i = 0; i < outputs.length; i++) {
            outlet = node.addOutlet(outputs[i].type, outputs[i].alias, outputs[i].def, outputs[i].render);
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
            if (!renderer_registry[alias]) report_system_error(this, 'patch', 'Renderer \'' + alias + '\' is not registered');
            this.renderQueue.emit({ alias: alias, target: target, config: config });
        }
    }
    return this;
}
Patch.prototype.addNode = function(type, arg1, arg2, arg3) {
    var patch = this;

    var def = arg2 ? arg2 : (is_object(arg1) ? (arg1 || {}) : {});
    var title = is_object(arg1) ? undefined : arg1;
    if (title) def.title = title;
    var render = (arg1 && is_object(arg1)) ? arg2 : arg3;

    var node = new Node(type, this, def, render, function(node) {
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
Patch.prototype.open = function(parent) {
    this.event['patch/open'].emit(parent);
    return this;
}
Patch.prototype.close = function() {
    this.event['patch/close'].emit();
    return this;
}
Patch.prototype.inputs = function(list) {
    this.event['patch/set-inputs'].emit(list);
    return this;
}
Patch.prototype.outputs = function(list) {
    this.event['patch/set-outputs'].emit(list);
    return this;
}
Patch.prototype.project = function(node) {
    this.projections.emit(node);
    return this;
}
Patch.prototype.moveCanvas = function(x, y) {
    this.event['patch/move-canvas'].emit([x, y]);
    return this;
}
Patch.prototype.resizeCanvas = function(width, height) {
    this.event['patch/resize-canvas'].emit([width, height]);
    return this;
}

// =============================================================================
// ================================= Node ======================================
// =============================================================================

function Node(type, patch, def, render, callback) {
    this.type = type || 'core/basic';
    this.toolkit = extract_toolkit(type);
    this.id = short_uid();
    this.patch = patch;

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
    this.event = create_event_map(event_types);
    this.events = create_events_stream(event_types, this.event, 'node', this);

    var type_def = adapt_to_obj(nodetypes[this.type], this);
    if (!type_def) report_system_error(this, 'node', 'Node type \'' + this.type + '\' is not registered!');
    this.def = join_definitions(NODE_PROPS, def, type_def);

    this.render = join_render_definitions(NODE_RENDERER_PROPS, render,
                      prepare_render_obj(noderenderers[this.type], this));

    if (callback) callback(this);

    var node = this;

    if (this.def.handle) subscribe(this.events, this.def.handle);

    if (this.def.process) {

        var process_f = this.def.process;

        var process = Kefir.combine([

            // when new inlet was added, start monitoring its updates
            // as an active stream
            this.event['node/add-inlet'].flatMap(function(inlet) {
                var updates = inlet.event['inlet/update'].map(function(value) {
                    return { inlet: inlet, value: value };
                });;
                if (node.def.tune) updates = node.def.tune.bind(node)(updates);
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
        process = process.filter(function(data) { return !data.source.def.cold; });

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
            var inlet = this.addInlet(conf.type, alias, conf);
            this.inlets[alias] = inlet;
        }
    }

    if (this.def.outlets) {
        this.outlets = {};
        for (var alias in this.def.outlets) {
            var conf = this.def.outlets[alias];
            var outlet = this.addOutlet(conf.type, alias, conf);
            this.outlets[alias] = outlet;
        }
    }

    if (this.def.prepare) this.def.prepare.bind(this)(this.inlets, this.outlets);

    this.event['node/is-ready'].emit();
}
Node.prototype.turnOn = function() {
    this.event['node/turn-on'].emit();
    return this;
}
Node.prototype.turnOff = function() {
    this.event['node/turn-off'].emit();
    return this;
}
Node.prototype.addInlet = function(type, alias, arg2, arg3, arg4) {
    var def = arg3 ? arg3 : (is_object(arg2) ? (arg2 || {}) : {});
    var label = is_object(arg2) ? undefined : arg2;
    if (label) def.label = label;
    var render = (arg2 && is_object(arg2)) ? arg3 : arg4;

    var inlet = new Inlet(type, this, alias, def, render);
    this.events.plug(inlet.events);

    this.event['node/add-inlet'].emit(inlet);
    inlet.toDefault();
    return inlet;
}
Node.prototype.addOutlet = function(type, alias, arg2, arg3, arg4) {
    var def = arg3 ? arg3 : (is_object(arg2) ? (arg2 || {}) : {});
    var label = is_object(arg2) ? undefined : arg2;
    if (label) def.label = label;
    var render = (arg2 && is_object(arg2)) ? arg3 : arg4;

    var outlet = new Outlet(type, this, alias, def, render);
    this.events.plug(outlet.events);
    this.event['node/add-outlet'].emit(outlet);
    outlet.toDefault();
    return outlet;
}
Node.prototype.removeInlet = function(inlet) {
    this.event['node/remove-inlet'].emit(inlet);
    this.events.unplug(inlet.events);
    return this;
}
Node.prototype.removeOutlet = function(outlet) {
    this.event['node/remove-outlet'].emit(outlet);
    this.events.unplug(outlet.events);
    return this;
}
Node.prototype.move = function(x, y) {
    this.event['node/move'].emit([ x, y ]);
    return this;
}

// =============================================================================
// ================================== Inlet ====================================
// =============================================================================

function Inlet(type, node, alias, def, render) {
    this.type = type || 'core/any';
    this.toolkit = extract_toolkit(type);
    this.id = short_uid();
    this.alias = alias;
    this.node = node;

    var type_def = adapt_to_obj(channeltypes[this.type], this);
    if (!type_def) report_system_error(this, 'inlet', 'Channel type \'' + this.type + '\' is not registered!');
    this.def = join_definitions(INLET_PROPS, def, type_def);

    if (!this.alias) report_error(this, 'inlet', 'Inlet should have an alias');

    this.value = Kefir.pool();

    this.render = join_render_definitions(CHANNEL_RENDERER_PROPS, render,
                      prepare_render_obj(channelrenderers[this.type], this));

    var event_types = {
        'inlet/update': [ 'value' ]
    };
    this.event = create_event_map(event_types);
    var orig_updates = this.event['inlet/update'];
    var updates = orig_updates.merge(this.value);
    if (this.def.tune) updates = this.def.tune.bind(this)(updates);
    if (this.def.accept) updates = updates.flatten(function(v) {
        if (this.def.accept(v)) { return [v]; } else {
            orig_updates.error(make_silent_error(this, 'inlet')); return [];
        }
    }.bind(this));
    if (this.def.adapt) updates = updates.map(this.def.adapt);
    // rewrite with the modified stream
    this.event['inlet/update'] = updates.onValue(function(){});
    this.events = create_events_stream(event_types, this.event, 'inlet', this);

    if (this.def.handle) subscribe(this.events, this.def.handle);
}
Inlet.prototype.receive = function(value) {
    this.value.plug(Kefir.constant(value));
    return this;
}
Inlet.prototype.stream = function(stream) {
    this.value.plug(stream);
    return this;
}
Inlet.prototype.toDefault = function() {
    if (is_defined(this.def.default)) {
        if (this.def.default instanceof Kefir.Stream) {
            this.stream(this.def.default);
        } else this.receive(this.def.default);
    }
    return this;
}
Inlet.prototype.allows = function(outlet) {
    if (outlet.type === this.type) return true;
    if (!this.def.allow && (outlet.type !== this.type)) return false;
    if (this.def.allow) {
        var matched = false;
        this.def.allow.forEach(function(allowedType) {
            if (outlet.type === allowedType) { matched = true; };
        });
        return matched;
    }
    return true;
}

// =============================================================================
// ================================= Outlet ====================================
// =============================================================================

function Outlet(type, node, alias, def, render) {
    this.type = type || 'core/any';
    this.toolkit = extract_toolkit(type);
    this.id = short_uid();
    this.alias = alias;
    this.node = node;

    var type_def = adapt_to_obj(channeltypes[this.type], this);
    if (!type_def) report_system_error(this, 'outlet', 'Channel type \'' + this.type + '\' is not registered!');
    this.def = join_definitions(OUTLET_PROPS, def, type_def);

    if (!this.alias) report_error(this, 'outlet', 'Outlet should have an alias');

    this.value = Kefir.pool();

    this.render = join_render_definitions(CHANNEL_RENDERER_PROPS, render,
                      prepare_render_obj(channelrenderers[this.type], this));

    // outlets values are not editable

    var event_types = {
        'outlet/update':     [ 'value' ],
        'outlet/connect':    [ 'link', 'inlet' ],
        'outlet/disconnect': [ 'link' ]
    };
    this.event = create_event_map(event_types);
    var orig_updates = this.event['outlet/update'];
    var updates = orig_updates.merge(this.value);
    // rewrite with the modified stream
    this.event['outlet/update'] = updates.onValue(function(v){});
    this.events = create_events_stream(event_types, this.event, 'outlet', this);

    if (this.def.handle) subscribe(this.events, this.def.handle);

    // re-send last value on connection
    var outlet = this;
    Kefir.combine([ this.event['outlet/connect'] ],
                  [ this.event['outlet/update'] ])
         .onValue(function(update) {
             outlet.value.plug(Kefir.constant(update[1]));
         });

}
Outlet.prototype.connect = function(inlet) {
    if (!inlet.allows(this)) {
        report_error(this, 'outlet', 'Outlet of type \'' + this.type + '\' is not allowed to connect to inlet of type \'' + inlet.type + '\'');
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
    return this;
}
Outlet.prototype.stream = function(stream) {
    this.value.plug(stream);
    return this;
}
Outlet.prototype.toDefault = function() {
    if (is_defined(this.def.default)) {
        if (this.def.default instanceof Kefir.Stream) {
            this.stream(this.def.default);
        } else this.send(this.def.default);
    }
    return this;
}

// =============================================================================
// ================================= Link ======================================
// =============================================================================

function Link(outlet, inlet, label) {
    this.id = short_uid();

    this.name = label || '';

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

    this.event = create_event_map(event_types);
    var orig_updates = this.event['link/pass'];
    var updates = orig_updates.merge(this.value);
    // rewrite with the modified stream
    this.event['link/pass'] = updates.onValue(function(v){});
    this.events = create_events_stream(event_types, this.event, 'link', this);

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
    return this;
}
Link.prototype.enable = function() {
    this.event['link/enable'].emit();
    return this;
}
Link.prototype.disable = function() {
    this.event['link/disable'].emit();
    return this;
}
Link.prototype.disconnect = function() {
    this.outlet.disconnect(this);
    return this;
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

function join_definitions(keys, src1, src2) {
    var trg = {}; src1 = src1 || {}; src2 = src2 || {};
    var key;
    for (var i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (key[0] !== '*') {
            if (!(key in src1) && !(key in src2)) continue;
            trg[key] = is_defined(src1[key]) ? src1[key] : src2[key];
        } else {
            key = key.slice(1);
            if (!(key in src1) && !(key in src2)) continue;
            trg[key] = {};
            var src2_keys = src2[key] ? Object.keys(src2[key]) : [];
            for (var j = 0, jl = src2_keys.length; j < jl; j++) {
                trg[key][src2_keys[j]] = src2[key][src2_keys[j]];
            }
            var src1_keys = src1[key] ? Object.keys(src1[key]) : [];
            for (var j = 0, jl = src1_keys.length; j < jl; j++) {
                trg[key][src1_keys[j]] = src1[key][src1_keys[j]];
            }
        }
    }
    return trg;
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

function is_object(val) {
    return (typeof val === 'object');
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

function join_render_definitions(keys, user_render, type_render) {
    if (!user_render) return type_render;
    var result = {};
    for (var render_type in type_render) {
        result[render_type] = join_definitions(keys, user_render[render_type], type_render[render_type]);
    }
    for (var render_type in user_render) {
        if (!result[render_type] && !type_render[render_type]) result[render_type] = user_render[render_type];
    }
    return result;
}

function create_event_map(conf) {
    var map = {}; var types = Object.keys(conf);
    for (var i = 0, type; i < types.length; i++) {
        type = types[i];
        map[type] = Kefir.emitter();
    }
    return map;
}

function adapt_events(type, spec) {
    if (spec.length === 0) return function() { return { type: type } };
    if (spec.length === 1) return function(value) { var evt = {}; evt.type = type; evt[spec[0]] = value; return evt; };
    if (spec.length > 1)   return function(event) { event = clone_obj(event); event.type = type; return event; };
}
function create_events_stream(conf, event_map, subj_as, subj) {
    var stream = Kefir.pool(); var types = Object.keys(conf);
    for (var i = 0; i < types.length; i++) {
        stream.plug(event_map[types[i]]
                         .map(adapt_events(types[i], conf[types[i]]))
                         .map(function(evt) {
                             evt[subj_as] = subj;
                             return evt;
                         }));
    }
    return stream;
}

function subscribe(events, handlers) {
    events.filter(function(event) { return handlers[event.type]; })
          .onValue(function(event) {
              handlers[event.type](event);
          });
}

function make_silent_error(subject, subject_name) {
    var err = make_error(subject, subject_name);
    err.silent = true; return err;
}

function make_error(subject, subject_name, message, is_system) {
    return { type: subject_name + '/error', system: is_system || false,
             subject: subject, message: message };
}

function report_error(subject, subject_name, message, is_system) {
    rpdEvents.plug(Kefir.constantError(make_error(subject, subject_name, message, is_system)));
}

function report_system_error(subject, subject_name, message) {
    report_error(subject, subject_name, message, true);
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

function get_style(name, renderer) {
    if (!name) report_system_error(null, 'network', 'Unknown style requested: \'' + name + '\'');
    if (!styles[name]) report_system_error(null, 'network', 'Style \'' + name + '\' is not registered');
    var style = styles[name][renderer];
    if (!style) report_system_error(null, 'network', 'Style \'' + name + '\' has no definition for \'' + renderer + '\' renderer');
    return style;
}

function extract_toolkit(type) {
    var slashPos = type.indexOf('/');
    return (slashPos >= 0) ? type.substring(0, slashPos) : '';
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
    if (!nodetypes[type]) report_system_error(null, 'network', 'Node type \'' + type + '\' is not registered');
    if (!noderenderers[type]) noderenderers[type] = {};
    noderenderers[type][alias] = data;
}

function channelrenderer(type, alias, data) {
    if (!channeltypes[type]) report_system_error(null, 'network', 'Channel type \'' + type + '\' is not registered');
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

function toolkiticon(toolkit, icon) {
    toolkiticons[toolkit] = icon;
}

function nodetypeicon(type, icon) {
    nodetypeicons[type] = icon;
}

nodetype('core/basic', {});
nodetype('core/reference', {});
channeltype('core/any', {});

// =============================================================================
// ========================== stringification ==================================
// =============================================================================

var stringify = {};
stringify.patch = function(patch) {
    return '[ Patch' + (patch.name ? (' \'' + patch.name + '\'') : ' <Unnamed>') + ' ]';
};
stringify.node = function(node) {
    return '[ Node (' + node.type + ')' +
              (node.def ? (node.def.title ? (' \'' + node.def.title + '\'') : ' <Untitled>') : ' <Unprepared>') +
              ' #' + node.id +
              ' ]';
};
stringify.outlet = function(outlet) {
    return '[ Outlet (' + outlet.type + ')' +
              (outlet.alias ? (' \'' + outlet.alias + '\'') : ' <Unaliased>') +
              (outlet.def ? (outlet.def.label ? (' \'' + outlet.def.label + '\'') : ' <Unlabeled>') : ' <Unprepared>') +
              ' #' + outlet.id +
              ' ]';
};
stringify.inlet = function(inlet) {
    return '[ Inlet (' + inlet.type + ')' +
              (inlet.alias ? (' \'' + inlet.alias + '\'') : ' <Unaliased>') +
              (inlet.def ? (inlet.def.label ? (' \'' + inlet.def.label + '\'') : ' <Unlabeled>') : ' <Unprepared>') +
              ' #' + inlet.id +
              (inlet.def.hidden ? ' (hidden)' : '') +
              (inlet.def.cold ? ' (cold)' : '') +
              ' ]';
};
stringify.link = function(link) {
    return '[ Link (' + link.type + ')' +
              ' \'' + link.name + '\'' +
              ' #' + link.id +
              ' ' + stringify.outlet(link.outlet) + ' ->' +
              ' ' + stringify.inlet(link.inlet) +
              ' ]';
};

function autoStringify(value) {
    if (value instanceof Patch)  { return stringify.patch(value); }
    if (value instanceof Node)   { return stringify.node(value); }
    if (value instanceof Inlet)  { return stringify.inlet(value); }
    if (value instanceof Outlet) { return stringify.outlet(value); }
    if (value instanceof Link)   { return stringify.link(value); }
    return '<?> ' + value;
}

// =============================================================================
// =============================== export ======================================
// =============================================================================

return {

    'VERSION': VERSION,

    '_': { 'Patch': Patch, 'Node': Node, 'Inlet': Inlet, 'Outlet': Outlet, 'Link': Link },

    'unit': ƒ,
    'not': function(value) { return !value; },

    'event': rpdEvent,
    'events': rpdEvents,

    'addPatch': addPatch,
    'addClosedPatch': addClosedPatch,
    'renderNext': renderNext,
    'stopRendering': stopRendering,

    'nodetype': nodetype,
    'channeltype': channeltype,
    'nodedescription': nodedescription,

    'renderer': renderer, 'styles': styles, 'style': style,
    'noderenderer': noderenderer,
    'channelrenderer': channelrenderer,

    'toolkiticon': toolkiticon,
    'nodetypeicon': nodetypeicon,

    'import': {}, 'export': {},

    'allNodeTypes': nodetypes,
    'allChannelTypes': channeltypes,
    'allNodeRenderers': noderenderers,
    'allChannelRenderers': channelrenderers,
    'allNodeDescriptions': nodedescriptions,
    'allNodeTypeIcons': nodetypeicons,
    'allToolkitIcons': toolkiticons,

    'getStyle': get_style,
    'reportError': report_error,
    'reportSystemError': report_system_error,

    'short_uid': short_uid,

    'stringify': stringify,
    'autoStringify': autoStringify
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
