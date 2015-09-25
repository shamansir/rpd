Rpd.nodedescription('demo/empty',
                    'Does not allow adding any inlets or outlets.');
Rpd.nodetype('demo/empty', {
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

Rpd.nodetype('demo/sum-of-three', {
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
    process: function(inlets) {
        return { 'sum': (inlets.a || 0) + (inlets.b || 0) + (inlets.c || 0) };
    }
});

Rpd.nodedescription('demo/hot-and-cold', 'An example of cold inlet.');
Rpd.nodetype('demo/hot-and-cold', {
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
