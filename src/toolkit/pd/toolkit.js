Rpd.channeltype('pd/t-num', {
    //accept: function(n) { return n.value ? true : false; },
    show: function(t_num) { return t_num ? t_num.value : '?'; }
});

Rpd.channeltype('pd/spinner', {
    adapt: function(val) {
        return { value: val, time: Date.now() };
    }
});

Rpd.channeltype('pd/t-wave', { });

Rpd.channeltype('pd/t-obj', { show: function(val) { return val ? '[Some]' : '[None]' } });

// pd/number

Rpd.nodedescription('pd/number',
                    'Choose any number using a handy spinner.');
Rpd.nodetype('pd/number', {
    name: 'num',
    inlets:  { 'in':      { type: 'pd/t-num',   default: T(0) },
               'spinner': { type: 'pd/spinner', default: T(0), hidden: true } },
    outlets: { 'out':     { type: 'pd/t-num' } },
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

// pd/osc

Rpd.nodedescription('pd/osc', 'Oscillator. That\'s it.');
Rpd.nodetype('pd/osc', {
    name: 'osc',
    description: 'Oscillator. That\'s it.',
    inlets: { 'wave': { type: 'pd/t-wave', default: "sin" },
              'freq': { type: 'pd/t-num',  default: T(440) } },
    outlets: { 'sound': { type: 'pd/t-obj' } },
    process: function(inlets) {
        if (!inlets.wave || !inlets.freq) return null;
        return { 'sound': T('osc', { wave: inlets.wave,
                                     freq: inlets.freq }) };
    }
});

// pd/wave

Rpd.nodedescription('pd/wave', 'Choose a wave type, like sine or saw.');
Rpd.nodetype('pd/wave', {
    name: 'wave',
    inlets: { 'wave': { type: 'pd/t-wave', default: 'sin', hidden: true } },
    outlets: { 'wave': { type: 'pd/t-wave' } },
    process: function(inlets) { return { 'wave': inlets.wave } }
});

// pd/plot

Rpd.nodedescription('pd/plot', 'Draw your sound wave on a Canvas.');
Rpd.nodetype('pd/plot', {
    name: 'plot',
    inlets: { 'sound': { type: 'pd/t-obj', default: null } },
    process: function() {}
});

// pd/play

Rpd.nodedescription('pd/play', 'Play a given sound. Control your volume safely.');
Rpd.nodetype('pd/play', function() {
    var lastSound;
    return {
        name: 'play',
        inlets: { 'sound': { type: 'pd/t-obj', default: null } },
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
