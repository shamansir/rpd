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
        'sum': { type: 'core/number', name: '∑' }
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
        'sum': { type: 'core/number', name: '∑' }
    },
    outlets: {
        'sum': { type: 'core/number', name: '∑' }
    },
    process: function(inlets) {
        return { 'sum': (inlets.a || 0) + (inlets.b || 0) + (inlets.c || 0) };
    }
});

Rpd.nodetype('core/hot-and-cold', {
    name: 'Hot and Cold',
    inlets: {
        'hot': { type: 'core/number', name: 'A', default: 1 },
        'cold': { type: 'core/number', name: 'B', default: 1, cold: true },
    },
    outlets: {
        'value': { type: 'core/any' }
    },
    process: function(inlets) {
        return { 'value': [ inlets.hot, inlets.cold ] };
    }
});

Rpd.channeltype('core/any', { });

Rpd.channeltype('core/boolean', { default: false,
                                  adapt: function(val) {
                                      return (val ? true : false);
                                  } });

Rpd.channeltype('core/number', { default: 0,
                                 readonly: false,
                                 accept: function(val) {
                                    var parsed = parseFloat(val);
                                    return !isNaN(parsed) && isFinite(parsed);
                                 },
                                 adapt: function(val) {
                                     return parseFloat(val);
                                 } });

Rpd.linktype('core/pass', { });
