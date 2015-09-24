Rpd.channeltype('timbre/t-num', {
    adapt: function(v) { return !isNaN(v) ? T(v) : v; },
    accept: function(n) { return !isNaN(n) || (n && n.value); },
    show: function(t_num) {
        return t_num ? t_num.value : '?';
    }
});

Rpd.channeltype('timbre/spinner', {
    adapt: function(val) {
        return { value: val, time: Date.now() };
    }
});

Rpd.channeltype('timbre/t-wave', { });

Rpd.channeltype('timbre/t-obj', { show: function(val) { return val ? '[Some]' : '[None]' } });

// timbre/number

Rpd.nodedescription('timbre/number',
                    'Choose any number using a handy spinner.');
Rpd.nodetype('timbre/number', {
    name: 'num',
    inlets:  { 'in':      { type: 'timbre/t-num',   default: T(0) },
               'spinner': { type: 'timbre/spinner', default: T(0), hidden: true } },
    outlets: { 'out':     { type: 'timbre/t-num' } },
    process: function(inlets) {
        if (inlets.spinner) {
            // if spinner was updated last, use spinner value instead of input
            if ((Date.now() - inlets.spinner.time) < 50) {
                return { 'out': inlets.spinner.value };
            } else {
                return { 'out': inlets.in };
            }
        } else return { 'out': inlets.in };
    }
});

// timbre/osc

Rpd.nodedescription('timbre/osc', 'Oscillator. That\'s it.');
Rpd.nodetype('timbre/osc', {
    name: 'osc',
    description: 'Oscillator. That\'s it.',
    inlets: { 'wave': { type: 'timbre/t-wave', default: "sin" },
              'freq': { type: 'timbre/t-num',  default: T(440) } },
    outlets: { 'sound': { type: 'timbre/t-obj' } },
    process: function(inlets) {
        if (!inlets.wave || !inlets.freq) return null;
        return { 'sound': T('osc', { wave: inlets.wave,
                                     freq: inlets.freq }) };
    }
});

// timbre/wave

Rpd.nodedescription('timbre/wave', 'Choose a wave type, like sine or saw.');
Rpd.nodetype('timbre/wave', {
    name: 'wave',
    inlets: { 'wave': { type: 'timbre/t-wave', default: 'sin', hidden: true } },
    outlets: { 'wave': { type: 'timbre/t-wave' } },
    process: function(inlets) { return { 'wave': inlets.wave } }
});

// timbre/plot

Rpd.nodedescription('timbre/plot', 'Draw your sound wave on a Canvas.');
Rpd.nodetype('timbre/plot', {
    name: 'plot',
    inlets: { 'sound': { type: 'timbre/t-obj', default: null } },
    process: function() {}
});

// timbre/play

Rpd.nodedescription('timbre/play', 'Play a given sound. Control your volume safely.');
Rpd.nodetype('timbre/play', function() {
    var lastSound;
    return {
        name: 'play',
        inlets: { 'sound': { type: 'timbre/t-obj', default: null } },
        tune: function(updates) { return updates.throttle(50); },
        process: function(inlets, inlets_prev) {
            if (inlets_prev.sound) inlets_prev.sound.pause();
            if (inlets.sound) {
                lastSound = inlets.sound;
                inlets.sound.play();
            }
        },
        handle: {
            'node/turn-off': function() {
                if (lastSound) lastSound.pause();
            }
        }
    }
});
