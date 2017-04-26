import Kefir from 'kefir';

import {
    // js extensions
    ƒ,
    short_uid,
    // errors
    report_error,
    make_silent_error,
    // events
    create_event_map,
    create_events_stream
} from './utils';

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

export default Link;
