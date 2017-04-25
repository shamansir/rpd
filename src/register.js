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
