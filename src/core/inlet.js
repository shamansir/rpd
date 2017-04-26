import Kefir from 'kefir';

import {
    // js extensions
    short_uid,
    adapt_to_obj,
    is_defined,
    // errors
    report_error,
    report_system_error,
    make_silent_error,
    // events
    create_event_map,
    create_events_stream,
    subscribe,
    // definitions
    extract_toolkit,
    join_definitions,
    prepare_render_obj,
    join_render_definitions
} from './utils';

import {
    channeltypes,
    channelrenderers,
    INLET_PROPS,
    CHANNEL_RENDERER_PROPS
} from './register';

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
    if (this.type === 'core/any') return true;
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

export default Inlet;
