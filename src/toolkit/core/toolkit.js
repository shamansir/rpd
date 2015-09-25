Rpd.nodedescription('core/empty',
                    'Does not allow adding any inlets or outlets.');
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

Rpd.nodedescription('core/custom',
                    'May have any number of inlets and outlets, a target for extension.');
Rpd.nodetype('core/custom', {
    name: 'Custom'
});

Rpd.channeltype('core/number', {
    default: 0,
    readonly: false,
    accept: function(val) {
        if (val === Infinity) return true;
        var parsed = parseFloat(val);
        return !isNaN(parsed) && isFinite(parsed);
    },
    adapt: function(val) { return parseFloat(val); }
});

Rpd.channeltype('core/time', {
    default: 1000,
    accept: function(val) {
        var parsed = parseFloat(val);
        return !isNaN(parsed) && isFinite(parsed);
    },
    adapt: function(val) { return parseFloat(val); },
    show: function(val) { return (Math.floor(val / 10) / 100) + 's'; }
});

Rpd.nodetype('core/number', {
    name: 'number',
    inlets:  { 'min': { type: 'core/number', default: 0 },
               'max': { type: 'core/number', default: Infinity },
               'spinner': { type: 'core/number', default: 0, hidden: true } },
    outlets: { 'out':     { type: 'core/number' } },
    process: function(inlets) {
        if (!inlets.hasOwnProperty('spinner')) return;
        // comparison logic is in the renderer, since it communicates with
        // this node through a hidden spinner inlet
        return { 'out': inlets.spinner };
    }
});

Rpd.nodetype('core/random', function() {
    var lastEmitterId = 0;
    return {
        name: 'random',
        inlets:  { 'min': { type: 'core/number', default: 0 },
                   'max': { type: 'core/number', default: 100 },
                   'period': { type: 'core/time', default: 1000 } },
        outlets: { 'out':    { type: 'core/number' } },
        process: function(inlets) {
            if (!inlets.hasOwnProperty('period')) return;
            lastEmitterId++;
            return { 'out': Kefir.withInterval(inlets.period, function(emitter) {
                                      emitter.emit(Math.floor(inlets.min + (Math.random() * (inlets.max - inlets.min))));
                                  }).takeWhile((function(myId) {
                                      return function() { return myId === lastEmitterId; }
                                  })(lastEmitterId))
                   };
        }
    }
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
    process: function(inlets) {
        return { 'sum': (inlets.a || 0) + (inlets.b || 0) + (inlets.c || 0) };
    }
});

Rpd.nodedescription('core/hot-and-cold', 'An example of cold inlet.');
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
                                  readonly: false,
                                  adapt: function(val) {
                                      return (val ? true : false);
                                  } });

Rpd.linktype('core/pass', { });
