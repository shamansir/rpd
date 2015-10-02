Rpd.linktype('core/pass', { });

Rpd.channeltype('pd/msg', { });

Rpd.nodetype('pd/object', {
    inlets: { 'command': { type: 'pd/msg', hidden: true } },
    process: function() {
        if (PdNodeToObject[this.id]) {
            return PdNodeToObject[this.id].call(this, arguments);
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
