Rpd.channeltype('pd/atom', { });

Rpd.nodetype('pd/object', { });

Rpd.nodetype('pd/text', {
    inlets: { 'text': { type: 'pd/atom', hidden: true } }
});

Rpd.nodetype('pd/gatom', {
    inlets: { '0': { type: 'pd/atom' } },
    outlets: { '0': { type: 'pd/atom' } }
}); // a.k.a. symbol

Rpd.nodetype('pd/message', {
    inlets: { '0': { type: 'pd/atom' },
              'v': { type: 'pd/atom', hidden: true } },
    outlets: { '0': { type: 'pd/atom' } }
});

Rpd.nodetype('pd/bang', { });

Rpd.nodetype('pd/toggle', { });
