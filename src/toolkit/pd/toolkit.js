Rpd.linktype('core/pass', { });

Rpd.channeltype('pd/msg', { });

Rpd.nodetype('pd/object', { });

Rpd.nodetype('pd/text', {
    inlets: { 'text': { type: 'pd/msg', hidden: true } }
});

Rpd.nodetype('pd/gatom', {
    inlets: { '0': { type: 'pd/msg' } },
    outlets: { '0': { type: 'pd/msg' } }
}); // a.k.a. symbol

Rpd.nodetype('pd/msg', {
    inlets: { '0': { type: 'pd/msg' },
              'v': { type: 'pd/msg', hidden: true } },
    outlets: { '0': { type: 'pd/msg' } }
});

Rpd.nodetype('pd/bang', {
    inlets: { 'in': { type: 'pd/msg' },
              'v': { type: 'pd/msg', hidden: true } },
    outlets: { 'out': { type: 'pd/msg' } }
});

Rpd.nodetype('pd/toggle', {
    inlets: { 'in': { type: 'pd/msg' },
              'v': { type: 'pd/msg', hidden: true } },
    outlets: { 'out': { type: 'pd/msg' } }
});
