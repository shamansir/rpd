Rpd.nodetype('core/empty', {
    name: 'Empty',
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
    width: 1.8,
    inlets: {
        'a': { type: 'core/number', name: 'A' },
        'b': { type: 'core/number', name: 'B' },
        'c': { type: 'core/number', name: 'C' }
    },
    outlets: {
        'sum': { type: 'core/number', default: 0, name: '∑' }
    },
    /* prepare: function(inlets, outlets) {
        inlets['c'].stream(Kefir.repeatedly(3000, [12, 24, 32]).toProperty(0));
    }, */
    process: function(inlets) {
        return { 'sum': (inlets.a || 0) + (inlets.b || 0) + (inlets.c || 0) };
    }
});

Rpd.nodetype('core/sum-of-three-with-body', {
    name: 'Sum of Three w/Body',
    width: 1.8,
    inlets: {
        'a': { type: 'core/number', name: 'A', default: 1 },
        'b': { type: 'core/number', name: 'B' },
        'c': { type: 'core/number', name: 'C', hidden: true }
    },
    outlets: {
        'sum': { type: 'core/number', default: 0, name: '∑' }
    },
    process: function(inlets) {
        return { 'sum': (inlets.a || 0) + (inlets.b || 0) + (inlets.c || 0) };
    }
});

Rpd.channeltype('core/bool', { default: false,
                               adapt: function(val) {
                                    return (val ? true : false);
                               } });

Rpd.channeltype('core/number', { default: 0,
                                 readonly: false,
                                 adapt: function(val) {
                                     return parseFloat(val);
                                 } });

Rpd.linktype('core/value', { });
