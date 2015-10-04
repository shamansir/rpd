Rpd.linktype('core/pass', { });

Rpd.channeltype('pd/msg', { });

Rpd.nodetype('pd/object', function(node) {
    var _process;
    PdEvent['object/is-resolved'].filter(function(value) { return value.node.id === node.id; })
                                 .onValue(function(value) { _process = value.definition; });
    return {
        inlets: { 'command': { type: 'pd/msg', hidden: true } },
        process: function() {
            return _process ? _process.call(this, arguments) : null;
        }
    }
});

Rpd.nodetype('pd/text', {
    inlets: { 'text': { type: 'pd/msg', hidden: true } }
});

Rpd.nodetype('pd/number', {
    inlets: { 'receive': { type: 'pd/msg' } },
    outlets: { 'send': { type: 'pd/msg' } }
});

Rpd.nodetype('pd/symbol', {
    inlets: { 'receive': { type: 'pd/msg' } },
    outlets: { 'send': { type: 'pd/msg' } }
});

Rpd.nodetype('pd/message', {
    inlets: { 'receive': { type: 'pd/msg' } },
    outlets: { 'send': { type: 'pd/msg' } }
});

Rpd.nodetype('pd/bang', {
    inlets: { 'receive': { type: 'pd/msg' }, },
    outlets: { 'send': { type: 'pd/msg' } }
});

Rpd.nodetype('pd/toggle', {
    inlets: { 'receive': { type: 'pd/msg' } },
    outlets: { 'send': { type: 'pd/msg' } }
});
