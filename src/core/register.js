import { report_system_error } from './utils.js'

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

export function nodetype(type, def) {
    nodetypes[type] = def || {};
}

export function channeltype(type, def) {
    channeltypes[type] = def || {};
}

export function renderer(alias, f) {
    renderer_registry[alias] = f;
}

export function noderenderer(type, alias, data) {
    if (!nodetypes[type]) report_system_error(null, 'network', 'Node type \'' + type + '\' is not registered');
    if (!noderenderers[type]) noderenderers[type] = {};
    noderenderers[type][alias] = data;
}

export function channelrenderer(type, alias, data) {
    if (!channeltypes[type]) report_system_error(null, 'network', 'Channel type \'' + type + '\' is not registered');
    if (!channelrenderers[type]) channelrenderers[type] = {};
    channelrenderers[type][alias] = data;
}

export function nodedescription(type, description) {
    nodedescriptions[type] = description;
}

export function style(name, renderer, func) {
    if (!styles[name]) styles[name] = {};
    styles[name][renderer] = func;
}

export function toolkiticon(toolkit, icon) {
    toolkiticons[toolkit] = icon;
}

export function nodetypeicon(type, icon) {
    nodetypeicons[type] = icon;
}

export function get_style(name, renderer) {
    if (!name) report_system_error(null, 'network', 'Unknown style requested: \'' + name + '\'');
    if (!styles[name]) report_system_error(null, 'network', 'Style \'' + name + '\' is not registered');
    var style = styles[name][renderer];
    if (!style) report_system_error(null, 'network', 'Style \'' + name + '\' has no definition for \'' + renderer + '\' renderer');
    return style;
}


export NODE_PROPS, CHANNEL_PROPS, INLET_PROPS, OUTLET_PROPS;
export NODE_RENDERER_PROPS, CHANNEL_RENDERER_PROPS;

export nodetypes, channeltypes;
export noderenderers, channelrenderers;
export nodedescriptions;
export styles;
export nodetypeicons, toolkiticons;
