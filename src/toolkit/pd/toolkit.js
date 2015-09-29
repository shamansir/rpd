Rpd.linktype('core/pass', { });

Rpd.channeltype('pd/msg', { });

Rpd.nodetype('pd/object', { });

Rpd.nodetype('pd/text', {
    inlets: { 'text': { type: 'pd/msg', hidden: true } }
});

Rpd.nodetype('pd/gatom', {
    inlets: { 'in': { type: 'pd/msg' } },
    outlets: { 'out': { type: 'pd/msg' } }
}); // a.k.a. symbol

Rpd.nodetype('pd/message', {
    inlets: { 'in': { type: 'pd/msg' } },
    outlets: { 'out': { type: 'pd/msg' } }
});

Rpd.nodetype('pd/bang', {
    inlets: { 'in': { type: 'pd/msg' }, },
    outlets: { 'out': { type: 'pd/msg' } }
});

Rpd.nodetype('pd/toggle', {
    inlets: { 'in': { type: 'pd/msg' } },
    outlets: { 'out': { type: 'pd/msg' } }
});
