;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

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

Rpd.channeltype('util/boolean', {
    default: false,
    adapt: function(val) { return val ? 'true' : 'false' }
});

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

Rpd.channeltype('util/timestamped', {
    adapt: function(value) {
        return {
            value: value,
            timestamp: new Date().getTime()
        }
    }
});

Rpd.nodetype('util/number', {
    title: 'number',
    inlets:  { 'user-value': { type: 'util/number', default: 0, hidden: true } },
    outlets: { 'number':     { type: 'util/number' } },
    process: function(inlets) {
        return { 'number': inlets['user-value'] };
    }
});

Rpd.nodetype('util/random', function() {
    return {
        title: 'random',
        inlets:  { 'bang': { type: 'util/bang', default: {} },
                   'min': { type: 'util/number', default: 0 },
                   'max': { type: 'util/number', default: 100 } },
        outlets: { 'random': { type: 'util/number' } },
        process: function(inlets) {
            return { 'random': Math.floor(inlets.min + (Math.random() * (inlets.max - inlets.min))) };
        }
    }
});

Rpd.nodetype('util/bounded-number', {
    title: 'bounded number',
    inlets:  { 'min': { type: 'util/number', default: 0 },
               'max': { type: 'util/number', default: Infinity },
               'spinner': { type: 'util/number', default: 0, hidden: true } },
    outlets: { 'number':  { type: 'util/number' } },
    process: function(inlets) {
         if (!inlets.hasOwnProperty('spinner')) return;
         // comparison logic is in the renderer, since it communicates with
         // this node through a hidden spinner inlet
         return { 'number': inlets.spinner };
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
    title: 'empty',
    handle: {
        'inlet/add': function() {
            throw new Error('Empty node can not have any inlets');
        },
        'outlet/add': function() {
            throw new Error('Empty node can not have any outlets');
        }
    }
});

Rpd.nodetype('util/comment', {
    inlets: { 'text': { type: 'core/any', hidden: true },
              'width': { type: 'core/any', hidden: true } },
    process: function() {}
});

Rpd.nodetype('util/bang', {
    title: 'bang',
    inlets: { 'trigger': { type: 'util/bang', hidden: true } },
    outlets: { 'bang': { type: 'util/bang' } },
    process: function(inlets) {
        return inlets.trigger ? { 'bang': {} } : {};
    }
});

Rpd.nodetype('util/metro', function() {
    var lastStream;
    var firstTime = true;
    var pool = Kefir.pool();
    return {
        title: 'metro',
        inlets: { 'enabled': { type: 'util/boolean', default: true },
                  'period': { type: 'util/time', default: 3000 } },
        outlets: { 'bang': { type: 'util/bang' } },
        process: function(inlets) {
            if (lastStream) {
                firstTime = false;
                pool.unplug(lastStream);
            }
            if (!inlets.enabled && !firstTime) return;
            lastStream = Kefir.interval(inlets.period, {});
                            /*.filter(function() { return inlets.enabled; })*/
            pool.plug(lastStream);
            //return { 'out': firstTime ? pool : Kefir.never() };
            return firstTime ? { 'bang': pool } : {};
        }
    }
});

var DEFAULT_COLOR = { r: 0xED, g: 0x22, b: 0x5D };
Rpd.nodetype('util/color', {
    title: 'color',
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
    title: 'sum of three',
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

var adaptToState = RpdUtils.adaptToState;

Rpd.nodetype('util/knob', {
    title: 'knob',
    inlets: {
        'min': { type: 'util/number', default: 0 },
        'max': { type: 'util/number', default: 100 },
        'knob': { type: 'util/number', default: 0, hidden: true }
    },
    outlets: {
        'number': { type: 'util/number' }
    },
    process: function(inlets) { return { number: adaptToState(inlets, inlets.knob) }; }
});

Rpd.nodetype('util/dial', {
    title: 'dial',
    inlets: {
        'min': { type: 'util/number', default: 0 },
        'max': { type: 'util/number', default: 100 },
        'dial': { type: 'util/number', default: 0, hidden: true }
    },
    outlets: {
        'number': { type: 'util/wholenumber' }
    },
    process: function(inlets) { return { number: Math.floor(adaptToState(inlets, inlets.dial)) }; }
});

Rpd.channeltype('util/numbers', { show: howMuch('number', 'numbers') });

var DEFAULT_KNOB_COUNT = 4;

Rpd.nodetype('util/knobs', {
    title: 'knobs',
    inlets: {
        'min': { type: 'util/number', default: 0 },
        'max': { type: 'util/number', default: 100 },
        'count': { type: 'util/number', default: DEFAULT_KNOB_COUNT, hidden: true },
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
    title: 'hot and cold',
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
    title: 'log',
    inlets: {
        'what': { type: 'core/any' }
    },
    process: function(inlets) {
        // logging is done in the node renderer,
        // since it depends on the way of output (i.e. browser vs console)
    }
});

Rpd.nodetype('util/letter', {
    title: 'letter',
    inlets: {
        'code': { type: 'util/wholenumber' }
    },
    outlets: {
        'letter': { type: 'core/any' }
    },
    process: function(inlets) {
        return {
            'letter': String.fromCharCode(inlets.code + 97/*+ 65*/)
        }
    }
})

Rpd.nodetype('util/*', {
    title: '*',
    inlets: { 'a': { type: 'util/number' },
              'b': { type: 'util/number' } },
    outlets: { 'result': { type: 'util/number' } },
    process: function(inlets) { return { 'result': (inlets.a || 0) * (inlets.b || 0) }; }
});

Rpd.nodetype('util/+', {
    title: '+',
    inlets: { 'a': { type: 'util/number' },
              'b': { type: 'util/number' } },
    outlets: { 'result': { type: 'util/number' } },
    process: function(inlets) { return { 'result': (inlets.a || 0) + (inlets.b || 0) }; }
});

Rpd.nodetype('util/-', {
    title: '-',
    inlets: { 'a': { type: 'util/number' },
              'b': { type: 'util/number' } },
    outlets: { 'result': { type: 'util/number' } },
    process: function(inlets) { return { 'result': (inlets.a || 0) - (inlets.b || 0) }; }
});

Rpd.nodetype('util/÷', {
    title: '/',
    inlets: { 'a': { type: 'util/number' },
              'b': { type: 'util/number' } },
    outlets: { 'result': { type: 'util/number' } },
    process: function(inlets) { return { 'result': (inlets.a || 0) / (inlets.b || 0) }; }
});

Rpd.nodetype('util/mod', {
    title: '%',
    inlets: { 'a': { type: 'util/number' },
              'b': { type: 'util/number' } },
    outlets: { 'result': { type: 'util/number' } },
    process: function(inlets) { return { 'result': (inlets.a || 0) % (inlets.b || 0) }; }
});

Rpd.nodetype('util/mouse-pos', {
    title: 'mouse',
    inlets: {
        'x': { type: 'util/number', hidden: true, 'default': 0 },
        'y': { type: 'util/number', hidden: true, 'default': 0 }
    },
    outlets: {
        'x': { type: 'util/number' },
        'y': { type: 'util/number' }
    },
    process: function(inlets) { return inlets; }
});

Rpd.nodetype('util/mouse-pos-by-bang', {
    title: 'mouse + bang',
    inlets: {
        'bang': { type: 'util/bang' },
        'x': { type: 'util/number', hidden: true, 'default': 0, cold: true },
        'y': { type: 'util/number', hidden: true, 'default': 0, cold: true }
    },
    outlets: {
        'x': { type: 'util/number' },
        'y': { type: 'util/number' }
    },
    process: function(inlets) {
        //if (inlets.bang) {
            return { x: inlets.x, y: inlets.y };
        //};
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

Rpd.nodetypeicon('util/number',    '🔢'); // 'ℕ'
Rpd.nodetypeicon('util/log',       '🗒');
Rpd.nodetypeicon('util/nodelist',  '📃');
Rpd.nodetypeicon('util/knob',      '🎛');
Rpd.nodetypeicon('util/dial',      '🎛');
Rpd.nodetypeicon('util/knobs',     '🎛');
Rpd.nodetypeicon('util/color',     '🏮');
Rpd.nodetypeicon('util/bang',      '⊙');
Rpd.nodetypeicon('util/metro',     '⊚');
Rpd.nodetypeicon('util/empty',     '∅');
Rpd.nodetypeicon('util/mouse-pos', '🖱');
Rpd.nodetypeicon('util/mouse-pos-by-bang', '🖱');
//Rpd.nodetypeicon('util/random',   '≟');
//Rpd.nodetypeicon('util/bounded-number', '⩫');
//Rpd.nodetypeicon('util/sum-of-three', '∑');

})(this);
