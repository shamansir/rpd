/* @flow */
import Kefir from 'kefir';

import {
    // js extensions
    short_uid,
    clone_obj,
    is_object,
    // errors
    report_system_error,
    // events
    create_event_map,
    create_events_stream,
    subscribe
} from './utils';

import {
    renderer_registry,
    inject_render,
    join_render_definitions
} from './register';

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
    return this;
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

export default Patch;
