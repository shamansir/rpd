Rpd.linktype('core/pass', { });

Rpd.channeltype('pd/msg', { });

Rpd.nodetype('pd/object', function(node) {
    var _process;
    PdEvent['object/is-resolved'].filter(function(value) { return value.node.id === node.id; })
                                 .onValue(function(value) {
                                     _process = value.definition ? value.definition.process
                                                                 : null;
                                 });
    return {
        inlets: { 'command': { type: 'pd/msg', hidden: true } },
        process: function() {
            return _process ? _process.apply(this, arguments) : null;
        }
    }
});

Rpd.nodetype('pd/comment', {
    inlets: { 'text': { type: 'pd/msg', hidden: true } }
});

Rpd.nodetype('pd/number', {
    inlets: { 'receive': { type: 'pd/msg' },
              'spinner': { type: 'pd/msg', default: 0, hidden: true } },
    outlets: { 'send': { type: 'pd/msg' } },
    process: function(inlets) {
         //if (!inlets.hasOwnProperty('spinner')) return;
         // comparison logic is in the renderer, since it communicates with
         // this node through a hidden spinner inlet
         return { 'send': inlets.spinner };
    }
});

Rpd.nodetype('pd/symbol', {
    inlets: { 'receive': { type: 'pd/msg' } },
    outlets: { 'send': { type: 'pd/msg' } }
});

Rpd.nodetype('pd/message', {
    inlets: { 'receive': { type: 'pd/msg' } },
    outlets: { 'send': { type: 'pd/msg' } },
    process: function(inlets) {
        return  { 'send': inlets['receive'] };
    }
});

Rpd.nodetype('pd/bang', {
    inlets: { 'receive': { type: 'pd/msg' }, },
    outlets: { 'send': { type: 'pd/msg' } },
    process: function(inlets) {
        return  { 'send': 'bang' };
    }
});

Rpd.nodetype('pd/toggle', {
    inlets: { 'receive': { type: 'pd/msg' } },
    outlets: { 'send': { type: 'pd/msg' } }
});

Rpd.nodetype('pd/toolbar', {});

Rpd.nodetype('pd/edit-switch', {});
