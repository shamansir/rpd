Rpd.nodetype('core/empty', {
    name: 'Empty',
    boxHeight: 100,
    handle: {
        'inlet/add': function() {
            throw new Error('Empty node can not have any inlets');
        },
        'outlet/add': function() {
            throw new Error('Empty node can not have any outlets');
        }
    }
});

Rpd.nodetype('core/custom', {
    name: 'Custom'
});

Rpd.nodetype('core/sum-of-three', {
    name: 'Sum of Three',
    boxWidth: 300,
    inlets: {
        'a': { type: 'core/number', name: 'A' },
        'b': { type: 'core/number', name: 'B' },
        'c': { type: 'core/number', name: 'C', hidden: true }
    },
    outlets: {
        'sum': { type: 'core/number', default: 0, name: '∑' }
    },
    prepare: function(inlets, outlets) {
        inlets['c'].stream(Kefir.repeatedly(3000, [12, 24, 32]).toProperty(0));
    },
    process: function(inlets) {
        return { 'sum': (inlets.a || 0) + (inlets.b || 0) + (inlets.c || 0) };
    },
    render: {
        'html': function(bodyElm, inlets, outlets) {
            bodyElm.innerHTML = bodyElm.textContent =
                    '∑ (' + (inlets.a || '0') + ', '
                          + (inlets.b || '0') + ', '
                          + (inlets.c || '0') + ') = ' + (outlets.sum || '?');
        }
    }
});

Rpd.channeltype('core/bool', { });

Rpd.channeltype('core/number', { });

Rpd.linktype('core/normal', { });
