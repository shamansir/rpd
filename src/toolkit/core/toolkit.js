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
    inlets:  { 'user-value': { type: 'core/number', default: 0, hidden: true } },
    outlets: { 'out':     { type: 'core/number' } },
    process: function(inlets) {
        return { 'out': inlets['user-value'] };
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

Rpd.nodetype('core/bounded-number', {
    name: 'bounded number',
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

Rpd.channeltype('core/any', { });

Rpd.channeltype('core/boolean', { default: false,
                                  readonly: false,
                                  adapt: function(val) {
                                      return (val ? true : false);
                                  } });

Rpd.linktype('core/pass', { });
