// =============================================================================
// =========================== registration ====================================
// =============================================================================

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
