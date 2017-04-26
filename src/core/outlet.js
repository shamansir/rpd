import Kefir from 'kefir';

import Link from './link.js';

import {
    // js extensions
    short_uid,
    adapt_to_obj,
    is_defined,
    // errors
    report_error,
    report_system_error,
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
    OUTLET_PROPS,
    CHANNEL_RENDERER_PROPS
} from './register';


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

export default Outlet;
