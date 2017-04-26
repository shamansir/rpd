// =============================================================================
// ================================== utils ====================================
// =============================================================================

function ƒ(v) { return function() { return v; } }

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

export function inject_render(update, alias) {
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
    return make_error(subject, subject_name, null, false, true);
}

function make_error(subject, subject_name, message, is_system, is_silent) {
    return { type: subject_name + '/error', system: is_system || false,
             subject: subject, message: message, silent: is_silent || false };
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

function extract_toolkit(type) {
    var slashPos = type.indexOf('/');
    return (slashPos >= 0) ? type.substring(0, slashPos) : '';
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

export injectKefirEmitter;
// core
export create_rendering_stream;
// js extensions
export ƒ, short_uid, clone_obj, is_object, is_defined, adapt_to_obj;
// errors
export make_silent_error, make_error, report_error, report_system_error;
// exvents
export subscribe, create_event_map, adapt_events;
// definitions (FIXME: move to register.js?)
export join_definitions, prepare_render_obj, join_render_definitions, inject_render, extract_toolkit;
