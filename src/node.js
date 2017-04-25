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
        'node/move':          [ 'position' ],
        'node/configure':    [ 'props' ]
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

Node.prototype.configure = function(props) {
    this.event['node/configure'].emit(props);
    return this;
}

export default Node;
