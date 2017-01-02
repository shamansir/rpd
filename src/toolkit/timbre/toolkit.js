;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

Rpd.channeltype('timbre/t-num', {
    allow: [ 'util/number' ],
    adapt: function(v) { return !isNaN(v) ? T(v) : v; },
    accept: function(n) { return !isNaN(n) || (n && n.value); },
    show: function(t_num) {
        return t_num ? t_num.value : '?';
    }
});

Rpd.channeltype('timbre/t-wave', { });

Rpd.channeltype('timbre/t-obj', { show: function(val) { return val ? '[Some]' : '[None]' } });

// timbre/osc

Rpd.nodedescription('timbre/osc', 'Oscillator. That\'s it.');
Rpd.nodetype('timbre/osc', {
    title: 'osc',
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
    title: 'wave',
    inlets: { 'wave': { type: 'timbre/t-wave', default: 'sin', hidden: true } },
    outlets: { 'wave': { type: 'timbre/t-wave' } },
    process: function(inlets) { return { 'wave': inlets.wave } }
});

// timbre/plot

Rpd.nodedescription('timbre/plot', 'Draw your sound wave on a Canvas.');
Rpd.nodetype('timbre/plot', {
    title: 'plot',
    inlets: { 'sound': { type: 'timbre/t-obj', default: null } },
    process: function() {}
});

// timbre/play

Rpd.nodedescription('timbre/play', 'Play a given sound. Control your volume safely.');
Rpd.nodetype('timbre/play', function() {
    var lastSound;
    return {
        title: 'play',
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

})(this);
