;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

function S(type) {
    return function(v) {
        return Spread.adapt(v, type);
    };
}
function stringify(v) { return v.toString(); };
function accept(type) { return function(v) { return Spread.is(v, type); } };

var NUMBERS  = Spread.NUMBERS,
    VECTORS  = Spread.VECTORS,
    COLORS   = Spread.COLORS,
    ELEMENTS = Spread.ELEMENTS,
    FORCES   = Spread.FORCES;

Rpd.channeltype('anm/number', {
    default: 0,
    readonly: false,
    accept: function(val) {
        if (val === Infinity) return true;
        var parsed = parseFloat(val);
        return !isNaN(parsed) && isFinite(parsed);
    },
    adapt: function(val) { return parseFloat(val); }
});

Rpd.channeltype('anm/numbers',   { adapt: S(NUMBERS),  show: stringify });
Rpd.channeltype('anm/vectors',   { adapt: S(VECTORS),  show: stringify, accept: accept(VECTORS)  });
Rpd.channeltype('anm/colors',    { adapt: S(COLORS),   show: stringify, accept: accept(COLORS)   });
Rpd.channeltype('anm/elements',  { adapt: S(ELEMENTS), show: stringify, accept: accept(ELEMENTS) });
Rpd.channeltype('anm/force',     { show: function(v) { return v ? '[Force]' : 'None'; },
                                   accept: function(v) { return typeof v === 'function'; } });
Rpd.channeltype('anm/shapetype');

Rpd.nodetype('anm/spread', {
    title: 'spread',
    inlets: {
        'min':   { type: 'anm/number', default: 0 },
        'max':   { type: 'anm/number', default: 1 },
        'count': { type: 'anm/number', default: 5 }
    },
    outlets: {
        'spread': { type: 'anm/numbers' }
    },
    process: function(inlets) {
        return {
            'spread': minMaxSpread(inlets.min, inlets.max, inlets.count)
        };
    }
});

Rpd.nodetype('anm/color', {
    title: 'color',
    inlets: {
        'red':   { type: 'anm/numbers', default: 1 },
        'green': { type: 'anm/numbers', default: 1 },
        'blue':  { type: 'anm/numbers', default: 1 },
        'alpha': { type: 'anm/numbers', default: 1 }
    },
    outlets: {
        'color': { type: 'anm/colors' }
    },
    process: function(inlets) {
        return { 'color':
            Spread.join([ inlets.red, inlets.green, inlets.blue, inlets.alpha ], COLORS,
                          function(r, g, b, a) {
                              return 'rgba(' + (r ? Math.round(r * 255) : 0) + ',' +
                                               (g ? Math.round(g * 255) : 0) + ',' +
                                               (b ? Math.round(b * 255) : 0) + ',' +
                                               (a || 0) + ')';
                          })
        };
    }
});

Rpd.nodetype('anm/vector', {
    title: 'vector',
    inlets: {
        'x': { type: 'anm/numbers', default: 0 },
        'y': { type: 'anm/numbers', default: 0 }
    },
    outlets: {
        'vector': { type: 'anm/vectors' }
    },
    process: function(inlets) {
        return { 'vector':
            Spread.join([ inlets.x, inlets.y ], VECTORS,
                          function(x, y) {
                              return new Vector(x, y);
                          })
        };
    }
});

Rpd.nodetype('anm/primitive', {
    title: 'primitive',
    inlets: {
        'pos':    { type: 'anm/vectors', default: Spread.of(new Vector(0, 0),    VECTORS) },
        'color':  { type: 'anm/colors',  default: Spread.of('rgba(255,60,60,1)', COLORS)  },
        //'stroke': { type: 'anm/colors', default: 'transparent'    },
        'size':   { type: 'anm/vectors', default: Spread.of(new Vector(15, 15),  VECTORS) },
        'angle':  { type: 'anm/numbers', default: Spread.of(               0.0,  NUMBERS) },
        //'mass':   { type: 'anm/numbers', default: Spread.of(               1.0,  NUMBERS) },
        'type':   { type: 'anm/shapetype', default: 'rect', hidden: true }
    },
    outlets: {
        'shape': { type: 'anm/elements' }
    },
    process: function(inlets) {
        if (!inlets.type) return;
        return { 'shape':
            Spread.join([ inlets.pos, inlets.color, inlets.size, inlets.angle/*, inlets.mass*/ ], ELEMENTS,
                          function(pos, color, size, angle, mass) {
                              return function(elm) {
                                  elm.move(pos.x, pos.y);
                                  elm.rotate(angle * (Math.PI / 180));
                                  switch (inlets.type) {
                                      case 'dot':  elm.dot(); break;
                                      case 'rect': elm.rect(size.x, size.y); break;
                                      case 'oval': elm.oval(size.x, size.y); break;
                                      case 'triangle': elm.triangle(size.x, size.y); break;
                                  }
                                  elm.fill(color);
                                  //elm._mass = mass;
                                  //return function() {};
                              }
                          })
        };
    }
});

/* Rpd.nodetype('anm/down', {
    title: 'up',
    outlets: {
        'force': { type: 'anm/force' }
    },
    process: function(inlets) {
        return {
            'force': return function(life) {
                return new Vector(0, life * 500);
            }
        }
    }
}); */

Rpd.nodetype('anm/particles', {
    title: 'particles',
    inlets: {
        'particle': { type: 'anm/elements' },
        'force':    { type: 'anm/force',
                      default: function(t) {} } // force === function(life_t) => Vector
        //'rule':     { type: 'anm/rule'    } // rule === function(prev_elm, next_elm)
        //'from':     { type: 'anm/vectors', default: Spread.of(new Vector(15, 15),  VECTORS) }
    },
    outlets: {
        'system': { type: 'anm/elements' }
    },
    process: function(inlets) {
        var lifetime = 2, // seconds
            lifetime_range = 0.4; // seconds
        var origin = new Vector(0, 0),
            pos_range = new Vector(242, 5);
        var speed = 340,
            speed_range = 150;
        var acceleration = new Vector(0, -150);
        // colors, angle, angle_range
        return {
            'system': Spread.join([ inlets.particle, Spread.of(inlets.force, FORCES) ], ELEMENTS,
                                  function(particle/*, force*/) {
                                     return function(elm) {
                                         particle(elm);
                                         //var initial = Math.random() * SEED;
                                         //elm._life = initial;
                                         //var update = force(elm);
                                         return function(t, dt) {
                                             //elm._life = (initial + (t / LIFETIME)) % 1;
                                             //update(elm._life);
                                         }
                                     }
                                 })
        }
    }
});

/* Rpd.nodetype('anm/cross', {
    title: 'cross',
    inlets: {
        'parent': { type: 'anm/elements' },
        'child':  { type: 'anm/elements' }
    },
    outlets: {
        'parent': { type: 'anm/elements' }
    },
    process: function(inlets) {
        return { 'parent':
            Spread.join([ inlets.parent, inlets.child ], ELEMENTS,
                         function(parent, child) {
                            if (!parent || !child) return (parent || child);
                            if (parent === child) return;
                            return parent.add(child);
                         })
        };
    }
}); */

Rpd.nodetype('anm/render', function() {
    var element;
    return {
        title: 'render',
        inlets: {
            'what': { type: 'anm/elements' },
        },
        process: function() { }
    };
});

})(this);
