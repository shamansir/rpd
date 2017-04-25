;(function(global) {
  "use strict";

var Kefir = global.Kefir;
if ((typeof Kefir === 'undefined') &&
    (typeof require !== 'undefined')) Kefir = require('kefir');
if (!Kefir) throw new Error('Kefir.js (https://github.com/rpominov/kefir) is required for Rpd to work');

var VERSION = 'v3.0.0-alpha';

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
    var instance = new Patch(name, def);
    rpdEvent['network/add-patch'].emit(instance);
    return instance;
}

nodetype('core/basic', {});
nodetype('core/reference', {});
channeltype('core/any', {});

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
} else if (typeof module === 'object' && typeof exports === 'object') {
    module.exports = Rpd;
    Rpd.Rpd = Rpd;
} else {
    global.Rpd = Rpd;
}

}(this));
