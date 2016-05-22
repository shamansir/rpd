(function() {

var numberToHex = RpdUtils.numberToHex;
var toHexColor = RpdUtils.toHexColor;

function howMuch(single, plural) {
    return function(list) {
        if (!list) return 'Nothing';
        if (list.length == 0) return 'No ' + plural;
        if (list.length == 1) return 'One ' + single;
        if (list.length == 2) return 'Two ' + plural;
        return list.length + ' ' + plural;
    };
}

Rpd.channeltype('util/number', {
    default: 0,
    readonly: false,
    accept: function(val) {
        if (val === Infinity) return true;
        var parsed = parseFloat(val);
        return !isNaN(parsed) && isFinite(parsed);
    },
    adapt: function(val) { return parseFloat(val); }
});

Rpd.channeltype('util/wholenumber', {
    default: 0,
    readonly: true,
    allow: [ 'util/number' ],
    accept: function(val) {
        if (val === Infinity) return true;
        var parsed = parseFloat(val);
        return !isNaN(parsed) && isFinite(parsed);
    },
    adapt: function(val) { return Math.floor(parseFloat(val)); }
});

Rpd.channeltype('util/time', {
    default: 1000,
    accept: function(val) {
        var parsed = parseFloat(val);
        return !isNaN(parsed) && isFinite(parsed);
    },
    adapt: function(val) { return parseFloat(val); },
    show: function(val) { return (Math.floor(val / 10) / 100) + 's'; }
});

Rpd.channeltype('util/bang', {
    show: function(v) { return v ? '[Bang]' : '[None]'; },
    adapt: function(v) { return v ? {} : null; }
});

Rpd.channeltype('util/color', { show: toHexColor });

Rpd.nodetype('util/number', {
    title: 'number',
    inlets:  { 'user-value': { type: 'util/number', default: 0, hidden: true } },
    outlets: { 'out':     { type: 'util/number' } },
    process: function(inlets) {
        return { 'out': inlets['user-value'] };
    }
});

Rpd.nodetype('util/random', function() {
    var lastEmitterId = 0;
    return {
        title: 'random',
        inlets:  { 'min': { type: 'util/number', default: 0 },
                   'max': { type: 'util/number', default: 100 },
                   'period': { type: 'util/time', default: 1000 } },
        outlets: { 'out':    { type: 'util/number' } },
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

Rpd.nodetype('util/bounded-number', {
    title: 'bounded number',
    inlets:  { 'min': { type: 'util/number', default: 0 },
               'max': { type: 'util/number', default: Infinity },
               'spinner': { type: 'util/number', default: 0, hidden: true } },
    outlets: { 'out':     { type: 'util/number' } },
    process: function(inlets) {
         if (!inlets.hasOwnProperty('spinner')) return;
         // comparison logic is in the renderer, since it communicates with
         // this node through a hidden spinner inlet
         return { 'out': inlets.spinner };
    }
});

Rpd.channeltype('util/boolean', { default: false,
                                  readonly: false,
                                  adapt: function(val) {
                                      return (val ? true : false);
                                  } });

Rpd.nodedescription('util/empty',
                    'Does not allow adding any inlets or outlets.');
Rpd.nodetype('util/empty', {
    title: 'Empty',
    handle: {
        'inlet/add': function() {
            throw new Error('Empty node can not have any inlets');
        },
        'outlet/add': function() {
            throw new Error('Empty node can not have any outlets');
        }
    }
});

Rpd.nodetype('util/bang', {
    inlets: { 'trigger': { type: 'util/bang', hidden: true } },
    outlets: { 'out': { type: 'util/bang' } },
    process: function(inlets) {
        return inlets.trigger ? { 'out': {} } : {};
    }
});

Rpd.nodetype('util/metro', {
    inlets: { 'trigger': { type: 'util/bang', hidden: true } },
    outlets: { 'out': { type: 'util/bang' } },
    process: function(inlets) {
        return inlets.trigger ? { 'out': {} } : {};
    }
});

var DEFAULT_COLOR = { r: 0xED, g: 0x22, b: 0x5D };
Rpd.nodetype('util/color', {
    inlets: {
        'r': { type: 'util/wholenumber', default: DEFAULT_COLOR.r, label: 'red' },
        'g': { type: 'util/wholenumber', default: DEFAULT_COLOR.g, label: 'green' },
        'b': { type: 'util/wholenumber', default: DEFAULT_COLOR.b, label: 'blue' }
    },
    outlets: {
        'color': { type: 'util/color' }
    },
    process: function(inlets) { return { color: inlets }; }
});

Rpd.nodetype('util/sum-of-three', {
    title: 'Sum of Three',
    inlets: {
        'a': { type: 'util/number', label: 'A' },
        'b': { type: 'util/number', label: 'B' },
        'c': { type: 'util/number', label: 'C' }
    },
    outlets: {
        'sum': { type: 'util/number', label: '∑' }
    },
    process: function(inlets) {
        return { 'sum': (inlets.a || 0) + (inlets.b || 0) + (inlets.c || 0) };
    }
});

function adaptToState(state, value) {
    return Math.floor((state.min + ((state.max - state.min) * value)) * 100) / 100;
}

Rpd.nodetype('util/knob', {
    inlets: {
        'min': { type: 'util/number', default: 0 },
        'max': { type: 'util/number', default: 100 },
        'submit': { type: 'util/number', default: 0, hidden: true }
    },
    outlets: {
        'number': { type: 'util/number' }
    },
    process: function(inlets) { return { number: adaptToState(inlets, inlets.submit) }; }
});

Rpd.channeltype('util/numbers', { show: howMuch('number', 'numbers') });

var DEFAULT_KNOB_COUNT = 4;

Rpd.nodetype('util/knobs', {
    inlets: {
        'min': { type: 'util/number', default: 0 },
        'max': { type: 'util/number', default: 100 },
        'count': { type: 'util/number', default: DEFAULT_KNOB_COUNT },
        'submit': { type: 'util/numbers', default: [], hidden: true }
    },
    outlets: {
        'numbers': { type: 'util/numbers' }
    },
    process: function(inlets) {
        return {
            numbers:
                inlets.submit ? inlets.submit.map(function(num) {
                                    return adaptToState(inlets, num);
                                })
                              : []
        };
    }
});

/*
Rpd.nodedescription('util/hot-and-cold', 'An example of cold inlet.');
Rpd.nodetype('util/hot-and-cold', {
    title: 'Hot and Cold',
    inlets: {
        'hot': { type: 'util/number', label: 'A', default: 1 },
        'cold': { type: 'util/number', label: 'B', default: 1, cold: true },
    },
    outlets: {
        'value': { type: 'util/any' }
    },
    process: function(inlets) {
        return { 'value': [ inlets.hot, inlets.cold ] };
    }
});
*/

Rpd.nodedescription('util/log', 'Log everything that goes in to console');
Rpd.nodetype('util/log', {
    inlets: {
        'what': { type: 'core/any' }
    },
    process: function(inlets) {
        console.log(inlets.what);
    }
});

/* var howMuchColors = howMuch('color', 'colors');
Rpd.channeltype('util/palette', { show: function(val) { return howMuchColors(val.colors); } });
Rpd.channeltype('util/palettes', {});

var PALETTES = [
    [ '#f00', '#0f0', '#00f' ],
    [ '#ff0', '#0ff', '#f0f' ],
    [ '#000', '#666', '#aaa', '#fff' ]
];
Rpd.nodetype('util/palette', {
    inlets: {
        'selection': { type: 'util/palette', default: { index: 0, colors: PALETTES[0] }, label: 'selection', hidden: true },
        'palletes': { type: 'util/palettes', default: PALETTES, label: 'palettes', hidden: true }
    },
    outlets: {
        'palette': { type: 'util/palette' }
    },
    process: function(inlets) { return { palette: inlets.selection }; }
}); */

Rpd.nodedescription('util/nodelist', 'Add any node to active patch by type');
Rpd.nodetype('util/nodelist', { title: 'add nodes' });

Rpd.nodetypeicon('util/number',   '🔢'); // 'ℕ'
Rpd.nodetypeicon('util/log',      '🗒');
Rpd.nodetypeicon('util/nodelist', '📃');
Rpd.nodetypeicon('util/knob',     '🎛');
Rpd.nodetypeicon('util/knobs',    '🎛');
Rpd.nodetypeicon('util/color',    '🏮');
Rpd.nodetypeicon('util/bang',     '⊙');
Rpd.nodetypeicon('util/metro',    '⊚');
Rpd.nodetypeicon('util/empty',    '∅');
//Rpd.nodetypeicon('util/random',   '≟');
//Rpd.nodetypeicon('util/bounded-number', '⩫');
//Rpd.nodetypeicon('util/sum-of-three', '∑');

})();
