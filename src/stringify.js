// =============================================================================
// ========================== stringification ==================================
// =============================================================================

var stringify = {};

stringify.patch = function(patch) {
    return '[ Patch' + (patch.name ? (' \'' + patch.name + '\'') : ' <Unnamed>') + ' ]';
};

stringify.node = function(node) {
    return '[ Node (' + node.type + ')' +
              (node.def ? (node.def.title ? (' \'' + node.def.title + '\'') : ' <Untitled>') : ' <Unprepared>') +
              ' #' + node.id +
              ' ]';
};

stringify.outlet = function(outlet) {
    return '[ Outlet (' + outlet.type + ')' +
              (outlet.alias ? (' \'' + outlet.alias + '\'') : ' <Unaliased>') +
              (outlet.def ? (outlet.def.label ? (' \'' + outlet.def.label + '\'') : ' <Unlabeled>') : ' <Unprepared>') +
              ' #' + outlet.id +
              ' ]';
};

stringify.inlet = function(inlet) {
    return '[ Inlet (' + inlet.type + ')' +
              (inlet.alias ? (' \'' + inlet.alias + '\'') : ' <Unaliased>') +
              (inlet.def ? (inlet.def.label ? (' \'' + inlet.def.label + '\'') : ' <Unlabeled>') : ' <Unprepared>') +
              ' #' + inlet.id +
              (inlet.def.hidden ? ' (hidden)' : '') +
              (inlet.def.cold ? ' (cold)' : '') +
              ' ]';
};

stringify.link = function(link) {
    return '[ Link (' + link.type + ')' +
              ' \'' + link.name + '\'' +
              ' #' + link.id +
              ' ' + stringify.outlet(link.outlet) + ' ->' +
              ' ' + stringify.inlet(link.inlet) +
              ' ]';
};

function autoStringify(value) {
    if (value instanceof Patch)  { return stringify.patch(value); }
    if (value instanceof Node)   { return stringify.node(value); }
    if (value instanceof Inlet)  { return stringify.inlet(value); }
    if (value instanceof Outlet) { return stringify.outlet(value); }
    if (value instanceof Link)   { return stringify.link(value); }
    return '<?> ' + value;
}
