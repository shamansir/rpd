/*
 * Copyright (c) 2011-2014 by Animatron.
 * All rights are reserved.
 * 
 * Animatron Player is licensed under the MIT License.
 * 
 * v1.3, built at Tue Mar 03 2015 00:47:12 GMT+0100 (CET) / 2015-03-02T23:47:12.566Z
 */



(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var C = require('../constants.js'),
    engine = require('engine'),
    Element = require('./element.js'),
    Clip = Element,
    Brush = require('../graphics/brush.js'),
    provideEvents = require('../events.js').provideEvents,
    AnimationError = require('../errors.js').AnimationError,
    Errors = require('../loc.js').Errors,
    ResMan = require('../resource_manager.js'),
    FontDetector = require('../../vendor/font_detector.js'),
    utils = require('../utils.js'),
    is = utils.is,
    iter = utils.iter;


/* X_ERROR, X_FOCUS, X_RESIZE, X_SELECT, touch events */

var DOM_TO_EVT_MAP = {
  'mouseup':   C.X_MUP,
  'mousedown': C.X_MDOWN,
  'mousemove': C.X_MMOVE,
  'mouseover': C.X_MOVER,
  'mouseout':  C.X_MOUT,
  'click':     C.X_MCLICK,
  'dblclick':  C.X_MDCLICK,
  'keyup':     C.X_KUP,
  'keydown':   C.X_KDOWN,
  'keypress':  C.X_KPRESS
};

// Animation
// -----------------------------------------------------------------------------

/**
 * @class anm.Animation
 *
 * Create an Animation.
 *
 * It holds an elements tree, an id-to-element map, background fill, zoom and
 * repeat option. It also may render itself to any context with {@link anm.Animation#render}
 * method.
 *
 * Use {@link anm.Animation#add()} to add elements to an animation.
 *
 * Use {@link anm.Animation#find()} / {@link anm.Animation#findById()} to search for elements in the animation.
 *
 * Use {@link anm.Animation#each()} / {@link anm.Animation#traverse()} to loop through all direct child elements
 * or through the whole tree of children, correspondingly.
 *
 * See {@link anm.Element Element} for detailed description of the basic "brick" of any animation.
 *
 * @constructor
 */
function Animation() {
    this.id = utils.guid();
    this.tree = [];
    this.hash = {};
    this.name = '';
    this.duration = undefined;
    this.bgfill = null;
    this.width = undefined;
    this.height = undefined;
    this.zoom = 1.0;
    this.speed = 1.0;
    this.repeat = false;
    this.meta = {};
    //this.fps = undefined;
    this.__informEnabled = true;
    this._laters = [];
    this._initHandlers(); // TODO: make automatic
}

Animation.DEFAULT_DURATION = 10;

// mouse/keyboard events are assigned in L.loadAnimation
/* TODO: move them into animation */
provideEvents(Animation, [ C.X_MCLICK, C.X_MDCLICK, C.X_MUP, C.X_MDOWN,
                           C.X_MMOVE, C.X_MOVER, C.X_MOUT,
                           C.X_KPRESS, C.X_KUP, C.X_KDOWN,
                           C.X_DRAW,
                           // player events
                           C.S_CHANGE_STATE,
                           C.S_PLAY, C.S_PAUSE, C.S_STOP, C.S_COMPLETE, C.S_REPEAT,
                           C.S_IMPORT, C.S_LOAD, C.S_RES_LOAD, C.S_ERROR ]);
/**
 * @method add
 * @chainable
 *
 * Append one or several {@link anm.Element elements} to this animation.
 *
 * May be used as:
 *
 * * `anim.add(new anm.Element());`
 * * `anim.add([new anm.Element(), new anm.Element()]);`
 * * `anim.add(function(ctx) {...}, function(t) { ... });`
 * * `anim.add(function(ctx) {...}, function(t) { ... },
 *           function(ctx, prev(ctx)) { ... });`
 *
 * @param {anm.Element|anm.Clip|Array[Element]} subject Any number of Elements to add
 *
 * @return {anm.Element} The Element was appended.
 *
 */
Animation.prototype.add = function(arg1, arg2, arg3) {
    // this method only adds an element to a top-level
    // FIXME: allow to add elements deeper or rename this
    //        method to avoid confusion?
    if (arg2) { // element by functions mode
        var elm = new Element(arg1, arg2);
        if (arg3) elm.changeTransform(arg3);
        this.addToTree(elm);
        //return elm;
    } else if (is.arr(arg1)) { // elements array mode
        var clip = new Clip();
        clip.add(arg1);
        this.addToTree(_clip);
        //return clip;
    } else { // element object mode
        this.addToTree(arg1);
    }
    return this;
};

/**
 * @method remove
 * @chainable
 *
 * Remove (unregister) element from this animation.
 *
 * @param {anm.Element} element
 */
Animation.prototype.remove = function(elm) {
    // error will be thrown in _unregister method
    //if (!this.hash[elm.id]) throw new AnimErr(Errors.A.ELEMENT_IS_NOT_REGISTERED);
    if (elm.parent) {
        // it will unregister element inside
        elm.parent.remove(elm);
    } else {
        this._unregister(elm);
    }
    return this;
};

/**
 * @method traverse
 * @chainable
 *
 * Visit every element in a tree, no matter how deep it is.
 *
 * @param {Function} visitor
 * @param {anm.Element} visitor.element
 * @param {Object} [data]
 */
Animation.prototype.traverse = function(visitor, data) {
    for (var elmId in this.hash) {
        visitor(this.hash[elmId], data);
    }
    return this;
};

/**
 * @method each
 * @chainable
 *
 * Visit every root element (direct Animation child) in a tree.
 *
 * @param {Function} visitor
 * @param {anm.Element} visitor.child
 * @param {Object} [data]
 */
Animation.prototype.each = function(visitor, data) {
    for (var i = 0, tlen = this.tree.length; i < tlen; i++) {
        visitor(this.tree[i], data);
    }
    return this;
};

/**
 * @method iter
 * @chainable
 *
 * Iterate through every root (direct Animation child) element in a tree.
 *
 * @param {Function} iterator
 * @param {anm.Element} iterator.child
 * @param {Boolean} iterator.return `false`, if this element should be removed
 */
Animation.prototype.iter = function(func, rfunc) {
    iter(this.tree).each(func, rfunc);
    return this;
};

/**
 * @method render
 *
 * Render the Animation for given context at given time.
 *
 * @param {Canvas2DContext} context
 * @param {Number} time
 * @param {Number} [dt] The difference in time between current frame and previous one
 */
Animation.prototype.render = function(ctx, time, dt) {
    ctx.save();
    var zoom = this.zoom;
    try {
        if (zoom != 1) {
            ctx.scale(zoom, zoom);
        }
        if (this.bgfill) {
            if (!(this.bgfill instanceof Brush)) this.bgfill = Brush.fill(this.bgfill);
            this.bgfill.apply(ctx);
            ctx.fillRect(0, 0, this.width, this.height);
        }
        this.each(function(child) {
            child.render(ctx, time, dt);
        });
    } finally { ctx.restore(); }
    this.fire(C.X_DRAW,ctx);
};

Animation.prototype.handle__x = function(type, evt) {
    this.traverse(function(elm) {
        elm.fire(type, evt);
    });
    return true;
};

// TODO: test
/**
 * @method getFittingDuration
 *
 * Get the duration where all child elements' bands fit.
 *
 * @return {Number} The calculated duration
 */
Animation.prototype.getFittingDuration = function() {
    var max_pos = -Infinity;
    var me = this;
    this.each(function(child) {
        var elm_tpos = child._max_tpos();
        if (elm_tpos > max_pos) max_pos = elm_tpos;
    });
    return max_pos;
};

/**
 * @method reset
 * @chainable
 *
 * Reset all render-related data for itself, and the data of all the elements.
 */
Animation.prototype.reset = function() {
    this.__informEnabled = true;
    this.each(function(child) {
        child.reset();
    });
    return this;
};

/**
 * @method dispose
 * @chainable
 *
 * Remove every possible allocated data to either never use this animation again or
 * start using it from scratch as if it never was used before.
 */
Animation.prototype.dispose = function() {
    this.disposeHandlers();
    var me = this;
    /* FIXME: unregistering removes from tree, ensure it is safe */
    this.iter(function(child) {
        me._unregister_no_rm(child);
        child.dispose();
        return false;
    });
    return this;
};

/**
 * @method isEmpty
 *
 * Does Animation has any Elements inside.
 *
 * @return {Boolean} `true` if no Elements, `false` if there are some.
 */
Animation.prototype.isEmpty = function() {
    return this.tree.length === 0;
};

/**
 * @method toString
 *
 * Get a pretty description of this Animation
 *
 * @return {String} pretty string
 */
Animation.prototype.toString = function() {
    return "[ Animation "+(this.name ? "'"+this.name+"'" : "")+"]";
};

/**
 * @method subscribeEvents
 * @private
 *
 * @param {Canvas} canvas
 */
Animation.prototype.subscribeEvents = function(canvas) {
    engine.subscribeAnimationToEvents(canvas, this, DOM_TO_EVT_MAP);
};

/**
 * @method unsubscribeEvents
 * @private
 *
 * @param {Canvas} canvas
 */
Animation.prototype.unsubscribeEvents = function(canvas) {
    engine.unsubscribeAnimationFromEvents(canvas, this);
};

/**
 * @method addToTree
 * @private
 *
 * @param {anm.Element} element
 */
Animation.prototype.addToTree = function(elm) {
    if (!elm.children) {
        throw new AnimationError('It appears that it is not a clip object or element that you pass');
    }
    this._register(elm);
    /*if (elm.children) this._addElems(elm.children);*/
    this.tree.push(elm);
};

/*Animation.prototype._addElems = function(elems) {
    for (var ei = 0; ei < elems.length; ei++) {
        var _elm = elems[ei];
        this._register(_elm);
    }
}*/
Animation.prototype._register = function(elm) {
    if (this.hash[elm.id]) throw new AnimationError(Errors.A.ELEMENT_IS_REGISTERED);
    elm.registered = true;
    elm.anim = this;
    this.hash[elm.id] = elm;
    var me = this;
    elm.each(function(child) {
        me._register(child);
    });
};

Animation.prototype._unregister_no_rm = function(elm) {
    this._unregister(elm, true);
};

Animation.prototype._unregister = function(elm, save_in_tree) { // save_in_tree is optional and false by default
    if (!elm.registered) throw new AnimationError(Errors.A.ELEMENT_IS_NOT_REGISTERED);
    var me = this;
    elm.each(function(child) {
        me._unregister(child);
    });
    var pos = -1;
    if (!save_in_tree) {
      while ((pos = this.tree.indexOf(elm)) >= 0) {
        this.tree.splice(pos, 1); // FIXME: why it does not goes deeply in the tree?
      }
    }
    delete this.hash[elm.id];
    elm.registered = false;
    elm.anim = null;
    //elm.parent = null;
};

Animation.prototype._collectRemoteResources = function(player) {
    var remotes = [],
        anim = this;
    this.traverse(function(elm) {
        if (elm._hasRemoteResources(anim, player)) {
           remotes = remotes.concat(elm._collectRemoteResources(anim, player)/* || []*/);
        }
    });
    if(this.fonts && this.fonts.length) {
        remotes = remotes.concat(this.fonts.map(function(f){return f.url;}));
    }
    return remotes;
};

Animation.prototype._loadRemoteResources = function(player) {
    var anim = this;
    this.traverse(function(elm) {
        if (elm._hasRemoteResources(anim, player)) {
           elm._loadRemoteResources(anim, player);
        }
    });
    anim.loadFonts(player);
};

/**
 * @method find
 *
 * Searches for {@link anm.Element elements} by name inside another
 * {@link anm.Element element} or inside the whole Animation itself, if no other
 * element was provided.
 *
 * NB: `find` method will be improved soon to support special syntax of searching,
 * so you will be able to search almost everything
 *
 * @param {String} name Name of the element(s) to find
 * @param {anm.Element} [where] Where to search elements for; if omitted, searches in Animation
 *
 * @return {Array} An array of found elements
 */
Animation.prototype.find = function(name, where) {
    where = where || this;
    var found = [];
    if (where.name == name) found.push(name);
    where.traverse(function(elm)  {
        if (elm.name == name) found.push(elm);
    });
    return found;
};

/**
 * @method findById
 *
 * Searches for {@link anm.Element elements} by ID inside another inside the
 * Animation. Actually, just gets it from hash map, so O(1).
 *
 * @param {String} id ID of the element to find
 * @return {anm.Element|Null} An element you've searched for, or null
 *
 * @deprecated in favor of special syntax in `find` method
 */
Animation.prototype.findById = function(id) {
    return this.hash[id];
};

/*
 * @method invokeAllLaters
 * @private
 */
Animation.prototype.invokeAllLaters = function() {
    for (var i = 0; i < this._laters.length; i++) {
        this._laters[i].call(this);
    }
};

/*
 * @method clearAllLaters
 * @private
 */
Animation.prototype.clearAllLaters = function() {
    this._laters = [];
};

/*
 * @method invokeLater
 * @private
 */
Animation.prototype.invokeLater = function(f) {
    this._laters.push(f);
};

var FONT_LOAD_TIMEOUT = 10000, //in ms
    https = engine.isHttps;

/*
 * @method loadFonts
 * @private
 */
Animation.prototype.loadFonts = function(player) {
    if (!this.fonts || !this.fonts.length) {
        return;
    }

    var fonts = this.fonts,
        style = engine.createStyle(),
        css = '',
        fontsToLoad = [],
        detector = new FontDetector();

    for (var i = 0; i < fonts.length; i++) {
        var font = fonts[i];
        if (!font.url || !font.face) {
            //no font name or url
            continue;
        }
        var url = font.url, woff = font.woff;
        if (https) {
            //convert the URLs to https
            url = url.replace('http:', 'https:');
            if (woff) {
                woff = woff.replace('http:', 'https:');
            }
        }
        fontsToLoad.push(font);
        css += '@font-face {\n' +
            'font-family: "' + font.face + '";\n' +
            'src:' +  (woff ? ' url("'+woff+'") format("woff"),\n' : '') +
            ' url("'+url+'") format("truetype");\n' +
            (font.style ? 'font-style: ' + font.style +';\n' : '') +
            (font.weight ? 'font-weight: ' + font.weight + ';\n' : '') +
            '}\n';
    }

    if (fontsToLoad.length === 0) {
        return;
    }

    style.innerHTML = css;
    document.head.appendChild(style); // FIXME: should use engine

    var getLoader = function(i) {
            var face = fontsToLoad[i].face;
            return function(success) {
                var interval = 100,
                counter = 0,
                intervalId,
                checkLoaded = function() {
                    counter += interval;
                    var loaded = detector.detect(face);
                    if (loaded || counter > FONT_LOAD_TIMEOUT) {
                        // after 10 seconds, we'll just assume the font has been loaded
                        // and carry on. this should help when the font could not be
                        // reached for whatever reason.
                        clearInterval(intervalId);
                        success();
                    }
                };
                intervalId = setInterval(checkLoaded, interval);
            };
    };

    for (i = 0; i < fontsToLoad.length; i++) {
        ResMan.loadOrGet(player.id, fontsToLoad[i].url, getLoader(i));
    }

};

module.exports = Animation;

},{"../../vendor/font_detector.js":37,"../constants.js":9,"../errors.js":10,"../events.js":11,"../graphics/brush.js":14,"../loc.js":22,"../resource_manager.js":30,"../utils.js":34,"./element.js":4,"engine":35}],2:[function(require,module,exports){
// Bands
// -----------------------------------------------------------------------------

var Bands = {};

// recalculate all global bands down to the very
// child, starting from given element
Bands.recalc = function(elm, in_band) {
    in_band = in_band || (elm.parent ? elm.parent.gband : [0, 0]);
    elm.gband = [ in_band[0] + elm.lband[0],
                  in_band[0] + elm.lband[1] ];
    elm.each(function(child) {
        Bands.recalc(child, elm.gband);
    });
};

// makes inner band coords relative to outer space
Bands.wrap = function(outer, inner) {
    if (!outer) return inner;
    return [ outer[0] + inner[0],
             ((outer[0] + inner[1]) <= outer[1]) ?
              (outer[0] + inner[1]) : outer[1]
            ];
};

// makes band maximum wide to fit both bands
Bands.expand = function(from, to) {
    if (!from) return to;
    return [ ((to[0] < from[0]) ?
               to[0] : from[0]),
             ((to[1] > from[1]) ?
              to[1] : from[1])
           ];
};

// finds minimum intersection of the bands
Bands.reduce = function(from, to) {
    if (!from) return to;
    return [ ((to[0] > from[0]) ?
              to[0] : from[0]),
             ((to[1] < from[1]) ?
              to[1] : from[1])
           ];
};

module.exports = Bands;

},{}],3:[function(require,module,exports){
var C = require('../constants.js'),
    CSeg = require('../graphics/segments.js').CSeg;

// Easings
// -----------------------------------------------------------------------------
// function-based easings

var EasingImpl = {};

EasingImpl[C.E_PATH] =
    function(path) {
        /*var path = Path.parse(str);*/
        return function(t) {
            return path.pointAt(t)[1];
        };
    };
EasingImpl[C.E_FUNC] =
    function(f) {
        return f;
    };
EasingImpl[C.E_CSEG] =
    function(seg) {
        return function(t) {
            return seg.atT([0, 0], t)[1];
        };
    };
EasingImpl[C.E_STDF] =
    function(num) {
        return STD_EASINGS[num];
    };

// segment-based easings

var SEGS = {}; // segments cache for easings

function registerSegEasing(alias, points) {
    C['E_'+alias] = alias;
    var seg = new CSeg(points);
    SEGS[alias] = seg;
    var func =
        function(t) {
            return seg.atT([0, 0], t)[1];
        };
    C['EF_'+alias] = func;
    EasingImpl[alias] = function() {
        return func;
    };
}

registerSegEasing('DEF',    [0.250, 0.100, 0.250, 1.000, 1.000, 1.000]); // Default
registerSegEasing('IN',     [0.420, 0.000, 1.000, 1.000, 1.000, 1.000]); // In
registerSegEasing('OUT',    [0.000, 0.000, 0.580, 1.000, 1.000, 1.000]); // Out
registerSegEasing('INOUT',  [0.420, 0.000, 0.580, 1.000, 1.000, 1.000]); // InOut
registerSegEasing('SIN',    [0.470, 0.000, 0.745, 0.715, 1.000, 1.000]); // Sine In
registerSegEasing('SOUT',   [0.390, 0.575, 0.565, 1.000, 1.000, 1.000]); // Sine Out
registerSegEasing('SINOUT', [0.445, 0.050, 0.550, 0.950, 1.000, 1.000]); // Sine InOut
registerSegEasing('QIN',    [0.550, 0.085, 0.680, 0.530, 1.000, 1.000]); // Quad In
registerSegEasing('QOUT',   [0.250, 0.460, 0.450, 0.940, 1.000, 1.000]); // Quad Out
registerSegEasing('QINOUT', [0.455, 0.030, 0.515, 0.955, 1.000, 1.000]); // Quad InOut
registerSegEasing('CIN',    [0.550, 0.055, 0.675, 0.190, 1.000, 1.000]); // Cubic In
registerSegEasing('COUT',   [0.215, 0.610, 0.355, 1.000, 1.000, 1.000]); // Cubic Out
registerSegEasing('CINOUT', [0.645, 0.045, 0.355, 1.000, 1.000, 1.000]); // Cubic InOut
registerSegEasing('QTIN',   [0.895, 0.030, 0.685, 0.220, 1.000, 1.000]); // Quart In
registerSegEasing('QTOUT',  [0.165, 0.840, 0.440, 1.000, 1.000, 1.000]); // Quart Out
registerSegEasing('QTINOUT',[0.770, 0.000, 0.175, 1.000, 1.000, 1.000]); // Quart InOut
registerSegEasing('QIIN',   [0.755, 0.050, 0.855, 0.060, 1.000, 1.000]); // Quint In
registerSegEasing('QIOUT',  [0.230, 1.000, 0.320, 1.000, 1.000, 1.000]); // Quart Out
registerSegEasing('QIINOUT',[0.860, 0.000, 0.070, 1.000, 1.000, 1.000]); // Quart InOut
registerSegEasing('EIN',    [0.950, 0.050, 0.795, 0.035, 1.000, 1.000]); // Expo In
registerSegEasing('EOUT',   [0.190, 1.000, 0.220, 1.000, 1.000, 1.000]); // Expo Out
registerSegEasing('EINOUT', [1.000, 0.000, 0.000, 1.000, 1.000, 1.000]); // Expo InOut
registerSegEasing('CRIN',   [0.600, 0.040, 0.980, 0.335, 1.000, 1.000]); // Circ In
registerSegEasing('CROUT',  [0.075, 0.820, 0.165, 1.000, 1.000, 1.000]); // Circ Out
registerSegEasing('CRINOUT',[0.785, 0.135, 0.150, 0.860, 1.000, 1.000]); // Circ InOut
registerSegEasing('BIN',    [0.600, -0.280, 0.735, 0.045, 1.000, 1.000]); // Back In
registerSegEasing('BOUT',   [0.175, 0.885, 0.320, 1.275, 1.000, 1.000]); // Back Out
registerSegEasing('BINOUT', [0.680, -0.550, 0.265, 1.550, 1.000, 1.000]); // Back InOut

var STD_EASINGS = [
    function(t) { return C.EF_DEF(t); }, // Default
    function(t) { return C.EF_IN(t); },  // In
    function(t) { return C.EF_OUT(t); }, // Out
    function(t) { return C.EF_INOUT(t); }, // InOut
    function(t) { return t*t; },    // 4    In Quad
    function(t) { return t*(2-t); },// 5    Out Quad
    function(t) {                   // 6    In/Out Quad
        if (t < 0.5) return 2*t*t;
        else {
            t = (t-0.5)*2;
            return -(t*(t-2)-1)/2;
        }
    },
    function(t) {                   // 7    In Cubic
        return t*t*t;
    },
    function(t) {                  // 8     Out Cubic
        t = t-1;
        return t*t*t + 1;
    },
    function(t) {                  // 9     In/Out Cubic
        if (t < 0.5) {
            t = t*2;
            return t*t*t/2;
        } else {
            t = (t-0.5)*2-1;
            return (t*t*t+2)/2;
        }
    },
    function(t) {                  // 10   In Sine
        return 1 - Math.cos(t * (Math.PI/2));
    },
    function(t) {                 // 11    Out Sine
        return Math.sin(t * (Math.PI/2));
    },
    function(t) {                 // 12    In/Out Sine
        return -(Math.cos(Math.PI*t) - 1)/2;
    },
    function(t) {                 // 13   In Expo
        return (t<=0) ? 0 : Math.pow(2, 10 * (t - 1));
    },
    function(t) {                // 14    Out Expo
        return t>=1 ? 1 : (-Math.pow(2, -10 * t) + 1);
    },
    function(t) {                // 15    In/Out Expo
        if (t<=0) return 0;
        if (t>=1) return 1;
        if (t < 0.5) return Math.pow(2, 10 * (t*2 - 1))/2;
        else {
            return (-Math.pow(2, -10 * (t-0.5)*2) + 2)/2;
        }
    },
    function(t) {               // 16    In Circle
        return 1-Math.sqrt(1 - t*t);
    },
    function(t) {              // 17     Out Circle
        t = t-1;
        return Math.sqrt(1 - t*t);
    },
    function(t) {              // 18     In/Out Cicrle
        if ((t*=2) < 1) return -(Math.sqrt(1 - t*t) - 1)/2;
        return (Math.sqrt(1 - (t-=2)*t) + 1)/2;
    },
    function(t) {              // 19    In Back
        var s = 1.70158;
        return t*t*((s+1)*t - s);
    },
    function(t) {             // 20     Out Back
        var s = 1.70158;
        return ((t-=1)*t*((s+1)*t + s) + 1);
    },
    function(t) {             // 21     In/Out Back
        var s = 1.70158;
        if ((t*=2) < 1) return (t*t*(((s*=(1.525))+1)*t - s))/2;
        return ((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2)/2;
    },
    function(t) {             // 22     In Bounce
        return 1 - STD_EASINGS[23](1-t);
    },
    function(t) {              // 23    Out Bounce
        if (t < (1/2.75)) {
            return (7.5625*t*t);
        } else if (t < (2/2.75)) {
            return (7.5625*(t-=(1.5/2.75))*t + 0.75);
        } else if (t < (2.5/2.75)) {
            return (7.5625*(t-=(2.25/2.75))*t + 0.9375);
        } else {
            return (7.5625*(t-=(2.625/2.75))*t + 0.984375);
        }
    },
    function(t) {             // 24     In/Out Bounce
        if (t < 0.5) return STD_EASINGS[22](t*2) * 0.5;
        return STD_EASINGS[23](t*2-1) * 0.5 + 0.5;
    }
];

module.exports = EasingImpl;

},{"../constants.js":9,"../graphics/segments.js":17}],4:[function(require,module,exports){
var log = require('../log.js'),
    utils = require('../utils.js'),
    global_opts = require('../global_opts.js');

var iter = utils.iter,
    is = utils.is;

var engine = require('engine');

var C = require('../constants.js');

var provideEvents = require('../events.js').provideEvents;

var Transform = require('../../vendor/transform.js');

var Render = require('../render.js');

var Brush = require('../graphics/brush.js'),
    Color = require('../graphics/color.js'),
    Bounds = require('../graphics/bounds.js');

var Modifier = require('./modifier.js'),
    Painter = require('./painter.js'),
    Bands = require('./band.js');

var AnimationError = require('../errors.js').AnimationError,
    Errors = require('../loc.js').Errors;

// Internal Constants
// -----------------------------------------------------------------------------

var TIME_PRECISION = 9; // the number of digits after the floating point
                        // to round the time when comparing with bands and so on;
                        // used to get rid of floating point-conversion issues

function t_adjust(t) {
    return utils.roundTo(t, TIME_PRECISION);
}

function t_cmp(t0, t1) {
    if (t_adjust(t0) > t_adjust(t1)) return 1;
    if (t_adjust(t0) < t_adjust(t1)) return -1;
    return 0;
}

var isPlayerEvent = function(type) {
    // FIXME: make some marker to group types of events
    return ((type == C.S_CHANGE_STATE) ||
            (type == C.S_PLAY)  || (type == C.S_PAUSE)    ||
            (type == C.S_STOP)  || (type == C.S_REPEAT)   ||
            (type == C.S_LOAD)  || (type == C.S_RES_LOAD) ||
            (type == C.S_ERROR) || (type == C.S_IMPORT)   ||
            (type == C.S_COMPLETE));
};

Element.DEFAULT_PVT = [ 0.5, 0.5 ];
Element.DEFAULT_REG = [ 0.0, 0.0 ];

/**
 * @class anm.Element
 *
 * An Element is literally everything what may be drawn in your animation. Or even not
 * to be drawn, but to have some position. Or to have children elements. Or both.
 *
 * There are also some setter-like methods, and if a name of some setter matches
 * to the according property it sets, a `$` symbol is appended to a property name: like
 * the method {@link anm.Element#fill .fill()} and the property {@link anm.Element#$fill .$fill}. This way allows us not only
 * to avoid name-clashed, but also serves as an additional mark for user that a value of this
 * property is easier to construct with a corresponding helper method, rather than,
 * for example, creating a special {@link anm.Brush Brush} object for a `fill`.
 *
 * See {@link anm.Element#add add()} and {@link anm.Element#remove remove()} methods for documentation
 * on adding and removing children elements.
 *
 * See {@link anm.Element#each each()} and {@link anm.Element#traverse traverse()} method for documentation
 * on iteration over children elements.
 *
 * See {@link anm.Element#path path()}, {@link anm.Element#text text()} and {@link anm.Element#image image()}
 * for documentation on changing the type of the element and the way it draws itself.
 *
 * See {@link anm.Element#rect rect()}, {@link anm.Element#oval oval()} and other shape-related methods
 * for documentation on changing element's shape.
 *
 * See {@link anm.Element#fill fill()}, {@link anm.Element#stroke stroke()} and
 * {@link anm.Element#shadow shadow()} methods for documentation on changing appearance of the element.
 * (Fill/Shadow only apply if element is `path`, `shape` or `text`).
 *
 * See {@link anm.Element#band band()} for documentation on how to set element's lifetime relatively to its parent.
 *
 * See {@link anm.Element#repeat repeat()}, {@link anm.Element#once once()}, {@link anm.Element#stay stay()},
 * {@link anm.Element#loop loop()}, {@link anm.Element#bounce bounce()} for documentation on how to make this element
 * self-repeat or to stay in its last state inside the parent's lifetime.
 *
 * See {@link anm.Tween Tween} and {@link anm.Element#tween tween()} method for documentation on adding tweens.
 *
 * See {@link anm.Modifier Modifier} in pair with {@link anm.Element#modify modify()} method and {@link anm.Painter Painter}
 * in pair with {@link anm.Element#modify paint()} method for documentation on
 * a custom drawing or positioning the element in time.
 *
 * @constructor
 *
 * @param {String} [name]
 * @param {Function} [draw] If one function may draw this element, you may provide it here
 * @param {anm.Element} draw.this
 * @param {Context2D} draw.ctx
 * @param {Function} [onframe] This function may be called on every frame and modify this element position
 * @param {anm.Element} onframe.this
 * @param {Number} onframe.time A current local time
 */
function Element(name, draw, onframe) {

    this.id = utils.guid(); /** @property {String} id element internal ID @readonly */
    this.name = name || ''; /** @property {String} name element's name, if specified */
    this.type = C.ET_EMPTY; /** @property {anm.C.ET_*} type of the element: `ET_EMPTY` (default), `ET_PATH`, `ET_TEXT` or `ET_SHEET` @readonly */
    this.children = [];     /** @property {Array[anm.Element]} children A list of children elements for this one. Use `.add()` and `.remove()` methods to change @readonly */
    this.parent = null;     /** @property {anm.Element} parent parent element, if exists @readonly */
    this.level = 0;         /** @property {Number} level how deep this element is located in animation tree @readonly */
    this.anim = null;       /** @property {anm.Animation} anim the animation this element belongs to / registered in, if it really belongs to one @readonly */
    this.disabled = false;  /** @property {Boolean} visible Is this element visible or not (called, but not drawn) */
    this.visible = true;    /** @property {Boolean} disabled Is this element disabled or not */
    this.$data = null;      /** @property {Any} $data user data */

    this.shown = false; // system flag, set by engine
    this.registered = false; // is registered in animation or not
    this.rendering = false; // in process of rendering or not

    this.initState(); // initializes matrix, values for transformations
    this.initVisuals(); // initializes visual representation storage and data
    this.initTime(); // initialize time position and everything related to time jumps
    this.initEvents(); // initialize events storage and mechanics

    this.$modifiers = {};  /** @property {Array[anm.Modifier]} $modifiers A list of modifiers, grouped by type @readonly */
    this.$painters = {};   /** @property {Array[anm.Painter]} $painters A list of painters, grouped by type @readonly */
    if (onframe) this.modify(onframe);
    if (draw) this.paint(draw);
    this.__modifying = null; // current modifiers class, if modifying
    this.__painting = null; // current painters class, if painting
    this.__modifiers_hash = {}; // applied modifiers, by id
    this.__painters_hash = {}; // applied painters, by id

    this.__detachQueue = [];
    this.__frameProcessors = [];

    this._initHandlers(); // assign handlers for all of the events. TODO: make automatic with provideEvents

    // FIXME: add all of the `provideEvents` method to docs for all elements who provide them
    var me = this,
        default_on = this.on;
    /**
     * @method on
     *
     * Subscribe for an element-related event with a handler.
     *
     * There's quite big list of possible events to subscribe, and it will be added here later. `TODO`
     *
     * For example, `C.X_START` and `C.X_STOP` events are fired when this element's band
     * starts and finishes in process of animation rendering.
     *
     * @param {C.X*} type event type
     * @param {Function} handler event handler
     */
    this.on = function(type, handler) {
        if (type & C.XT_CONTROL) {
            return this.m_on.call(me, type, handler);
        } else return default_on.call(me, type, handler);
        // return this; // FIXME: make chainable
    };

    this.addSysModifiers();
    this.addSysPainters();
    if (global_opts.liveDebug) this.addDebugRender();
}
Element._$ = function(name, draw, onframe) { return new Element(name, draw, onframe); };
Element.NO_BAND = null;
Element.DEFAULT_LEN = Infinity;
Element._customImporters = [];
provideEvents(Element, [ C.X_MCLICK, C.X_MDCLICK, C.X_MUP, C.X_MDOWN,
                         C.X_MMOVE, C.X_MOVER, C.X_MOUT,
                         C.X_KPRESS, C.X_KUP, C.X_KDOWN,
                         C.X_DRAW, C.X_START, C.X_STOP,
                         // player events
                         C.S_CHANGE_STATE,
                         C.S_PLAY, C.S_PAUSE, C.S_STOP, C.S_COMPLETE, C.S_REPEAT,
                         C.S_IMPORT, C.S_LOAD, C.S_RES_LOAD, C.S_ERROR ]);
/**
 * @method is
 *
 * Check, if this element represents {@link anm.Path Path}, {@link anm.Text Text},
 * {@link anm.Sheet Sheet}, or it's empty
 *
 * @param {anm.C.ET_*} type to check for
 * @return {Boolean}
 */
Element.prototype.is = function(type) {
    return this.type == type;
};

Element.prototype.initState = function() {

    /** @property {Number} x position on the X axis, relatively to parent */
    /** @property {Number} y position on the Y axis, relatively to parent */
    /** @property {Number} angle rotation angle, in radians, relative to parent */
    /** @property {Number} sx scale over X axis, relatively to parent */
    /** @property {Number} sx scale over Y axis, relatively to parent */
    /** @property {Number} hx skew over X axis, relatively to parent */
    /** @property {Number} hy skew over Y axis, relatively to parent */
    /** @property {Number} alpha opacity, relative to parent */

    // current state
    this.x = 0; this.y = 0;   // dynamic position
    this.sx = 1; this.sy = 1; // scale by x / by y
    this.hx = 0; this.hy = 0; // shear by x / by y
    this.angle = 0;           // rotation angle
    this.alpha = 1;           // opacity
    // these values are for user to set
    //this.dt = null;
    //this.t = null; this.rt = null; this.key = null;
                               // cur local time (t) or 0..1 time (rt) or by key (t have highest priority),
                               // if both are null — stays as defined

    if (this.matrix) { this.matrix.reset(); }
    else { this.matrix = new Transform(); }

    // previous state
    // FIXME: get rid of previous state completely?
    //        of course current state should contain previous values before executing
    //        modifiers on current frame, but they may happen to be overwritten by other modifiers,
    //        so sometimes it'd be nice to know what was there at previous time for sure;
    //        though user may modify time value also through this.t, and it should contain
    //        current time (probably), but not the last one.
    //        pros: it is useful for collisions, and user can't store it himself
    //        because modifiers modify the state in their order and there will be
    //        no exact moment when it is 'previous', since there always will be
    //        some system modifiers which will work before the user's ones
    //        (or it's ok?)
    //        cons: it's unreadable and may confuse users (with what?)
    this._x = 0; this._y = 0;   // dynamic position
    this._sx = 1; this._sy = 1; // scale by x / by y
    this._hx = 1; this._hy = 1; // shear by x / by y
    this._angle = 0;            // rotation angle
    this._alpha = 1;            // opacity

    // these values are set by engine to provide user with information
    // when previous state was rendered
    //this._dt = null;
    //this._t = null; this._rt = null; this._key = null;
                                // cur local time (t) and 0..1 time (rt) and,
                                // if it was ever applied, the last applied key

    if (this._matrix) { this._matrix.reset(); }
    else { this._matrix = new Transform(); }

    /** @property {Array[Number]} $reg registration point (X and Y position) @readonly */
    /** @property {Array[Number]} $pivot pivot point (relative X and Y position) @readonly */

    this.$reg = Element.DEFAULT_REG;   // registration point (static values)
    this.$pivot = Element.DEFAULT_PVT; // pivot (relative to dimensions)

    return this;
};

Element.prototype.resetState = Element.prototype.initState;
Element.prototype.initVisuals = function() {

    // since properties below will conflict with getters/setters having same names,
    // they're renamed with dollar-sign. this way also allows methods to be replaced
    // with native JS 1.5 getters/setters just in few steps. (TODO)

    /** @property {anm.Brush} $fill element fill @readonly */
    /** @property {anm.Brush} $stroke element stroke @readonly */
    /** @property {anm.Brush} $shadow element shadow @readonly */

    this.$fill = null;   // Fill instance
    this.$stroke = null; // Stroke instance
    this.$shadow = null; // Shadow instance

    // TODO: change to `{anm.Path|anm.Sheet|anm.Text} $visual`
    /** @property {anm.Path} $path set to some curve, if it's a shape @readonly */
    /** @property {anm.Sheet} $sheet set to some image, if it's an image @readonly */
    /** @property {anm.Text} $text set to some text, if it's a text @readonly */

    this.$path = null;  // Path instanse, if it is a shape
    this.$text = null;  // Text data, if it is a text
    this.$image = null; // Sheet instance, if it is an image or a sprite sheet

    this.composite_op = null; // composition operation

    /** @property {anm.Element} $mask masking element @readonly */

    this.$mask = null; // Element instance, if this element has a mask
    this.$mpath = null; // move path, though it's not completely "visual"

    this.$bounds = null; // Element bounds incl. children, cached by time position
    this.lastBoundsSavedAt = null; // time, when bounds were saved last time
    this.$my_bounds = null; // Element bounds on its own, cached

    this.$audio = null;
    this.$video = null;

    return this;
};

Element.prototype.resetVisuals = Element.prototype.initVisuals;
Element.prototype.initTime = function() {

    /** @property {anm.C.R_*} mode the mode of an element repitition `C.R_ONCE` (default) or `C.R_STAY`, `C.R_LOOP`, `C.R_BOUNCE`, see `.repeat()` / `.once()` / `.loop()` methods @readonly */
    /** @property {Number} nrep number of times to repeat, makes sense if the mode is `C.R_LOOP` or `C.R_BOUNCE`, in other cases it's `Infinity` @readonly */

    this.mode = C.R_ONCE; // playing mode
    this.nrep = Infinity; // number of repetions for the mode

    /** @property lband element local band, relatively to parent, use `.band()` method to set it @readonly */
    /** @property gband element global band, relatively to animation @readonly */

    // FIXME: rename to "$band"?
    this.lband = [0, Element.DEFAULT_LEN]; // local band
    this.gband = [0, Element.DEFAULT_LEN]; // global band

    /** @property {Number} t TODO (local time) */
    /** @property {Number} dt TODO (a delta in local time from previous render) */
    /** @property {Number} rt TODO (time position, relative to band) */
    /** @property {String} key TODO (time position by a key name) */
    /** @property {Object} keys TODO (a map of keys -> time) @readonly */
    /** @property {Function} tf TODO (time function) */

    this.keys = {}; // aliases for time jumps
    this.tf = null; // time jumping function

    this.key = null;
    this.t = null;

    this.__resetTimeFlags();

    return this;
};

Element.prototype.resetTime = Element.prototype.initTime;
Element.prototype.__resetTimeFlags = function() {
    this.__lastJump = null; // a time of last jump in time
    this.__jumpLock = false; // set to turn off jumping in time
    this.__firedStart = false; // fired start event
    this.__firedStop = false;  // fired stop event
};
Element.prototype.initEvents = function() {
    this.evts = {}; // events cache
    this.__evt_st = 0; // events state
    this.__evtCache = [];
    return this;
};

Element.prototype.resetEvents = Element.prototype.initEvents;
/**
 * @method path
 * @chainable
 *
 * Set this element to be a {@link anm.Path Path} or get current path.
 *
 * Examples:
 *
 * * `elm.path("M0.0 10.0 L20.0 20.0 C10.0 20.0 15.0 30.0 10.0 9.0 Z")`
 * * `elm.path(new Path().move(0, 10).curve(10, 20, 15, 30, 10, 9))`
 * * `var my_path = elm.path()`
 *
 * @param {String|anm.Path} [path]
 * @return {anm.Path|anm.Element}
 */
Element.prototype.path = function(value) {
    if (value) {
        this.invalidate();
        this.type = C.ET_PATH;
        this.$path = is.str(value) ? new Path(value) : value;
        return this;
    } else return this.$path;
};

/**
 * @method text
 * @chainable
 *
 * Set this element to be a {@link anm.Text Text} or get current text.
 *
 * Examples:
 *
 * * `elm.text("my text")`
 * * `elm.text(["text","in three","lines"])`
 * * `elm.text(new Text("My Text").font("Arial"))`
 * * `elm.text(new Text(["Two lines", "of text"]).font("italic 20px Arial").align(anm.C.TA_RIGHT))`
 * * `var my_text = elm.text()`
 *
 * @param {String|[String]|anm.Text} [text]
 * @return {anm.Text|anm.Element}
 */
Element.prototype.text = function(value) {
    if (value) {
        this.invalidate();
        this.type = C.ET_TEXT;
        this.$text = (is.str(value) || is.arr(value)) ? new Text(value) : value;
        return this;
    } else return this.$text;
};

/**
 * @method image
 * @chainable
 *
 * Set this element to be an {@link anm.Image Image/Sheet} or get current image.
 *
 * Examples:
 *
 * * `elm.image("path://to.my_image.jpg")`
 * * `elm.image(new Image("path://to.my_image.jpg"))`
 * * `elm.image(new Image("path://to.my_image.jpg", function() { console.log("image received"); }))`
 * * `var my_image = elm.image()`
 *
 * @param {String|anm.Image|anm.Sheet} [image] URL or anm.Image instance
 * @param {Function} [callback] a function to be called when image will be received (NB: only appliable if `image` parameter is specified as an URL string)
 * @param {anm.Image} [callback.image] anm.Image instance
 * @param {DomElement} [callback.element] Image Element
 * @return {anm.Image|anm.Sheet|anm.Element}
 */
// TODO: add spite-sheet methods and documenation
Element.prototype.image = function(value, callback) {
    if (value) {
        this.invalidate();
        this.type = C.ET_SHEET;
        this.$image = (is.str(value)) ? new Image(value, callback) : value;
        return this;
    } else return this.$image;
};

/**
 * @method fill
 * @chainable
 *
 * Set fill for this element
 *
 * Examples:
 *
 * * `elm.fill("#ffaa0b")`
 * * `elm.fill("rgb(255,170,11)")`
 * * `elm.fill("rgb(255,170,11,0.8)")`
 * * `elm.fill("hsl(120,50,100%)")`
 * * `elm.fill("hsla(120,50,100%,0.8)")`
 * * `elm.fill(anm.Color.rgb(1.0,0.6,0.1))`
 * * `elm.fill(anm.Color.hsla(Math.PI/3,50,1.0))`
 * * `elm.fill(anm.Brush.grad({0: "#000", 0.5: "#ccc"}))`
 * * `var brush = elm.fill()`
 *
 * @param {String|anm.Brush} [color]
 * @return {anm.Brush|anm.Element}
 */
Element.prototype.fill = function(value) {
    if (value) {
        this.$fill = (value instanceof Brush) ? value : Brush.fill(value);
        return this;
    } else return this.$fill;
};

/**
 * @method noFill
 * @chainable
 *
 * Remove fill from this element (set it to transparency)
 *
 * @return {anm.Element}
 */
Element.prototype.noFill = function() {
    this.$fill = Color.TRANSPARENT;
    return this;
};

/**
* @method stroke
* @chainable
*
* Set stroke for this element
*
* Examples:

* * `elm.stroke("#ffaa0b", 2)`
* * `elm.stroke("rgb(255,170,11)", 4)`
* * `elm.stroke("rgb(255,170,11,0.8)", 5)`
* * `elm.stroke("hsl(120,50,100%)", 3)`
* * `elm.stroke("hsla(120,50,100%,0.8)", 1)`
* * `elm.stroke(anm.Color.rgb(1.0,0.6,0.1), 2)`
* * `elm.stroke(anm.Color.hsla(Math.PI/3,50,1.0), 5)`
* * `elm.stroke(anm.Brush.grad({0: "#000", 0.5: "#ccc"}), 10)`
* * `var brush = elm.stroke()`
*
* @param {String|anm.Brush} [color] color of the stroke
* @param {Number} [width] width of the stroke
* @return {anm.Brush|anm.Element}
*/
Element.prototype.stroke = function(value, width) {
    if (value) {
        if (value instanceof Brush) {
            this.$stroke = value;
            if (is.defined(width)) this.$stroke.width = width;
        } else {
            this.$stroke = Brush.stroke(value, width);
        }
        return this;
    } else return this.$stroke;
};

/**
 * @method noStroke
 * @chainable
 *
 * Remove stroke from this element
 *
 * @return {anm.Element}
 */
Element.prototype.noStroke = function() {
    this.$stroke = null;
    return this;
};

/**
 * @private @method modifiers
 *
 * Call all modifiers of the element. Used in element rendering process.
 * See {@link anm.Modifier Modifier} for detailed documenation on modifiers.
 *
 * @param {Number} ltime local time of the element (relatively to parent element), in seconds
 * @param {Number} [dt] time passed since last frame was rendered, in seconds
 * @param {[C.MOD_*]} [types] the types and order of modifiers to call (`SYSTEM`, `TWEEN`, `USER`, `EVENT`)
 *
 * @return [Boolean] `true` if this element shoud be rendered, `false` if not
 */
Element.prototype.modifiers = function(ltime, dt, types) {
    var elm = this;
    var order = types || Modifier.ALL_MODIFIERS;
    dt = dt || 0;

    // copy current state as previous one
    elm.applyPrevState(elm);

    // FIXME: checkJump is performed before, may be it should store its values inside here?
    if (is.num(elm.__appliedAt)) {
      elm._t   = elm.__appliedAt;
      elm._rt  = elm.__appliedAt * (elm.lband[1] - elm.lband[0]);
    }
    // FIXME: elm.t and elm.dt both should store real time for this moment.
    //        modifier may have its own time, though, but not painter, so painters probably
    //        don't need any additional time/dt and data

    // `elm.key` will be copied to `elm._key` inside `applyPrevState` call

    // TODO: think on sorting tweens/band-restricted-modifiers by time

    elm.__loadEvents();

    var modifiers = this.$modifiers;
    var type, typed_modifiers, modifier, lbtime;
    for (var i = 0, il = order.length; i < il; i++) { // for each type
        type = order[i];

        elm.__modifying = type;
        elm.__mbefore(type);

        typed_modifiers = modifiers[type];
        if (typed_modifiers) {

            for (var j = 0, jl = typed_modifiers.length; j < jl; j++) {
                modifier = typed_modifiers[j];
                // lbtime is band-apadted time, if modifier has its own band
                lbtime = elm.__adaptModTime(modifier, ltime);
                // `null` will be returned from `__adaptModTime` for some modifier,
                // if it is required to skip current one, but continue calling others;
                // when `false` is returned for some modifier, this element should not be rendered at all
                if (lbtime === null) continue;
                // modifier will return false if it is required to skip all next modifiers,
                // returning false from our function means the same
                //                                         // time,      dt, duration
                if ((lbtime === false) || (modifier.call(elm, lbtime[0], dt, lbtime[1]) === false)) {
                    elm.__mafter(ltime, elm.__modifying, false);
                    elm.__modifying = null;
                    return false; // exit the method
                }
            }

        }

        elm.__mafter(ltime, type, true);
    } // for each type

    elm.matrix = Element.getMatrixOf(elm, elm.matrix);

    elm.__modifying = null;

    elm.__appliedAt = ltime;

    elm.resetEvents();

    return true;
};

/**
 * @private @method painters
 *
 * Call all painters of the element. Used in element rendering process.
 * See {@link anm.Painter Painter} for detailed documenation on painters.
 *
 * @param {Context2D} ctx 2D context where element should be drawn
 * @param {[C.PNT_*]} [types] the types and order of painters to call (`SYSTEM`, `USER`, `DEBUG`)
 */
Element.prototype.painters = function(ctx, types) {
    var elm = this;
    var order = types || Painter.ALL_PAINTERS;

    var painters = this.$painters;
    var type, typed_painters, painter;
    for (var i = 0, il = order.length; i < il; i++) { // for each type
        type = order[i];

        elm.__painting = type;
        elm.__pbefore(ctx, type);

        typed_painters = painters[type];
        if (typed_painters) {
            for (var j = 0, jl = typed_painters.length; j < jl; j++) {
                painter = typed_painters[j];
                painter.call(elm, ctx);
            }
        }

        elm.__pafter(ctx, type);
    } // for each type

    elm.__painting = null;
};

/**
 * @private @method forAllModifiers
 *
 * Iterate over all of the modifiers and call given function
 *
 * @param {Function} fn function to call
 * @param {anm.Modifier} fn.modifier modifier
 * @param {C.MOD_*} fn.type modifier type
 */
Element.prototype.forAllModifiers = function(f) {
    var order = Modifier.ALL_MODIFIERS;
    var modifiers = this.$modifiers;
    var type, typed_modifiers, modifier;
    for (var i = 0, il = order.length; i < il; i++) { // for each type
        type = order[i];

        typed_modifiers = modifiers[type];
        if (typed_modifiers) {
            for (var j = 0, jl = typed_modifiers.length; j < jl; j++) {
                f(typed_modifiers[j], type);
            }
        }

    }
};

/**
* @private @method forAllModifiers
*
* Iterate over all of the painters and call given function
*
* @param {Function} fn function to call
* @param {anm.Painter} fn.painter painter
* @param {C.PNT_*} fn.type painter type
*/
Element.prototype.forAllPainters = function(f) {
    var order = Painter.ALL_PAINTERS;
    var painters = this.$painters;
    var type, typed_painters, painter;
    for (var i = 0, il = order.length; i < il; i++) { // for each type
        type = order[i];
        typed_painters = painters[type];
        if (typed_painters) {
            for (var j = 0, jl = typed_painters.length; j < jl; j++) {
                f(typed_painters[j], type);
            }
        }
    }
};

/**
 * @method adapt
 *
 * Adapt a point or several ones to element's local coordinate space (relatively to
 * parent's space). Points are passed as an object `{ x: 100, y: 100 }` or an array
 * `[ { x: 100, y: 100}, { x: 200.5, y: 150 } ]` and returned in the same format.
 *
 * @param {Object|[Object]} pt one or several points to adapt
 * @param {Number} pt.x
 * @param {Number} pt.y
 *
 * @return {Object|[Object]} transformed point or several points
 */
Element.prototype.adapt = function(pts) {
    if (is.arr(pts)) {
        var trg = [];
        var matrix = this.matrix;
        for (var i = 0, il = pts.length; i < il; i++) {
            trg.push(matrix.transformPoint(pts[i].x, pts[i].y));
        }
        return trg;
    } else {
        return this.matrix.transformPoint(pts.x, pts.y);
    }
};

/**
* @method adapt
*
* Adapt bounds to element's local coordinate space (relatively to
* parent's space). Bounds are passed as an object
* `{ x: 100, y: 100, width: 200, height: 150 }`.
*
* @param {Object} bounds bounds to adapt
* @param {Number} bounds.x
* @param {Number} bounds.y
* @param {Number} bounds.width
* @param {Number} bounds.height
*
* @return {Object} transformed bounds
*/
Element.prototype.adaptBounds = function(bounds) {
    var matrix = this.matrix;
    var tl = matrix.transformPoint(bounds.x, bounds.y),
        tr = matrix.transformPoint(bounds.x + bounds.width, bounds.y),
        br = matrix.transformPoint(bounds.x + bounds.width, bounds.y + bounds.height),
        bl = matrix.transformPoint(bounds.x, bounds.y + bounds.height);
    var minX = Math.min(tl.x, tr.x, bl.x, br.x),
        minY = Math.min(tl.y, tr.y, bl.y, br.y),
        maxX = Math.max(tl.x, tr.x, bl.x, br.x),
        maxY = Math.max(tl.y, tr.y, bl.y, br.y);
    return new Bounds(minX, minY, maxX - minX, maxY - minY);
};

/**
 * @method draw
 *
 * Draw element over some context, without applying transformations, even if element
 * has some, since they depend on time. To draw element along with applying
 * transformations in one call, use {@link anm.Element#render render()} method.
 *
 * @param {Context2D} ctx context, where element should be drawn
 */
// > Element.draw % (ctx: Context)
Element.prototype.draw = Element.prototype.painters;
/**
 * @private @method transform
 *
 * Apply every transformation in current matrix to context.
 *
 * @param {Context2D} ctx context
*/
Element.prototype.transform = function(ctx) {
    ctx.globalAlpha *= this.alpha;
    this.matrix.apply(ctx);
    return this.matrix;
};

/**
 * @private @method invTransform
 *
 * Invert current matrix and apply every transformation in it to context.
 *
 * @param {Context2D} ctx context
 */
Element.prototype.invTransform = function(ctx) {
    var inv_matrix = Element.getIMatrixOf(this); // this will not write to elm matrix
    ctx.globalAlpha *= this.alpha;
    inv_matrix.apply(ctx);
    return inv_matrix;
};

/**
 * @method render
 * @chainable
 *
 * Render this element at a given global time, which means execute its full render
 * cycle, starting with checking its time band, and, if band matches time and this
 * element is enabled, calling _modifiers_ (tweens), applying its state to context
 * and then drawing it with _painters_. Plus, does the same recursively for every
 * child or sub-child, if has some.
 *
 * @param {Context2D} ctx context to draw onto
 * @param {Number} gtime global time since the start of the animation (or scene), in seconds
 * @param {Number} dt time passed since the previous frame was rendered, in seconds
 *
 * @return {anm.Element} itself
 */
// > Element.render % (ctx: Context, gtime: Float, dt: Float)
Element.prototype.render = function(ctx, gtime, dt) {
    if (this.disabled) return;
    this.rendering = true;
    // context is saved even before decision, if we draw or not, for safety:
    // because context anyway may be changed with user functions,
    // like modifiers who return false (and we do not want to restrict
    // user to do that)
    var drawMe = false;

    // checks if any time jumps (including repeat modes) were performed and justifies the global time
    // to be locally retative to element's `lband`.
    // NB: the local time returned is NOT in the same 'coordinate system' as the element's
    // `xdata.lband`. `xdata.gband` is completely global and `xdata.lband` is local in
    // relation to element's parent, so `lband == [10, 20]`, means that element starts after
    // 10 second will pass in a parent band. So it is right to have `gband == [10, 20]`
    // and `lband == [10, 20]` on the same element if it has no parent (located on a root level)
    // or its parent's band starts from global zero.
    // So, the `ltime` returned from `ltime()` method is local _relatively to_ `lband` the same way
    // as `state.t` and `state.rt` (and it is why time-jumps are calculated this way), so it means
    // that if the element is on the top level and has `lband` equal to `[10, 20]` like described before,
    // and it has no jumps or end-modes, global time of `5` here will be converted to `ltime == -5` and
    // global time of `12` will be converted to `ltime == 2` and global time of `22` to `ltime == 12`, which
    // will fail the `fits()` test, described somewhere above. If there is a end-mode, say, `loop()`,
    // then global time of `22` will be converted to `ltime == 2` again, so the element will treat it just
    // exactly the same way as it treated the global time of `12`.
    var ltime = this.ltime(gtime);
    drawMe = this.__preRender(gtime, ltime, ctx);
    // fire band start/end events
    // FIXME: may not fire STOP on low-FPS, move an additional check
    // FIXME: masks have no animation set to something, but should to (see masks tests)
    if (this.anim && this.anim.__informEnabled) this.inform(ltime);
    if (drawMe) {
        drawMe = this.fits(ltime) &&
                 this.modifiers(ltime, dt) &&
                 this.visible; // modifiers should be applied even if element isn't visible
    }
    if (drawMe) {
        ctx.save();
        try {
            // update global time with new local time (it may've been
            // changed if there were jumps or something), so children will
            // get the proper value
            gtime = this.gtime(ltime);
            if (!this.$mask) {
                // draw directly to context, if has no mask
                this.transform(ctx);
                this.painters(ctx);
                this.each(function(child) {
                    child.render(ctx, gtime, dt);
                });
            } else {
                // FIXME: the complete mask process should be a Painter.

                var mask = this.$mask;

                // FIXME: move this chain completely into one method, or,
                //        which is even better, make all these checks to be modifiers
                // FIXME: call modifiers once for one moment of time. If there are several
                //        masked elements, they will be called that number of times
                if (!(mask.fits(ltime) &&
                      mask.modifiers(ltime, dt) &&
                      mask.visible)) return;
                      // what should happen if mask doesn't fit in time?

                mask.ensureHasMaskCanvas();
                var mcvs = mask.__maskCvs,
                    mctx = mask.__maskCtx,
                    bcvs = mask.__backCvs,
                    bctx = mask.__backCtx;

                // FIXME: test if bounds are not empty
                var bounds_pts = mask.bounds(ltime).toPoints();

                var minX = Number.MAX_VALUE, minY = Number.MAX_VALUE,
                    maxX = Number.MIN_VALUE, maxY = Number.MIN_VALUE;

                var pt;
                for (var i = 0, il = bounds_pts.length; i < il; i++) {
                    pt = bounds_pts[i];
                    if (pt.x < minX) minX = pt.x;
                    if (pt.y < minY) minY = pt.y;
                    if (pt.x > maxX) maxX = pt.x;
                    if (pt.y > maxY) maxY = pt.y;
                }

                var ratio  = engine.PX_RATIO,
                    x = minX, y = minY,
                    width  = Math.round(maxX - minX),
                    height = Math.round(maxY - minY);

                var last_cvs_size = this._maskCvsSize || engine.getCanvasSize(mcvs);

                if ((last_cvs_size[0] < width) ||
                    (last_cvs_size[1] < height)) {
                    // mcvs/bcvs both always have the same size, so we save/check only one of them
                    this._maskCvsSize = engine.setCanvasSize(mcvs, width, height);
                    engine.setCanvasSize(bcvs, width, height);
                } else {
                    this._maskCvsSize = last_cvs_size;
                }

                var scale = ratio;  // multiple by global scale when it's known

                bctx.clearRect(0, 0, width*scale, height*scale);
                mctx.clearRect(0, 0, width*scale, height*scale);

                bctx.save();
                mctx.save();

                bctx.setTransform(scale, 0, 0, scale, -x*scale, -y*scale);
                mctx.setTransform(scale, 0, 0, scale, -x*scale, -y*scale);

                this.transform(bctx);
                this.painters(bctx);
                this.each(function(child) {
                    child.render(bctx, gtime, dt);
                });

                mask.transform(mctx);
                mask.painters(mctx);
                mask.each(function(child) {
                    child.render(mctx, gtime, dt);
                });

                bctx.globalCompositeOperation = 'destination-in';
                bctx.setTransform(1, 0, 0, 1, 0, 0);
                bctx.drawImage(mcvs, 0, 0);

                ctx.drawImage(bcvs,
                    0, 0, Math.floor(width * scale), Math.floor(height * scale),
                    x, y, width, height);

                mctx.restore();
                bctx.restore();
            }
        } catch(e) { log.error(e); }
          finally { ctx.restore(); }
    }
    // immediately when drawn, element becomes shown,
    // it is reasonable
    this.shown = drawMe;
    this.__postRender();
    this.rendering = false;
    if (drawMe) this.fire(C.X_DRAW,ctx);
    return this;
};

/**
 * @method pivot
 * @chainable
 *
 * Assign a pivot for this element (given in relative coords to element's bounds).
 * This point becomes the center for all the applied transformations.
 *
 * @param {Number} x X position, in range 0..1
 * @param {Number} y Y position, in range 0..1
 * @return {anm.Element} itself
 */
Element.prototype.pivot = function(x, y) {
    this.$pivot = [ x, y ];
    return this;
};

/**
 * @method reg
 * @chainable
 *
 * Assign a registration point for this element (given in points).
 * This point becomes the starting point for all the applied transformations.
 *
 * @param {Number} x X position, in points
 * @param {Number} y Y position, in points
 * @return {anm.Element} itself
 */
Element.prototype.reg = function(x, y) {
    this.$reg = [ x, y ];
    return this;
};

/**
 * @method move
 * @chainable
 *
 * Move this element to some point, once and forever.
 *
 * NB: If this element has tweens, event handlers and/or any modifiers in general,
 * they will rewrite this value on the very next render call—so if you want, while having
 * modifiers, to constantly add these values to the element position, it is
 * recommended to better add a correspoding static tween or modifier to it,
 * rather than calling this method.
 *
 * @param {Number} x X position, in points
 * @param {Number} y Y position, in points
 * @return {anm.Element} itself
 */
Element.prototype.move = function(x, y) {
    this.x = x;
    this.y = y;
    return this;
};

/**
 * @method rotate
 * @chainable
 *
 * Rotate this element to some angle, once and forever.
 *
 * NB: If this element has tweens, event handlers and/or any modifiers in general,
 * they will rewrite this value on the very next render call—so if you want, while having
 * modifiers, to constantly add this value to the element rotation state, it is
 * recommended to better add a correspoding static tween or modifier to it,
 * rather than calling this method.
 *
 * @param {Number} angle angle, in radians
 * @return {anm.Element} itself
 */
Element.prototype.rotate = function(angle) {
    this.angle = angle;
    return this;
};

/**
 * @method rotateInDeg
 * @chainable
 *
 * Rotate this element to some angle, once and forever.
 *
 * NB: If this element has tweens, event handlers and/or any modifiers in general,
 * they will rewrite this value on the very next render call—so if you want, while having
 * modifiers, to constantly add this value to the element rotation state, it is
 * recommended to better add a correspoding static tween or modifier to it,
 * rather than calling this method.
 *
 * @param {Number} angle angle, in degrees
 * @return {anm.Element} itself
 */
Element.prototype.rotateInDeg = function(angle) {
    return this.rotate(angle / 180 * Math.PI);
};

/**
 * @method scale
 * @chainable
 *
 * Scale this element, once and forever.
 *
 * NB: If this element has tweens, event handlers and/or any modifiers in general,
 * they will rewrite this value on the very next render call—so if you want, while having
 * modifiers, to constantly add these values to the element scale state, it is
 * recommended to better add a correspoding static tween or modifier to it,
 * rather than calling this method.
 *
 * @param {Number} sx scale by X axis, in points
 * @param {Number} sy scale by Y axis, in points
 * @return {anm.Element} itself
 */
Element.prototype.scale = function(sx, sy) {
    this.sx = sx;
    this.sy = sy;
    return this;
};

/**
 * @method skew
 * @chainable
 *
 * Skew this element, once and forever.
 *
 * NB: If this element has tweens, event handlers and/or any modifiers in general,
 * they will rewrite this value on the very next render call—so if you want, while having
 * modifiers, to constantly add these values to the element scale state, it is
 * recommended to better add a correspoding static tween or modifier to it,
 * rather than calling this method.
 *
 * @param {Number} hx skew by X axis, in points
 * @param {Number} hy skew by Y axis, in points
 * @return {anm.Element} itself
 */
Element.prototype.skew = function(hx, hy) {
    this.hx = hx;
    this.hy = hy;
    return this;
};

/**
* @method repeat
* @chainable
*
* Repeat this element inside parent's band using specified mode. Possible modes are:
*
* * `C.R_ONCE` — do not repeat at all, just hide this element when its band (lifetime) finished
* * `C.R_STAY` — "play" this element once and then immediately freeze its last frame, and keep showing it until parent's band will finish
* * `C.R_LOOP` — loop this element inside parent's band until the latter will finish
* * `C.R_BOUNCE` — bounce (loop forward and back in time) this element inside parent's band until the latter will finish
*
* So, if element has its own band, and this band fits parent's band at least one time,
* then this element will repeated (or stay) the specified number of times (or infinite
* number of times by default), but only while it still fits parent's band.
*
* If parent's band is infinite and looping is infinite, both elements will stay forever,
* except the case when a parent of a parent has narrower band.
*
* NB: by default, element's band is `[0, Infinity]`, in seconds, relative to parent's band.
* To change it, use {@link anm.Element#band band()} method.
*
* See also: {@link anm.Element#band band()}, {@link anm.Element#once once()},
*           {@link anm.Element#stay stay()}, {@link anm.Element#loop loop()},
*           {@link anm.Element#bounce bounce()}
*
* @param {anm.C.R_*} mode repeat mode, one of the listed above
* @param {Number} nrep number of times to repeat or `Infinity` by default
*
* @return {anm.Element} itself
*/
Element.prototype.repeat = function(mode, nrep) {
    this.mode = mode;
    this.nrep = is.num(nrep) ? nrep : Infinity;
    return this;
};

/**
 * @method once
 * @chainable
 *
 * Do not repeat this element inside the parent's band. In another words, repeat this
 * element just once. In another words, assign this element a default behavior
 * when it element "dies" just after its lifetime is finished. In another words,
 * disable any looping/repeating.
 *
 * See also: {@link anm.Element#band band()}, {@link anm.Element#repeat repeat()}.
 *
 * @return {anm.Element} itself
 */
Element.prototype.once = function() {
    this.mode = C.R_ONCE;
    this.nrep = Infinity;
    return this;
};

/**
 * @method stay
 * @chainable
 *
 * Repeat this element once inside its own band, but freeze its last frame until
 * parents' band will finish, or forever.
 *
 * See also: {@link anm.Element#band band()}, {@link anm.Element#repeat repeat()}.
 *
 * @return {anm.Element} itself
 */
Element.prototype.stay = function() {
    this.mode = C.R_STAY;
    this.nrep = Infinity;
    return this;
};

/**
 * @method loop
 * @chainable
 *
 * Loop this element using its own band until its parent's band will finish, or
 * until specified number of times to repeat will be reached, or forever.
 *
 * See also: {@link anm.Element#band band()}, {@link anm.Element#repeat repeat()}.
 *
 * @param {Number} [nrep] number of times to repeat or `Infinity` by default
 *
 * @return {anm.Element} itself
 */
Element.prototype.loop = function(nrep) {
    this.mode = C.R_LOOP;
    this.nrep = is.num(nrep) ? nrep : Infinity;
    return this;
};

/**
 * @method bounce
 * @chainable
 *
 * Bounce (loop forward and then back) this element using its own band until
 * its parent's band will finish, or until specified number of times to repeat
 * will be reached, or forever.
 *
 * See also: {@link anm.Element#band band()}, {@link anm.Element#repeat repeat()}.
 *
 * @param {Number} [nrep] number of times to repeat or `Infinity` by default
 *
 * @return {anm.Element} itself
 */
Element.prototype.bounce = function(nrep) {
    this.mode = C.R_BOUNCE;
    this.nrep = is.num(nrep) ? nrep : Infinity;
    return this;
};

/**
 * @method modify
 * @chainable
 *
 * Add the Modifier to this element. The Modifier is a function which modifies the
 * element's state, see {@link anm.Modifier Modifier} for detailed information.
 *
 * Examples:
 *
 * * `elm.modify(function(t) { this.x += 1 / t; })`
 * * `elm.modify(new Modifier(function(t) { this.x += 1 / t; }).band(0, 2).easing(fuction(t) { return 1 - t; }))`
 *
 * @param {Function|anm.Modifier} modifier modifier
 * @param {Number} modifier.t local band time
 * @param {Number} [modifier.dt] time passed after last render
 * @param {Number} [modifier.duration] duration of the modifier band or `Infinity` if it has no band
 * @param {Object} [modifier.data] user data
 * @param {anm.Element} modifier.this element, owning the modifier
 *
 * @return {anm.Element} itself
 */
Element.prototype.modify = function(band, modifier) {
    // FIXME!!!: do not pass time, dt and duration neither to modifiers
    //           nor painters, they should be accessible through this.t / this.dt
    if (!is.arr(band)) { modifier = band;
                        band = null; }
    if (!modifier) throw new AnimationError('No modifier was passed to .modify() method');
    if (!is.modifier(modifier) && is.fun(modifier)) {
        modifier = new Modifier(modifier, C.MOD_USER);
    } else if (!is.modifier(modifier)) {
        throw new AnimationError('Modifier should be either a function or a Modifier instance');
    }
    if (!modifier.type) throw new AnimationError('Modifier should have a type defined');
    if (band) modifier.$band = band;
    if (modifier.__applied_to &&
        modifier.__applied_to[this.id]) throw new AnimationError('This modifier is already applied to this Element');
    if (!this.$modifiers[modifier.type]) this.$modifiers[modifier.type] = [];
    this.$modifiers[modifier.type].push(modifier);
    this.__modifiers_hash[modifier.id] = modifier;
    if (!modifier.__applied_to) modifier.__applied_to = {};
    modifier.__applied_to[this.id] = this.$modifiers[modifier.type].length; // the index in the array by type + 1 (so 0 means not applied)
    return this;
};

/**
 * @method removeModifier
 * @chainable
 *
 * Remove the modifier which was applied to this element.
 *
 * @param {Function|anm.Modifier} modifier modifier to remove
 *
 * @return {anm.Element} itself
 */
Element.prototype.removeModifier = function(modifier) {
    // FIXME!!!: do not pass time, dt and duration neither to modifiers
    //           nor painters, they should be accessible through this.t / this.dt
    if (!is.modifier(modifier)) throw new AnimationError('Please pass Modifier instance to removeModifier');
    if (!this.__modifiers_hash[modifier.id]) throw new AnimationError('Modifier wasn\'t applied to this element');
    if (!modifier.__applied_to || !modifier.__applied_to[this.id]) throw new AnimationError(Errors.A.MODIFIER_NOT_ATTACHED);
    //if (this.__modifying) throw new AnimErr("Can't remove modifiers while modifying");
    utils.removeElement(this.__modifiers_hash, modifier.id);
    utils.removeElement(this.$modifiers[modifier.type], modifier);
    utils.removeElement(modifier.__applied_to, this.id);
    return this;
};

/**
 * @method paint
 * @chainable
 *
 * Add the Painter to this element. The Painter is a function which customly draws the
 * element, see {@link anm.Painter Painter} for detailed information.
 *
 * Examples:
 *
 * * `elm.paint(function(ctx) { ctx.fillStyle = '#f00'; ctx.fillRect(0, 0, 200, 200); })`
 * * `elm.paint(new Painter(function(t) { ctx.fillStyle = '#f00'; ctx.fillRect(0, 0, 200, 200); }))`
 *
 * @param {Function|anm.Painter} painter painter
 * @param {Number} painter.ctx context to draw onto
 * @param {Number} [painter.data] user data
 *
 * @return {anm.Element} itself
 */
Element.prototype.paint = function(painter) {
    if (!painter) throw new AnimationError('No painter was passed to .paint() method');
    if (!is.painter(painter) && is.fun(painter)) {
        painter = new Painter(painter, C.MOD_USER);
    } else if (!is.painter(painter)) {
        throw new AnimationError('Painter should be either a function or a Painter instance');
    }
    if (!painter.type) throw new AnimationError('Painter should have a type defined');
    if (painter.__applied_to &&
        painter.__applied_to[this.id]) throw new AnimationError('This painter is already applied to this Element');
    if (!this.$painters[painter.type]) this.$painters[painter.type] = [];
    this.$painters[painter.type].push(painter);
    this.__painters_hash[painter.id] = painter;
    if (!painter.__applied_to) painter.__applied_to = {};
    painter.__applied_to[this.id] = this.$painters[painter.type].length; // the index in the array by type + 1 (so 0 means not applied)
    return this;
};

/**
 * @method removePainter
 * @chainable
 *
 * Remove the painter which was applied to this element.
 *
 * @param {Function|anm.Painter} painter painter to remove
 *
 * @return {anm.Element} itself
 */
Element.prototype.removePainter = function(painter) {
    if (!is.painter(painter)) throw new AnimationError('Please pass Painter instance to removePainter');
    if (!this.__painters_hash[painter.id]) throw new AnimationError('Painter wasn\'t applied to this element');
    if (!painter.__applied_to || !painter.__applied_to[this.id]) throw new AnimErr(Errors.A.PAINTER_NOT_ATTACHED);
    //if (this.__modifying) throw new AnimErr("Can't remove modifiers while modifying");
    utils.removeElement(this.__painters_hash, painter.id);
    utils.removeElement(this.$painters[painter.type], painter);
    utils.removeElement(painter.__applied_to, this.id);
    return this;
};

/**
 * @method tween
 * @chainable
 *
 * Add some Tween to this element. The Tween is a pre-defined way of modifing the
 * element's state, stored in a function. See {@link anm.Tween Tween} for detailed information.
 *
 * Examples:
 *
 * * `elm.tween(new Tween(C.T_ROTATE, [0, Math.PI / 2]))`
 * * `elm.tween(new Tween(C.T_ROTATE, [0, Math.PI / 2]).band(0, 2))`
 * * `elm.tween(new Tween(C.T_ROTATE, [0, Math.PI / 2]).band(0, 2).easing(function(t) { return 1 - t; }))`
 * * `elm.tween(new Tween(C.T_ROTATE, [0, Math.PI / 2]).band(0, 2).easing(anm.C.E_IN))`
 *
 * @param {anm.Tween} tween tween to apply
 *
 * @return {anm.Element} itself
 */
Element.prototype.tween = function(tween) {
    if (!is.tween(tween)) throw new AnimationError('Please pass Tween instance to .tween() method');
    // tweens are always receiving time as relative time
    // is.finite(duration) && duration ? (t / duration) : 0
    return this.modify(tween);
};

/**
* @method removeTween
* @chainable
*
* Remove the tween which was applied to this element.
*
* @param {anm.Tween} tween tween to remove
*
* @return {anm.Element} itself
*/
Element.prototype.removeTween = function(tween) {
    if (!is.tween(tween)) throw new AnimationError('Please pass Tween instance to .removeTween() method');
    return this.removeModifier(tween);
};

/**
* @method add
* @chainable
*
* Add another element (or elements) as a child to this element. Child element will
* have its `.parent` link set to point to current element.
*
* It is also possible to add element via specifying its {@link anm.Painter Painter} and,
* optionally, {@link anm.Modifier Modifier}, i.e. `elm.add(function(ctx) { ... },
* function(t) { ... })`
*
* @param {anm.Element|[anm.Element]} element new child element
*
* @return {anm.Element} parent, itself
*/
Element.prototype.add = function(arg1, arg2, arg3) {
    if (arg2) { // element by functions mode
        var elm = new Element(arg1, arg2);
        if (arg3) elm.changeTransform(arg3);
        this._addChild(elm);
    } else if (is.arr(arg1)) { // elements array mode
        for (var ei = 0, el = elms.length; ei < el; ei++) {
            this._addChild(elms[ei]);
        }
    } else { // element object mode
        this._addChild(arg1);
    }
    this.invalidate();
    return this;
};

/**
 * @method remove
 * @chainable
 *
 * Remove child element which was attached to this element before.
 *
 * @param {anm.Element|[anm.Element]} element element to remove
 *
 * @return {anm.Element} parent, itself
 */
Element.prototype.remove = function(elm) {
    if (!elm) throw new AnimationError(Errors.A.NO_ELEMENT_TO_REMOVE);
    if (this.__safeDetach(elm) === 0) throw new AnimationError(Errors.A.NO_ELEMENT);
    this.invalidate();
    return this;
};

Element.prototype._unbind = function() {
    if (this.parent.__unsafeToRemove ||
        this.__unsafeToRemove) throw new AnimationError(Errors.A.UNSAFE_TO_REMOVE);
    this.parent = null;
    if (this.anim) this.anim._unregister(this);
    // this.anim should be null after unregistering
};

/**
 * @private @method detach
 *
 * Detach element from parent, a part of removing process
 */
Element.prototype.detach = function() {
    if (this.parent.__safeDetach(this) === 0) throw new AnimationError(Errors.A.ELEMENT_NOT_ATTACHED);
};

/**
 * @private @method makeBandFit
 *
 * Loop through the children, find a band that fits them all, and apply it to the element
 */
Element.prototype.makeBandFit = function() {
    var wband = this.findWrapBand();
    this.gband = wband;
    this.lband[1] = wband[1] - wband[0];
};

/**
 * @private @method fits
 *
 * Test if band-local time fits element's parent-local band
 */
Element.prototype.fits = function(ltime) {
    // NB: the local time passed inside is not relative to parent element's
    // band, but relative to local band of this element. So it's ok not to check
    // starting point of lband, since it was already corrected in `ltime()`
    // method. So if this value is less than 0 here, it means that current local
    // time is before the actual band of the element. See a comment in `render`
    // method or `ltime` method for more details.
    if (ltime < 0) return false;
    return t_cmp(ltime, this.lband[1] - this.lband[0]) <= 0;
};

/**
 * @method gtime
 *
 * Get global time (relative to {@link anm.Animation Animation} or {@link anm.Scene scene})
 * from band-local time (relative to element's band, not parent-local)
 *
 * @param {Number} ltime band-local time
 * @return {Number} global time
 */
Element.prototype.gtime = function(ltime) {
    return this.gband[0] + ltime;
};

/**
 * @method ltime
 *
 * Get band-local time (relative to element's band, not parent-local) from
 * global time (relative to {@link anm.Animation Animation} or {@link anm.Scene scene}).
 *
 * *NB:* This method also checks time-jumps and sets some jump-related flags (`FIXME`), so use it with caution.
 *
 * @param {Number} gtime global time
 * @return {Number} band-local time
 */
Element.prototype.ltime = function(gtime) {
    // NB: the `ltime` this method returns is relative to local band of this element
    // and not the band of the parent element, as `lband` does. So having the `0` returned
    // from this method while `lband` of the element is `[10, 20]` (relatively to its
    // parent element) means that it is at position of `10` seconds relatively to parent
    // element. Negative value returned from this method means the passed time is that amount
    // of seconds before the start of `lband` or `gband`, no matter. Positive value means that
    // amount of seconds were passed after the start of `lband`. It is done to make `state.t`/`state.rt`-based
    // jumps easy (`state.t` has the same principle and its value is in the same "coord. system" as the
    // value returned here). See `render()` method comment regarding `ltime` for more details.
    return this.__checkJump(
        Element.checkRepeatMode(gtime, this.gband, this.mode, this.nrep)
    );
};

/**
 * @private @method handlePlayerEvent
 *
 * Pass player event to this element.
 *
 * @param {C.S_*} event
 * @param {Function} handler
 * @param {anm.Player} handler.player
 */
Element.prototype.handlePlayerEvent = function(event, handler) {
    if (!isPlayerEvent(event)) throw new Error('This method is intended to assign only player-related handles');
    this.on(event, handler);
};

/**
 * @private @method inform
 *
 * Inform element with `C.X_START` / `C.X_STOP` events, if passed time matches
 * some end of its band
 *
 * @param {Number} ltime band-local time
 */
Element.prototype.inform = function(ltime) {
    if (t_cmp(ltime, 0) >= 0) {
        var duration = this.lband[1] - this.lband[0],
            cmp = t_cmp(ltime, duration);
        if (!this.__firedStart) {
            this.fire(C.X_START, ltime, duration);
            // FIXME: it may fire start before the child band starts, do not do this!
            /* this.traverse(function(elm) { // TODO: implement __fireDeep
                if (!elm.__firedStart) {
                    elm.fire(C.X_START, ltime, duration);
                    elm.__firedStart = true;
                }
            }); */
            this.__firedStart = true; // (store the counters for fired events?)
            // TODO: handle START event by changing band to start at given time?
        }
        if (cmp >= 0) {
            if (!this.__firedStop) {
                this.fire(C.X_STOP, ltime, duration);
                this.traverse(function(elm) { // TODO: implement __fireDeep
                    if (!elm.__firedStop) {
                        elm.fire(C.X_STOP, ltime, duration);
                        elm.__firedStop = true;
                    }
                });
                this.__firedStop = true;
                // TODO: handle STOP event by changing band to end at given time?
            }
        }
    }
};

/**
 * @method band
 * @chainable
 *
 * Set a time-band of an element (relatively to parent element or an {@link anm.Animation Animation},
 * or {@link anm.Scene Scene}, if this element happened to be a direct child of one). Time-band
 * of an Element is its lifetime, an Element gets its birth and dies at specified time, accordingly.
 * If it has repeat-mode, it resets its local time and starts living again. Time-band is specified in
 * seconds relatively to parent element's time-band.
 *
 * For example, if parent is in a root of animation and has a band of `[ 1.5, 6 ]`, and its child has a
 * band of `[ 3.5, 7 ]`, then this child appears at `5` (`1.5 + 3.5`) seconds of global time and hides at
 * `6` seconds of global time, since its band outlives the parent band, so it was cut.
 *
 * @param {Number} start start time of a band
 * @param {Number} stop stop time of a band
 * @return {anm.Element} itself
 */
Element.prototype.band = function(start, stop) {
    if (!is.defined(start)) return this.lband;
    // FIXME: array bands should not pass
    // if (is.arr(start)) throw new AnimErr('Band is specified with two numbers, not an array');
    if (is.arr(start)) {
        start = start[0];
        stop = start[1];
    }
    if (!is.defined(stop)) { stop = Infinity; }
    this.lband = [ start, stop ];
    if (this.parent) {
        var parent = this.parent;
        this.gband = [ parent.gband[0] + start, parent.gband[0] + stop ];
    }
    // Bands.recalc(this)
    return this;
};

/**
 * @method duration
 * @chainable
 *
 * Get or set duration of an element's band
 *
 * See {@link anm.Element#band band()} method.
 *
 * @param {Number} [value] desired duration
 *
 * @return {anm.Element|Number} itself or current duration value
 */
Element.prototype.duration = function(value) {
    if (!is.defined(value)) return this.lband[1] - this.lband[0];
    this.gband = [ this.gband[0], this.gband[0] + value ];
    this.lband = [ this.lband[0], this.lband[0] + value ];
    return this;
};

/* TODO: duration cut with global band */
/* Element.prototype.rel_duration = function() {
    return
} */
Element.prototype._max_tpos = function() {
    return (this.gband[1] >= 0) ? this.gband[1] : 0;
};

/* Element.prototype.neg_duration = function() {
    return (this.xdata.lband[0] < 0)
            ? ((this.xdata.lband[1] < 0) ? Math.abs(this.xdata.lband[0] + this.xdata.lband[1]) : Math.abs(this.xdata.lband[0]))
            : 0;
} */
/**
 * @private @method m_on
 *
 * Subscribe for mouse or keyboard event over this element (these events are
 * separated from a flow)
 */
Element.prototype.m_on = function(type, handler) {
    this.modify(new Modifier(
        function(t) { /* FIXME: handlers must have priority? */
            if (this.__evt_st & type) {
                var evts = this.evts[type];
                for (var i = 0, el = evts.length; i < el; i++) {
                    if (handler.call(this, evts[i], t) === false) return false;
                }
            }
        }, C.MOD_EVENT));
};

/*Element.prototype.posAtStart = function(ctx) {
    var s = this.state;
    ctx.translate(s.lx, s.ly);
    ctx.scale(s.sx, s.sy);
    ctx.rotate(s.angle);
}*/
// calculates band that fits all child elements, recursively
/* FIXME: test */
Element.prototype.findWrapBand = function() {
    var children = this.children;
    if (children.length === 0) return this.gband;
    var result = [ Infinity, 0 ];
    this.each(function(child) {
        result = Bands.expand(result, child.gband);
        //result = Bands.expand(result, elm.findWrapBand());
    });
    return (result[0] !== Infinity) ? result : null;
};

/**
 * @private @method dispose
 *
 * Dispose the memory-consuming objects, called authomatically on animation end
 */
Element.prototype.dispose = function() {
    this.disposeHandlers();
    this.disposeVisuals();
    this.each(function(child) {
        child.dispose();
    });
};

Element.prototype.disposeVisuals = function() {
    if (this.$path)  this.$path.dispose();
    if (this.$text)  this.$text.dispose();
    if (this.$image) this.$image.dispose();
    if (this.$video) this.$video.dispose();
    if (this.$mpath) this.$mpath.dispose();
};

/**
* @private @method reset
*
* Reset all stored flags and events, called authomatically on animation end
*/
Element.prototype.reset = function() {
    // if positions were set before loading a scene, we don't need to reset them
    //this.resetState();
    this.resetEvents();
    this.__resetTimeFlags();
    /*this.__clearEvtState();*/
    var elm = this;
    this.forAllModifiers(function(modifier) {
        if (modifier.__wasCalled) modifier.__wasCalled[elm.id] = false;
        if (is.defined(modifier.__wasCalledAt)) modifier.__wasCalledAt[elm.id] = -1;
    });
    this.each(function(elm) {
        elm.reset();
    });
};

/**
 * @method each
 * @chainable
 *
 * Iterate over element's children with given function. No sub-children though,
 * see {@link anm.Element#traverse .traverse()} for it.
 *
 * @param {Function} f function to call
 * @param {anm.Element} f.elm child element
 *
 * @return {anm.Element} itself
 */
Element.prototype.each = function(func) {
    var children = this.children;
    this.__unsafeToRemove = true;
    for (var ei = 0, el = children.length; ei < el; ei++) {
        func(children[ei]);
    }
    this.__unsafeToRemove = false;
    return this;
};

/**
 * @method traverse
 * @chainable
 *
 * Iterate over element's children including all the levels of sub-children with
 * given function (see {@link anm.Element#each .each()} method to iterate over
 * only element's own children).
 *
 * @param {Function} f function to call
 * @param {anm.Element} f.elm child element
 *
 * @return {anm.Element} itself
 */
Element.prototype.traverse = function(func) {
    var children = this.children;
    this.__unsafeToRemove = true;
    for (var ei = 0, el = children.length; ei < el; ei++) {
        var elem = children[ei];
        func(elem);
        elem.traverse(func);
    }
    this.__unsafeToRemove = false;
    return this;
};

/**
 * @method iter
 * @chainable
 *
 * _Safely_ iterate over element's children including all the levels of sub-children.
 * Safe iteration assumes that you are able to remove elements in its process.
 *
 * @param {Function} f function to call
 * @param {anm.Element} f.elm child element
 * @param {Function} [rf] function which marks element as the one to remove
 * @param {anm.Element} [rf.elm] child element
 * @param {Boolean} [rf.return] remove element or not
 *
 * @return {anm.Element} itself
 */
Element.prototype.iter = function(func, rfunc) {
    this.__unsafeToRemove = true;
    iter(this.children).each(func, rfunc);
    this.__unsafeToRemove = false;
    return this;
};

/**
 * @method hasChildren
 *
 * Check if this element has children.
 *
 * @return {Boolean} are there any children
 */
Element.prototype.hasChildren = function() {
    return this.children.length > 0;
};

Element.prototype.deepIterateChildren = function(func, rfunc) {
    this.__unsafeToRemove = true;
    iter(this.children).each(function(elem) {
        elem.deepIterateChildren(func, rfunc);
        return func(elem);
    }, rfunc);
    this.__unsafeToRemove = false;
};

Element.prototype.__performDetach = function() {
    var children = this.children;
    iter(this.__detachQueue).each(function(elm) {
        if ((idx = children.indexOf(elm)) >= 0) {
            children.splice(idx, 1);
            elm._unbind();
        }
    });
    this.__detachQueue = [];
};

/**
 * @method clear
 * @chainable
 *
 * Remove all the element's children.
 *
 * @return {anm.Element} itself
 */
Element.prototype.clear = function() {
    if (this.__unsafeToRemove) throw new AnimErr(Errors.A.UNSAFE_TO_REMOVE);
    if (!this.rendering) {
        var children = this.children;
        this.children = [];
        iter(children).each(function(elm) { elm._unbind(); });
    } else {
        this.__detachQueue = this.__detachQueue.concat(this.children);
    }
    return this;
};

/**
 * @private @method lock
 *
 * Disable user-defined jumps in time for this element and freeze up the state
 */
Element.prototype.lock = function() {
    this.__jumpLock = true; // disable jumps in time
    this.__state = this.extractState();
    this.__pstate = this.extractPrevState(); // FIXME: remove previous state
};

/**
 * @private @method unlock
 *
 * Enable user-defined jumps in time for this element and return the state
 */
Element.prototype.unlock = function(collect_res) { // collect_res flag is optional
    var result = collect_res ? this.extractState() : undefined;
    this.applyState(this.__state);
    this.applyPrevState(this.__pstate);
    this.__state = null;
    this.__pstate = null; // FIXME: remove previous state
    this.__jumpLock = false;
    return result;
};

// FIXME: rename and merge get/set into .state() & .prev_state() ?
/**
 * @method extractState
 *
 * Extract element's state to object
 *
 * @return {Object} extracted state
 */
Element.prototype.extractState = function() {
    // see .initState() for values definition
    return {
      x: this.x, y: this.y,
      sx: this.sx, sy: this.sy,
      hx: this.hx, hy: this.hy,
      angle: this.angle,
      alpha: this.alpha,
      t: this.t, rt: this.rt, key: this.key
    };
};

Element.prototype.extractPrevState = function() {
    // see .initState() for values definition
    return {
      x: this._x, y: this._y,
      sx: this._sx, sy: this._sy,
      hx: this._hx, hy: this._hy,
      angle: this._angle,
      alpha: this._alpha,
      t: this._t, rt: this._rt, key: this._key
    };
};

/**
 * @method applyState
 *
 * Apply a complete state from object to element. NB: Rewrites all the values!
 *
 * @param {Object} state state to apply
 * @param {Number} state.x
 * @param {Number} state.y
 * @param {Number} state.sx
 * @param {Number} state.sy
 * @param {Number} state.hx
 * @param {Number} state.hy
 * @param {Number} state.angle
 * @param {Number} state.alpha
 * @param {Number|Null} state.t
 * @param {Number|Null} state.rt
 * @param {String|Null} state.key
 */
Element.prototype.applyState = function(s) {
    this.x = s.x; this.y = s.y;
    this.sx = s.sx; this.sy = s.sy;
    this.hx = s.hx; this.hy = s.hy;
    this.angle = s.angle;
    this.alpha = s.alpha;
    this.t = s.t; this.rt = s.rt; this.key = s.key;
};

Element.prototype.applyPrevState = function(s) {
    this._x = s.x; this._y = s.y;
    this._sx = s.sx; this._sy = s.sy;
    this._hx = s.hx; this._hy = s.hy;
    this._angle = s.angle;
    this._alpha = s.alpha;
    this._t = s.t; this._rt = s.rt; this._key = s.key;
};

/**
 * @method stateAt
 *
 * Get a state object at specified time
 *
 * @param {Number} t time where to take a mask of a state
 * @return {Object} state at given time
 */
Element.prototype.stateAt = function(t) { /* FIXME: test */
    this.lock();
    // calls all modifiers with given time and then unlocks the element
    // and returns resulting state if modifiers succeeded
    // (unlock should be performed independently of success)
    return this.unlock(/* success => return previous state */
              this.modifiers(t, 0, Element.NOEVT_MODIFIERS) // returns true if succeeded
           );
};

/**
 * @method pos
 * @chainable
 *
 * Get or set current position of this element, relatively to parent
 *
 * @param {Number} [x] X-position
 * @param {Number} [y] Y-position
 *
 * @return {anm.Element|Object} element or position
 */
Element.prototype.pos = function(x, y) {
    if (is.defined(x)) return this.move(x, y);
    return { x: this.x, y: this.y };
};

/**
 * @method offset
 *
 * Get current offset of this element, including all the way to the top of the
 * element tree.
 *
 * @param {Number} [x] X-position
 * @param {Number} [y] Y-position
 *
 * @return {anm.Element|Object} element or position
 */
Element.prototype.offset = function() {
    var xsum = 0, ysum = 0;
    var p = this.parent;
    while (p) {
        xsum += p.x;
        ysum += p.y;
        p = p.parent;
    }
    return [ xsum, ysum ];
};

/*Element.prototype.local = function(pt) {
    this.matrix.transformPoint();
}
Element.prototype.global = function(pt) {
    this.matrix.transformPoint();
} */
/**
 * @method invalidate
 * @chainable
 *
 * Invalidate element bounds. Should be called if you change the inner graphical contents
 * of the element (i.e. changed points in path or updated text content, or replaced one image with
 * another, ...).
 *
 * For methods like `.add(child)`, `.remove(child)`, `.path(path)`, `.image(img)`, `.text(txt)`
 * it is done automatically, so no need in calling it if you use them.
 *
 * @return {anm.Element} itself
 */
Element.prototype.invalidate = function() {
    this.$my_bounds = null;
    this.$bounds = null;
    this.lastBoundsSavedAt = null;
    if (this.parent) this.parent.invalidate();
    return this;
};

/**
* @method invalidateVisuals
* @chainable
*
* Invalidate element graphics. Should be called if you change the inner graphical contents
* of the element (i.e. changed points in path or updated text content, or replaced one image with
* another, ...).
*
* For methods like `.add(child)`, `.remove(child)`, `.path(path)`, `.image(img)`, `.text(txt)`
* it is done automatically, so no need in calling it if you use them.
*
* @return {anm.Element} itself
*/
Element.prototype.invalidateVisuals = function() {
    //TODO: replace with this['$' + this.type].invalidate() ?
    var subj = this.$path || this.$text || this.$image || this.$video;
    if (subj) subj.invalidate();
};

/**
 * @method bounds
 *
 * Returns bounds (`x`, `y`, `width`, `height`) of an element in given time,
 * in a parent's coordinate space, including element's children.
 * Last call is cached so if you add/remove children by hands and you want to
 * get new bounds on next call, you need to call `elm.invalidate()` first, just
 * after adding/removing. `elm.add()`/`elm.remove()` methods do it automatically,
 * though.
 *
 * @param {Number} ltime band-local time
 *
 * @return {Object} bounds
 */
Element.prototype.bounds = function(ltime) {
    if (is.defined(this.lastBoundsSavedAt) &&
        (t_cmp(this.lastBoundsSavedAt, ltime) == 0)) return this.$bounds;

    var result = this.myBounds().clone();
    if (this.children.length) {
        // FIXME: test if bounds are not empty
        this.each(function(child) {
            result.add(child.bounds(ltime));
        });
    }
    result = this.adaptBounds(result);

    this.lastBoundsSavedAt = ltime;
    return (this.$bounds = result);
};

/**
 * @method myBounds
 *
 * Returns bounds with no children consideration, and not affected by any
 * matrix — independent of time — pure local bounds.
 *
 * @return {Object} bounds
 */
Element.prototype.myBounds = function() {
    if (this.$my_bounds) return this.$my_bounds;
    var subj = this.$path || this.$text || this.$image || this.$video;
    if (subj) { return (this.$my_bounds = subj.bounds()); }
    else return (this.$my_bounds = Bounds.NONE);
};

/**
 * @method isEmpty
 *
 * Check if this element contains something visual, like path, image or text.
 *
 * @return {Boolean} if element is empty
 */
Element.prototype.isEmpty = function() {
    var my_bounds = this.myBounds();
    return (my_bounds.width === 0) && (my_bounds.height === 0);
};

Element.prototype.applyVisuals = function(ctx) {
    var subj = this.$path || this.$text || this.$image || this.$video;
    if (!subj) return;

    // save/restore is performed inside .apply method
    // FIXME: split into p_applyBrush and p_drawVisuals,
    //        so user will be able to use brushes with
    //        his own painters
    subj.apply(ctx, this.$fill, this.$stroke, this.$shadow);
};

Element.prototype.applyBrushes = function(ctx) {
    if (this.$shadow) { this.$shadow.apply(ctx); }
    if (this.$fill) { this.$fill.apply(ctx); ctx.fill(); }
    if (this.$shadow) { Brush.clearShadow(ctx); }
    if (this.$stroke) { this.$stroke.apply(ctx); ctx.stroke(); }
}

Element.prototype.applyAComp = function(ctx) {
    if (this.composite_op) ctx.globalCompositeOperation = C.AC_NAMES[this.composite_op];
};

/**
 * @method mask
 *
 * Mask this element with another element. Literally, using this method way you
 * may produce animated masks and use masks with children and mask any elements with
 * children, same way. Just ensure both contain some overlapping graphics.
 * To disable masking back, use {@link anm.Element#noMask noMask} method.
 *
 * @param {anm.Element} elm Element to mask with
 *
 * @return {anm.Element} itself
 */
Element.prototype.mask = function(elm) {
    if (!elm) return this.$mask;
    this.$mask = elm;
    return this;
};

/**
 * @method noMask
 *
 * Disable mask previously set with {@link anm.Element#mask mask} method.
 *
 * @return {anm.Element} itself
 */
Element.prototype.noMask = function() {
    this.$mask = null;
    return this;
};

// @private
Element.prototype.ensureHasMaskCanvas = function(lvl) {
    if (this.__maskCvs && this.__backCvs) return;
    this.__maskCvs = engine.createCanvas(1, 1);
    this.__maskCtx = engine.getContext(this.__maskCvs, '2d');
    this.__backCvs = engine.createCanvas(1, 1);
    this.__backCtx = engine.getContext(this.__backCvs, '2d');
};

// @private
Element.prototype.removeMaskCanvases = function() {
    if (this.__maskCvs) engine.disposeElement(this.__maskCvs);
    if (this.__backCvs) engine.disposeElement(this.__backCvs);
    this.__maskCtx = null;
    this.__backCtx = null;
};

Element.prototype.data = function(val) {
    if (!is.defined(val)) return this.$data;
    this.$data = val;
    return this;
};

Element.prototype.toString = function() {
    var buf = [ '[ Element ' ];
    buf.push('\'' + (this.name || this.id) + '\' ');
    /*if (this.children.length > 0) {
        buf.push('( ');
        this.each(function(child) {
            buf.push(child.toString() + ', ');
        });
        buf.push(') ');
    }
    if (this.parent) {
        buf.push('< \'' + (this.parent.name || this.parent.id) + '\' > ');
    }*/
    buf.push(']');
    return buf.join("");
};

/**
 * @method find
 *
 * Find any element inside this element by its name.
 *
 * See also {@link anm.Animation#find animation.find}.
 *
 * NB: `find` method will be improved soon to support special syntax of searching,
 * so you will be able to search almost everything.
 *
 * @param {String} name name of the element to search for
 * @return {anm.Element|Null} found element or `null`
 */
Element.prototype.find = function(name) {
    this.anim.find(name, this);
};

/**
 * @method clone
 *
 * Clone this element.
 *
 * @return {anm.Element} clone
 */
Element.prototype.clone = function() {
    var clone = new Element();
    clone.name = this.name;
    clone.children = [].concat(this.children);
    clone.$modifiers = [].concat(this.$modifiers);
    clone.$painters = [].concat(this.$painters);
    clone.level = this.level;
    //clone.visible = this.visible;
    //clone.disabled = this.disabled;
    // .anim pointer, .parent pointer & PNT_SYSTEMistered flag
    // are not transferred because the clone is another
    // element that should be separately added to some animation
    // in its own time to start working properly
    Element.transferState(this, clone);
    Element.transferVisuals(this, clone);
    Element.transferTime(this, clone);
    // FIXME: What else?
    clone.__u_data = this.__u_data;
    return clone;
};

/**
 * @method shallow
 *
 * Shallow-copy this element: clone itself and clone all of its children, modifiers and painters
 *
 * @return {anm.Element} shallow copy
 */
Element.prototype.shallow = function() {
    var clone = this.clone();
    clone.children = [];
    var src_children = this.children;
    var trg_children = clone.children;
    for (var sci = 0, scl = src_children.length; sci < scl; sci++) {
        var csrc = src_children[sci],
            cclone = csrc.shallow();
        cclone.parent = clone;
        trg_children.push(cclone);
    }
    clone.$modifiers = {};
    this.forAllModifiers(function(modifier, type) {
        clone.modify(modifier);
    });
    clone.$painters = {};
    this.forAllPainters(function(painter, type) {
        clone.paint(painter);
    });
    clone.__u_data = utils.obj_clone(this.__u_data);
    return clone;
};

/**
 * @method asClip
 * @chainable
 *
 * Restrict tweens of this element in a separate band, and repeat them inside.
 * This method is useful for creating sputnik-like animations, where sputnik
 * continues to rotate without time reset, while parent keeps looping its own tweens
 * (say, both move up and down in repetition). Similar to Clips from Flash.
 *
 * A high possibility is this logic (`TODO`) will be moved in some separate
 * `Element` sub-class (named `Clip`?), where instances of this class will act as
 * described above by default, with a band and mode.
 *
 * @param {[Number]} band band, as `[start, stop]`
 * @param {anm.C.M_*} mode repeat mode
 * @param {Number} nrep number of repetition
 *
 * @return {anm.Element} itself
 *
 * @deprecated
 */
Element.prototype.asClip = function(band, mode, nrep) {
    if (mode == C.R_ONCE) return;
    this.clip_band = band;
    this.clip_mode = mode;
    this.clip_nrep = nrep;
    return this;
};

Element.prototype._addChild = function(elm) {
    //if (elm.parent) throw new AnimationError('This element already has parent, clone it before adding');
    elm.parent = this;
    elm.level = this.level + 1;
    this.children.push(elm); /* or add elem.id? */
    if (this.anim) this.anim._register(elm); /* TODO: rollback parent and child? */
    Bands.recalc(this);
};

Element.prototype._stateStr = function() {
    return "x: " + this.x + " y: " + this.y + '\n' +
           "sx: " + this.sx + " sy: " + this.sy + '\n' +
           "angle: " + this.angle + " alpha: " + this.alpha + '\n' +
           "p: " + this.p + " t: " + this.t + " key: " + this.key + '\n';
};

Element.prototype.__mbefore = function(t, type) {
    /*if (type === C.MOD_EVENT) {
        this.__loadEvtsFromCache();
    }*/
};

Element.prototype.__mafter = function(t, type, result) {
    /*if (!result || (type === C.MOD_USER)) {
        this.__lmatrix = Element._getIMatrixOf(this.bstate, this.state);
    }*/
    /*if (!result || (type === C.MOD_EVENT)) {
        this.__clearEvtState();
    }*/
};

Element.prototype.__adaptModTime = function(modifier, ltime) {

    // gets element local time (relative to its local band) and
    // returns modifier local time (relative to its local band)

    // TODO: move to modifier class?

    var elm = this,
        elm_duration = elm.lband[1] - elm.lband[0], // duration of the element's local band
        mod_easing = modifier.$easing, // modifier easing
        mod_time = modifier.$band || modifier.$time, // time (or band) of the modifier, if set
        mod_relative = modifier.relative, // is modifier time or band relative to elm duration or not
        mod_is_tween = modifier.is_tween; // should time be passed in relative time or not

    var res_time,
        res_duration;

    if (elm.clip_band) {
        ltime = Element.checkRepeatMode(ltime, elm.clip_band,
                                        elm.clip_mode || C.R_ONCE, elm.clip_nrep);
        if (ltime < 0) return false;
    }

    // modifier takes the whole element time
    if (mod_time === null) {

        res_time = ltime;
        res_duration = elm_duration;

    // modifier is band-restricted
    } else if (is.arr(mod_time)) {

        var mod_band = mod_time,
            mod_duration;

        // this band is specified relatively to local band in absolute time values
        // (like [0, 7] modifier band for [0, 10] element band)
        if (!mod_relative) {
            mod_duration = mod_band[1] - mod_band[0];
        // this band is specified relatively to local band in relative time values
        // (like [0, 0.7] modifier band for [0, 10] element band means [0, 7], as above)
        } else {
            mod_band = [ mod_band[0] * elm_duration,
                         mod_band[1] * elm_duration ];
            mod_duration = mod_band[1] - mod_band[0];
        }

        res_time = ltime - mod_band[0];
        res_duration = mod_duration;
        if (t_cmp(res_time, 0) < 0) return null;
        if (t_cmp(res_time, res_duration) > 0) return null;

    // modifier is assigned to trigger at some specific time moment
    } else if (is.num(mod_time)) {

        if (modifier.__wasCalled && modifier.__wasCalled[elm.id]) return null;
        var tpos = mod_relative ? (mod_time * elm_duration) : mod_time;
        if (t_cmp(ltime, tpos) >= 0) {
            if (!modifier.__wasCalled) modifier.__wasCalled = {};
            if (!modifier.__wasCalledAt) modifier.__wasCalledAt = {};
            modifier.__wasCalled[elm.id] = true;
            modifier.__wasCalledAt[elm.id] = ltime;
        } else return null;

        res_time = ltime;
        res_duration = elm_duration;

    // if it's something else, do the same as in mod_time == null
    } else {

        res_time = ltime;
        res_duration = elm_duration;

    }

    // correct time/duration if required
    if (mod_relative || mod_is_tween) {
        // tweens and relative modifiers should receive relative time inside
        if (is.finite(res_duration)) {
            res_time = t_adjust(res_time) / t_adjust(res_duration);
            res_duration = t_adjust(res_duration);
        } else {
            // if band duration is infinite, time value is left as it was
        }
    } else {
        res_time = t_adjust(res_time);
        res_duration = t_adjust(res_duration);
    }

    // apply easing, if it's there
    return !mod_easing ? [ res_time, res_duration ]
                       : [ mod_easing(res_time, res_duration),
                           res_duration ];
};

Element.prototype.__pbefore = function(ctx, type) { };
Element.prototype.__pafter = function(ctx, type) { };
Element.prototype.__checkJump = function(at) {
    // FIXME: test if jumping do not fails with floating points problems
    if (this.tf) return this.tf(at);
    var t = null,
        duration = this.lband[1] - this.lband[0];
    // if jump-time was set either
    // directly or relatively or with key,
    // get its absolute local value
    t = (is.defined(this.p)) ? this.p : null;
    t = ((t === null) && (this.t !== null) && is.finite(duration)) ?
        this.t * duration : t;
    t = ((t === null) && (is.defined(this.key))) ?
        this.keys[this.key] : t;
    if (t !== null) {
        if ((t < 0) || (t > duration)) {
            throw new AnimationError('failed to calculate jump');
        }
        if (!this.__jumpLock) {
            // jump was performed if t or rt or key
            // were set:
            // save jump time and return it
            this.__lastJump = [ at, t ];
            this.p = null;
            this.t = null;
            this.key = null;
            return t;
        }
    }
    // set t to jump-time, and if no jump-time
    // was passed or it requires to be ignored,
    // just set it to actual local time
    t = (t !== null) ? t : at;
    if (is.defined(this.__lastJump)) {
        /* return (jump_pos + (t - jumped_at)) */
        return (is.finite(this.__lastJump[1]) ?
            this.__lastJump[1] : 0) + (t - this.__lastJump[0]);
       // overflow will be checked in fits() method,
       // or recalculated with loop/bounce mode
       // so if this clip longs more than allowed,
       // it will be just ended there
       /* return ((this.__lastJump + t) > this.gband[1])
             ? (this.__lastJump + t)
             : this.gband[1]; */
    }
    return t;
}
Element.prototype.handle__x = function(type, evt) {
    if (!isPlayerEvent(type) &&
        (type != C.X_START) &&
        (type != C.X_STOP)) {
      if (this.shown) {
        this.__saveEvt(type, evt);
      } else {
        return false;
      }
    }
    return true;
};

Element.prototype.__saveEvt = function(type, evt) {
    this.__evtCache.push([type, evt]);
};

Element.prototype.__loadEvents = function() {
    var cache = this.__evtCache;
    var cache_len = cache.length;
    this.resetEvents();
    if (cache_len > 0) {
        var edata, type, evts;
        for (var ei = 0; ei < cache_len; ei++) {
            edata = cache[ei];
            type = edata[0];
            this.__evt_st |= type;
            evts = this.evts;
            if (!evts[type]) evts[type] = [];
            evts[type].push(edata[1]);
        }
        this.__evtCache = [];
    }
};

Element.prototype.__preRender = function(gtime, ltime, ctx) {
    var cr = this.__frameProcessors;
    for (var i = 0, cl = cr.length; i < cl; i++) {
        if (cr[i].call(this, gtime, ltime, ctx) === false) return false;
    }
    return true;
};

Element.prototype.__safeDetach = function(what, _cnt) {
    var pos = -1, found = _cnt || 0;
    var children = this.children;
    if ((pos = children.indexOf(what)) >= 0) {
        if (this.rendering || what.rendering) {
            this.__detachQueue.push(what/*pos*/);
        } else {
            if (this.__unsafeToRemove) throw new AnimationError(Errors.A.UNSAFE_TO_REMOVE);
            what._unbind();
            children.splice(pos, 1);
        }
        return 1;
    } else {
        this.each(function(ielm) {
            found += ielm.__safeDetach(what, found);
        });
        return found;
    }
};

Element.prototype.__postRender = function() {
    // clear detach-queue
    this.__performDetach();
};

Element.prototype._hasRemoteResources = function(anim, player) {
    if (player.imagesEnabled && this.$image) return true;
    if (this.is(C.ET_AUDIO) && player.audioEnabled) return true;
    if (this.is(C.ET_VIDEO) && player.videoEnabled) return true;

    return false;
};

Element.prototype._collectRemoteResources = function(anim, player) {
    var resources = [];

    if (player.imagesEnabled && this.$image) {
        resources.push(this.$image.src);
    }

    if (player.audioEnabled && this.is(C.ET_AUDIO)) {
        resources.push(this.$audio.url);
    }

    if (player.videoEnabled && this.is(C.ET_VIDEO)) {
        resources.push(this.$video.url);
    }

    return resources;
};

Element.prototype._loadRemoteResources = function(anim, player) {
    if (player.imagesEnabled && this.$image) {
        this.$image.load(player.id);
    }
    if (this.is(C.ET_AUDIO) && player.audioEnabled) {
        this.$audio.load(player);
    }
    if (this.is(C.ET_VIDEO) && player.videoEnabled) {
        this.$video.load(player);
    }
};

Element.mergeStates = function(src1, src2, trg) {
    trg.x  = src1.x  + src2.x;  trg.y  = src1.y  + src2.y;
    trg.sx = src1.sx * src2.sx; trg.sy = src1.sy * src2.sy;
    trg.hx = src1.hx + src2.hx; trg.hy = src1.hy + src2.hy;
    trg.angle = src1.angle + src2.angle;
    trg.alpha = src1.alpha + src2.alpha;
};

Element.transferState = function(src, trg) {
    trg.x = src.x; trg.y = src.y;
    trg.sx = src.sx; trg.sy = src.sy;
    trg.hx = src.hx; trg.hy = src.hy;
    trg.angle = src.angle;
    trg.alpha = src.alpha;
    trg.$reg = [].concat(src.$reg);
    trg.$pivot = [].concat(src.$pivot);
};

Element.transferVisuals = function(src, trg) {
    trg.$fill = Brush.clone(src.$fill);
    trg.$stroke = Brush.clone(src.$stroke);
    trg.$shadow = Brush.clone(src.$shadow);
    trg.$path = src.$path ? src.$path.clone() : null;
    trg.$text = src.$text ? src.$text.clone() : null;
    trg.$image = src.$image ? src.$image.clone() : null;
    trg.$audio = src.$audio ? src.$audio.clone() : null;
    trg.$video = src.$video ? src.$video.clone() : null;
    trg.$mask = src.$mask ? src.$mask : null;
    trg.$mpath = src.$mpath ? src.$mpath.clone() : null;
    trg.composite_op = src.composite_op;
};

Element.transferTime = function(src, trg) {
    trg.mode = src.mode; trg.nrep = src.nrep;
    trg.lband = [].concat(src.lband);
    trg.gband = [].concat(src.gband);
    trg.keys = [].concat(src.keys);
    trg.tf = src.tf;
};

// TODO: rename to matrixOf ?
Element.getMatrixOf = function(elm, m) {
    var t = (m ? (m.reset(), m)
                : new Transform());
    t.translate(elm.x, elm.y);
    t.rotate(elm.angle);
    t.shear(elm.hx, elm.hy);
    t.scale(elm.sx, elm.sy);
    t.translate(-elm.$reg[0], -elm.$reg[1]);

    var pivot = elm.$pivot;
    if ((pivot[0] === 0) && (pivot[1] === 0)) return t;
    var my_bounds = elm.myBounds();
    if (!my_bounds) return t;
    t.translate(pivot[0] * my_bounds.width,
                pivot[1] * my_bounds.height);

    return t;
};

Element.getIMatrixOf = function(elm, m) {
    var t = Element.getMatrixOf(elm, m);
    t.invert();
    return t;
};

Element.checkRepeatMode = function(time, band, mode, nrep) {
    if (!is.finite(band[1])) return time - band[0];
    var durtn, ffits, fits, t;
    switch (mode) {
        case C.R_ONCE:
            return time - band[0];
        case C.R_STAY:
            return (t_cmp(time, band[1]) <= 0) ?
                time - band[0] : band[1] - band[0];
        case C.R_LOOP: {
                durtn = band[1] - band[0];
                if (durtn < 0) return -1;
                ffits = (time - band[0]) / durtn;
                fits = Math.floor(ffits);
                if ((fits < 0) || (ffits > nrep)) return -1;
                t = (time - band[0]) - (fits * durtn);
                return t;
            }
        case C.R_BOUNCE: {
                durtn = band[1] - band[0];
                if (durtn < 0) return -1;
                ffits = (time - band[0]) / durtn;
                fits = Math.floor(ffits);
                if ((fits < 0) || (ffits > nrep)) return -1;
                t = (time - band[0]) - (fits * durtn);
                t = ((fits % 2) === 0) ? t : (durtn - t);
                return t;
            }
    }
};

/* TODO: add createFromImgUrl?
 Element.imgFromURL = function(url) {
    return new Sheet(url);
}*/

Element.prototype.addSysModifiers = function() {
    // band check performed in checkJump
    // Render.m_checkBand
    // Render.m_saveReg
    // Render.m_applyPos
};

Element.prototype.addSysPainters = function() {
    this.paint(Render.p_applyAComp);
    this.paint(Render.p_drawVisuals);
};

Element.prototype.addDebugRender = function() {
    this.paint(Render.p_drawPivot);
    this.paint(Render.p_drawReg);
    this.paint(Render.p_drawName);
    this.paint(Render.p_drawMPath);
};

module.exports = Element;

},{"../../vendor/transform.js":38,"../constants.js":9,"../errors.js":10,"../events.js":11,"../global_opts.js":12,"../graphics/bounds.js":13,"../graphics/brush.js":14,"../graphics/color.js":15,"../loc.js":22,"../log.js":23,"../render.js":29,"../utils.js":34,"./band.js":2,"./modifier.js":5,"./painter.js":6,"engine":35}],5:[function(require,module,exports){
var C = require('../constants.js'),
    is = require('../utils.js').is,
    EasingImpl = require('./easing.js'),
    guid = require('../utils.js').guid;


Modifier.ORDER = [ C.MOD_SYSTEM, C.MOD_TWEEN, C.MOD_USER, C.MOD_EVENT ];
// these two simplify checking in __mafter/__mbefore
Modifier.FIRST_MOD = C.MOD_SYSTEM;
Modifier.LAST_MOD = C.MOD_EVENT;
// modifiers groups
Modifier.ALL_MODIFIERS = [ C.MOD_SYSTEM, C.MOD_TWEEN, C.MOD_USER, C.MOD_EVENT ];
Modifier.NOEVT_MODIFIERS = [ C.MOD_SYSTEM, C.MOD_TWEEN, C.MOD_USER ];

// It's not a common constructor below, but the function (though still pretending to
// be a constructor), which adds custom properties to a given Function instance
// (and it is almost ok, since no `Function.prototype` is harmed this way, but only an instance).
// For user it looks and acts as a common constructor, the difference is just in internals.
// This allows us to store modifiers as plain functions and give user ability to add them
// by just pushing into array.

// FIXME: `t` should be a property of an element, even `dt` also may appear like so,
//        duration is accessible through this.duration() inside the modifier

/**
 * @class anm.Modifier
 *
 * Modifier is a function which changes element's state (position, rotation angle, opacity...) over time.
 * Tweens are actually implemented sub-cases of modifiers. Together, Modifiers and {@link anm.Painter Painters}
 * are supposed to be a pair of function types sufficient to draw any element in any place of a scene. So, any
 * Element may have any number of modifiers and/or painters which are executed in order on every frame.
 *
 * Examples:
 *
 * * `elm.modify(function(t) { this.x += 1 / t; })`
 * * `elm.modify(new Modifier(function(t) { this.x += 1 / t; }))` — modifier with a band equal to element's band
 * * `elm.modify(new Modifier(function(t) { this.x += 1 / t; })).band(0, 2))` — modifier with its own band, relative to element's band
 * * `elm.modify(new Modifier(function(t) { this.x += 1 / t; })).easing(C.E_INOUT))` — modifier using pre-defined easing
 * * `elm.modify(new Modifier(function(t) { this.x += 1 / t; })).easing(C.E_PATH, new anm.Path().move(10, 10).line(20, 20)))` — modifier using pre-defined path-based easing
 * * `elm.modify(new Modifier(function(t) { this.x += 1 / t; })).easing(fuction(t) { return 1 - t; }))` — modifier with custom time-easing function
 * * `elm.modify(new Modifier(function(t) { this.x += 1 / t; })).band(0, 2).easing(fuction(t) { return 1 - t; }))` — modifier with both band and easing specified
 * * `elm.modify(new Modifier(function(t) { this.x += 1 / t; })).time(5)` — modifier to be called at exact local element time (_"trigger-modifier"_)
 *
 * See also: {@link anm.Element#modify element.modify()} method, {@link anm.Tween Tween} class, {@link anm.Painter Painter} class.
 *
 * @constructor
 *
 * @param {Function} f function to use as a base of modifier
 * @param {Number} f.t element band-local time, in seconds, when this function was called
 * @param {Number} [f.dt] time passed after the previous render of the scene
 * @param {Number} [f.duration] duration of the modifier band, or, if it's a trigger-modifier, duration of the element band
 * @param {anm.Element} f.this element, owning the modifier
 *
 * @return {anm.Modifier} modifier instance
 */
function Modifier(func, type) {
    func.id = guid();
    func.type = type || C.MOD_USER;
    func.$data = null;
    func.$band = func.$band || null; // either band or time is specified
    func.$time = is.defined(func.$time) ? func.$time : null; // either band or time is specified
    func.$easing = func.$easing || null;
    func.relative = is.defined(func.relative) ? func.relative : false; // is time or band are specified relatively to element
    func.is_tween = (func.is_tween || (func.type == C.MOD_TWEEN) || false); // should modifier receive relative time or not (like tweens)
    // TODO: may these properties interfere with something? they are assigned to function instances
    func[C.MARKERS.MODIFIER_MARKER] = true;
    /**
     * @method band
     * @chainable
     *
     * Set or get a band for this modifier. By default, any modifier is executed
     * during the whole lifetime of the element. If you specify a band, modifier
     * will have its own lifetime inside element's band, so it will affect it only
     * during a special part of time. This band is defined in band-local time, relative
     * to element's band. This way tweens with their own bands are created.
     *
     * Opposite to {@link anm.Modifier#time time()} method.
     *
     * @param {Number} start start time, in seconds, relative to element's band
     * @param {Number} [stop] stopping time, in seconds, relative to element's band, or `Infinity` by default
     *
     * @return {anm.Modifier|[Number]} itself, or a band
     */
    func.band = function(start, stop) {
        if (!is.defined(start)) return this.$band;
        // FIXME: array bands should not pass
        if (is.arr(start)) {
            // NB: be aware, the order "stop, then start" is important here,
            //     because we modify start value intself in the second expression,
            //     so we should take stop value before.
            stop = start[1];
            start = start[0];
        }
        if (!is.defined(stop)) { stop = Infinity; }
        this.$band = [ start, stop ];
        return func;
    };
    /**
     * @method time
     * @chainable
     *
     * Set or get a time when this modifier should be called, just once. This type of modifiers
     * is called trigger-modifiers and is opposite to band-restricted modifiers. It is similar
     * to event handler, but an event here is a time.
     *
     * @param {Number} t time to trigger at, in seconds, relative to element's band
     *
     * @return {anm.Modifier|Number} itself, or a value of current time to trigger at
     */
    func.time = function(value) {
        if (!is.num(value)) return this.$time;
        this.$time = value;
        return this;
    };
    /**
     * @method easing
     * @chainable
     *
     * Set or get time-easing function for this modifier. There are several easings
     * functions accessible from the box.
     *
     * Easing function receives time to adapt, in a range of `0..1`, as a percentage progress inside a
     * modifier's own band, if it was specified, or an owner-element band, if modifier has no own band.
     *
     * Examples:
     *
     * * `.easing(C.E_INOUT)` — pre-defined easing, and there are a lot of possible ones: `E_IN`, `E_OUT`, `E_SIN` for SineIn, `E_QOUT` for Quad Out, `E_CRINOUT` for Circ InOut, `E_EIN` for Expo In, `B_OUT` for Back Out...
     * * `.easing(C.E_PATH, new anm.Path.move(10, 10).line(20, 20))` — pre-defined data-based easing, in this example it uses path as a base for easing (has more sense with curves, though, see {@link anm.Path Path} documentation)
     * * `.easing(function(t) { return 1 - t; })` — custom easing function
     *
     * @param {Function|anm.C.E_*} f a function which converts incoming time to the time that will be passed to modifier
     * @param {Number} f.t a time to adapt, `0..1` as a percentage progress inside a band (which one? see above;)
     * @param {Object} [data] if this easing is pre-defined and requires some data, this data may be passed here
     *
     * @return {anm.Modifier|Function} modifier itself, or current easing function
     */
    func.easing = function(f, data) {
        if (!f) return this.$easing;
        this.$easing = convertEasing(f, data, this.relative || this.is_tween);
        return this;
    };

    func.data = function(data) {
        if (!is.defined(data)) return this.$data;
        this.$data = data;
        return this;
    };
    return func;
}

var convertEasing = function(easing, data, relative) {
    if (!easing) return null;
    var f;
    if (is.str(easing)) {
        f = EasingImpl[easing](data);
        return relative ? f : function(t, len) { return f(t / len, len) * len; };
    }
    if (is.fun(easing) && !data) return easing;
    if (is.fun(easing) && data) return easing(data);
    if (easing.type) {
        f = EasingImpl[easing.type](easing.data || data);
        return relative ? f : function(t, len) { return f(t / len, len) * len; };
    }
    if (easing.f) return easing.f(easing.data || data);
};

module.exports = Modifier;

},{"../constants.js":9,"../utils.js":34,"./easing.js":3}],6:[function(require,module,exports){
var C = require('../constants.js'),
    guid = require('../utils.js').guid;
// FIXME: order should not be important, system should add painters in proper order
//        by itself.

Painter.ORDER = [ C.PNT_SYSTEM, C.PNT_USER, C.PNT_DEBUG ];
// these two simplify checking in __mafter/__mbefore
Painter.FIRST_PNT = C.PNT_SYSTEM;
Painter.LAST_PNT = C.PNT_DEBUG;
// painters groups
Painter.ALL_PAINTERS = [ C.PNT_SYSTEM, C.PNT_USER, C.PNT_DEBUG ];
Painter.NODBG_PAINTERS = [ C.PNT_SYSTEM, C.PNT_USER ];

// See description above for Modifier constructor for details, same technique

/**
 * @class anm.Painter
 *
 * Painter is a function which draws element over time in given context.
 * Together, {@link anm.Modifier Modifiers} and Painters are supposed to be a pair
 * of function types sufficient to draw any element in any place of a scene.
 * So, any {@link anm.Element Element} may have any number of modifiers and/or
 * painters which are executed in order on every frame.
 *
 * Examples:
 *
 * * `elm.paint(function(ctx) { ctx.fillStyle = '#f00'; ctx.fillRect(0, 0, 20, 20) })`
 * * `elm.paint(function(ctx, t) { ctx.fillStyle = Color.rgb(255 * t, 0, 0); ctx.fillRect(0, 0, 20, 20) })`
 * * `elm.paint(new Painter(function(ctx) { ctx.fillStyle = '#f00'; ctx.fillRect(0, 0, 20, 20) }))`
 * * `elm.paint(new Painter(function(ctx, t) { ctx.fillStyle = Color.rgb(255 * t, 0, 0); ctx.fillRect(0, 0, 20, 20) }))
 *
 * See also: {@link anm.Element#paint element.paint()} method, {@link anm.Modifier Modifier} class.
 *
 * @constructor
 *
 * @param {Function} f function to use as a base of painter
 * @param {Context2D} f.ctx context to draw on
 * @param {Number} [f.t] element band-local time, in seconds, when this function was called
 * @param {Number} [f.dt] time passed after the previous render of the scene
 * @param {Number} [f.duration] duration of the the element band
 * @param {anm.Element} f.this element, owning the painter
 *
 * @return {anm.Painter} painter instance
 */
function Painter(func, type) {
    func.id = guid();
    func.type = type || C.PNT_USER;
    func[C.MARKERS.PAINTER_MARKER] = true;
    return func;
}


module.exports = Painter;

},{"../constants.js":9,"../utils.js":34}],7:[function(require,module,exports){
var C = require('../constants.js'),
    is = require('../utils.js').is,
    Modifier = require('./modifier.js'),
    AnimationError = require('../errors.js').AnimationError,
    Brush = require('../graphics/brush.js');

/**
 * @class anm.Tween
 * @extends anm.Modifier
 *
 * Tween, under the hood, is a pre-defined {@link anm.Modifier Modifier}.
 * It changes element state (position. rotation, ...) over the time, but in
 * this case you may choose from a prepared recipe without writing a function on
 * your own.
 *
 * For example, scale Tween is a Modifier with this code:
 *
 * ```
 * var data = [ [ 0.5, 0.5 ], [ 1.0, 2.0 ] ];
 * function(t) {
 *     this.sx = data[0][0] * (1.0 - t) + data[1][0] * t;
 *     this.sy = data[0][1] * (1.0 - t) + data[1][1] * t;
 * };
 * ```
 *
 * To add a tween to some element, you just need to know its type and provide
 * both start-value and end-value, so it will automatically interpolate one to
 * another.
 *
 * Also see {@link anm.Element#translate translate()}, {@link anm.Element#scale scale()},
 * {@link anm.Element#rotate rotate()}, {@link anm.Element#scale scale()}, {@link anm.Element#skew skew()},
 * {@link anm.Element#alpha alpha()}, {@link anm.Element#color color()}
 *
 * Examples:
 *
 * TODO: examples with strings instead of constants
 *
 * * `elm.tween(new Tween(C.T_ROTATE, [0, Math.PI / 2]))`
 * * `elm.tween(new Tween(C.T_ROTATE, [0, Math.PI / 2]).band(0, 2))`
 * * `elm.tween(new Tween(C.T_ROTATE, [0, Math.PI / 2]).band(0, 2).easing(function(t) { return 1 - t; }))`
 * * `elm.tween(new Tween(C.T_ROTATE, [0, Math.PI / 2]).band(0, 2).easing(anm.C.E_IN))`
 */
function Tween(tween_type, data) {
    if (!tween_type) throw new Error('Tween type is required to be specified or function passed');
    var func;
    if (is.fun(tween_type)) {
        func = tween_type;
    } else {
        func = Tweens[tween_type](data);
        func.tween = tween_type;
    }
    func.is_tween = true;
    var mod = Modifier(func, C.MOD_TWEEN);
    mod.$data = data;
    // FIXME: value should be an array i.e. for scale tween, use object like { sx: <num>, sy: <num> } instead
    mod.from = function(val) {
                   if (!is.defined(val) && this.$data) return this.$data[0];
                   if (!this.$data) this.$data = [];
                   this.$data[0] = val;
                   return this;
               };
    mod.to   = function(val) {
                   if (!is.defined(val) && this.$data) return this.$data[1];
                   if (!this.$data) this.$data = [];
                   this.$data[1] = val;
                   return this;
               };
    mod.data = data_block_fn; // FIXME
    return mod;
}

var data_block_fn = function() {
    throw new AnimationError("Data should be passed to tween in a constructor or using from()/to() methods");
};

// TODO: add function to add every tween type in easy way, may be separate module?
// .tween(new anm.Tween(C.T_TRANSLATE, [[0, 0], [100, 100]]).band(0, Infinity)) does not work

// tween order
Tween.TWEENS_PRIORITY = {};
Tween.TWEENS_COUNT = 0;

var Tweens = {};

Tween.addTween = function(id, func) {
    Tweens[id] = func;
    Tween.TWEENS_PRIORITY[id] = Tween.TWEENS_COUNT++;
};

Tween.addTween(C.T_TRANSLATE, function(data) {
    return function(t, dt, duration) {
        var p = data.pointAt(t);
        if (!p) return;
        this.x = p[0];
        this.y = p[1];
        // we should null the moving path, if it was empty
        this.$mpath = (data.length() > 0) ? data : null;
    };
});

// TODO: add translate by points tween
/* Tween.addTween(C.T_TRANSLATE, function(data) {
    return function(t, dt, duration) {
        var p = data.pointAt(t);
        if (!p) return;
        this.$mpath = data;
        this.x = p[0];
        this.y = p[1];
    };
}); */

// FIXME: data should be an object instead of array
Tween.addTween(C.T_SCALE, function(data) {
    return function(t, dt, duration) {
      this.sx = data[0][0] * (1.0 - t) + data[1][0] * t;
      this.sy = data[0][1] * (1.0 - t) + data[1][1] * t;
    };
});

Tween.addTween(C.T_ROTATE, function(data) {
    return function(t, dt, duration) {
        this.angle = data[0] * (1.0 - t) + data[1] * t;
    };
});

Tween.addTween(C.T_ROT_TO_PATH, function(data) {
    return function(t, dt, duration) {
        var path = this.$mpath;
        if (path) this.angle = path.tangentAt(t);
    };
});

Tween.addTween(C.T_ALPHA, function(data) {
    return function(t, dt, duration) {
        this.alpha = data[0] * (1.0 - t) + data[1] * t;
    };
});

Tween.addTween(C.T_SHEAR, function(data) {
    return function(t, dt, duration) {
        this.hx = data[0][0] * (1.0 - t) + data[1][0] * t;
        this.hy = data[0][1] * (1.0 - t) + data[1][1] * t;
    };
});

Tween.addTween(C.T_FILL, function(data) {
    var interp_func = Brush.interpolateBrushes(data[0], data[1]);
    return function(t, dt, duration) {
        this.$fill = interp_func(t);
    };
});

Tween.addTween(C.T_STROKE, function(data) {
    var interp_func = Brush.interpolateBrushes(data[0], data[1]);
    return function (t, dt, duration) {
        this.$stroke = interp_func(t);
    };
});

Tween.addTween(C.T_SHADOW, function(data) {
    var interp_func = Brush.interpolateBrushes(data[0], data[1]);
    return function (t, dt, duration) {
        this.$shadow = interp_func(t);
    };
});

Tween.addTween(C.T_VOLUME, function(data){
    return function(t) {
        if (!this.$audio.loaded) return;
        var volume = data[0] * (1.0 - t) + data[1] * t;
        this.$audio.setVolume(volume);
    };
});


module.exports = Tween;

},{"../constants.js":9,"../errors.js":10,"../graphics/brush.js":14,"../utils.js":34,"./modifier.js":5}],8:[function(require,module,exports){
(function (global){
// Private configuration
// -----------------------------------------------------------------------------
var PRIVATE_CONF = '__anm_conf',
    C = require('./constants.js');

// private developer-related configuration
// TODO: merge actual properties with default values, if they are set
var conf = global[PRIVATE_CONF] || {
        logImport: false, // FIXME: create a hash-map of such values, by key
        logResMan: false, //        or just remove these flags in favor of log.debug
        logEvents: false,
        logLevel: C.L_ERROR | C.L_WARN | C.L_INFO,
        doNotLoadAudio: false,
        doNotLoadImages: false,
        doNotRenderShadows: false,
        engine: null
    };
global[PRIVATE_CONF] = conf;

module.exports = conf;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./constants.js":9}],9:[function(require,module,exports){
// Constants
// -----------------------------------------------------------------------------
var C = {};

// Logging
// -----------------------------------------------------------------------------

C.L_DEBUG = 1;
C.L_INFO = 2;
C.L_WARN = 4;
C.L_ERROR = 8;

// Markers
// -----------------------------------------------------------------------------
C.MARKERS = {};
C.MARKERS.MODIFIER_MARKER = '__modifier';
C.MARKERS.PAINTER_MARKER  = '__painter';

// ### Player states
/* ----------------- */

C.NOTHING = -1;
C.STOPPED = 0;
C.PLAYING = 1;
C.PAUSED = 2;
C.LOADING = 3;
C.RES_LOADING = 4;
C.ERROR = 5;

// public constants below are also appended to C object, but with `X_`-like prefix
// to indicate their scope, see through all file

// ### Player Modes constants
/* -------------------------- */

C.M_CONTROLS_ENABLED = 1;    C.M_CONTROLS_DISABLED = 2;
C.M_INFO_ENABLED = 4;        C.M_INFO_DISABLED = 8;
C.M_HANDLE_EVENTS = 16;      C.M_DO_NOT_HANDLE_EVENTS = 32;
C.M_DRAW_STILL = 64;         C.M_DO_NOT_DRAW_STILL = 128;
C.M_INFINITE_DURATION = 256; C.M_FINITE_DURATION = 512;

C.M_PREVIEW = C.M_CONTROLS_DISABLED
              | C.M_INFO_DISABLED
              | C.M_DO_NOT_HANDLE_EVENTS
              | C.M_DRAW_STILL
              | C.M_FINITE_DURATION;
C.M_DYNAMIC = C.M_CONTROLS_DISABLED
              | C.M_INFO_DISABLED
              | C.M_HANDLE_EVENTS
              | C.M_DO_NOT_DRAW_STILL
              | C.M_INFINITE_DURATION;
C.M_VIDEO = C.M_CONTROLS_ENABLED
            | C.M_INFO_DISABLED
            | C.M_DO_NOT_HANDLE_EVENTS
            | C.M_DRAW_STILL
            | C.M_FINITE_DURATION;
C.M_SANDBOX = C.M_CONTROLS_DISABLED
            | C.M_INFO_DISABLED
            | C.M_DO_NOT_HANDLE_EVENTS
            | C.M_DO_NOT_DRAW_STILL
            | C.M_FINITE_DURATION;

// ### Load targets
/* ---------------- */

C.LT_ANIMATION = 1;
C.LT_ELEMENTS = 2;
C.LT_IMPORT = 3;
C.LT_URL = 4;

// ### Loading modes
/* ---------------- */

C.LM_ONREQUEST = 'onrequest';
C.LM_ONPLAY = 'onplay';
// C.LM_ONSCROLL
// C.LM_ONSCROLLIN

C.LM_DEFAULT = C.LM_ONREQUEST;


// Element
// -----------------------------------------------------------------------------

// type
C.ET_EMPTY = 'empty';
C.ET_PATH = 'path';
C.ET_TEXT = 'text';
C.ET_SHEET = 'image';
C.ET_AUDIO = 'audio';
C.ET_VIDEO = 'video';

// repeat mode
C.R_ONCE = 0;
C.R_STAY = 1;
C.R_LOOP = 2;
C.R_BOUNCE = 3;

// composite operation
C.C_SRC_OVER = 1; // first (default) is 1, to pass if test
C.C_SRC_ATOP = 2;
C.C_SRC_IN = 3;
C.C_SRC_OUT = 4;
C.C_DST_OVER = 5;
C.C_DST_ATOP = 6;
C.C_DST_IN = 7;
C.C_DST_OUT = 8;
C.C_LIGHTER = 9;
C.C_DARKER = 10;
C.C_COPY = 11;
C.C_XOR = 12;

C.AC_NAMES = [];
C.AC_NAMES[C.C_SRC_OVER] = 'source-over';
C.AC_NAMES[C.C_SRC_ATOP] = 'source-atop';
C.AC_NAMES[C.C_SRC_IN]   = 'source-in';
C.AC_NAMES[C.C_SRC_OUT]  = 'source-out';
C.AC_NAMES[C.C_DST_OVER] = 'destination-over';
C.AC_NAMES[C.C_DST_ATOP] = 'destination-atop';
C.AC_NAMES[C.C_DST_IN]   = 'destination-in';
C.AC_NAMES[C.C_DST_OUT]  = 'destination-out';
C.AC_NAMES[C.C_LIGHTER]  = 'lighter';
C.AC_NAMES[C.C_DARKER]   = 'darker';
C.AC_NAMES[C.C_COPY]     = 'copy';
C.AC_NAMES[C.C_XOR]      = 'xor';

C.BT_NONE = 'none';
C.BT_FILL = 'fill';
C.BT_STROKE = 'stroke';
C.BT_SHADOW = 'shadow';

// align
C.TA_LEFT = 'left';
C.TA_CENTER = 'center';
C.TA_RIGHT = 'right';

// baseline
C.BL_TOP = 'top';
C.BL_MIDDLE = 'middle';
C.BL_BOTTOM = 'bottom';
C.BL_ALPHABETIC = 'alphabetic';
C.BL_HANGING = 'hanging';
C.BL_IDEOGRAPHIC = 'ideographic';

C.PC_ROUND = 'round';
C.PC_BUTT = 'butt';
C.PC_MITER = 'miter';
C.PC_SQUARE = 'square';
C.PC_BEVEL = 'bevel';

// Easings constants

C.E_PATH = 'PATH'; // Path
C.E_FUNC = 'FUNC'; // Function
C.E_CSEG = 'CSEG'; // Segment
C.E_STDF = 'STDF'; // Standard function from editor

// Tween constants

C.T_TRANSLATE   = 'TRANSLATE';
C.T_SCALE       = 'SCALE';
C.T_ROTATE      = 'ROTATE';
C.T_ROT_TO_PATH = 'ROT_TO_PATH';
C.T_ALPHA       = 'ALPHA';
C.T_SHEAR       = 'SHEAR';
C.T_FILL        = 'FILL';
C.T_STROKE      = 'STROKE';
C.T_VOLUME = 'VOLUME';
C.T_SHADOW = 'SHADOW';



// modifiers classes
C.MOD_SYSTEM = 'system';
C.MOD_TWEEN = 'tween';
C.MOD_USER = 'user';
C.MOD_EVENT = 'event';

// painters classes
C.PNT_SYSTEM = 'system';
C.PNT_USER = 'user';
C.PNT_DEBUG = 'debug';

module.exports = C;

},{}],10:[function(require,module,exports){
function __errorAs(name) {
  return function (message) {
      if (Error.captureStackTrace) Error.captureStackTrace(this, this);
      var err = new Error(message || '');
      err.name = name;
      return err;
  };
}

module.exports = {
  SystemError:__errorAs('SystemError'),
  PlayerError: __errorAs('PlayerError'),
  AnimationError: __errorAs('AnimationError')
};

},{}],11:[function(require,module,exports){
var C = require('./constants.js');

// Events
// -----------------------------------------------------------------------------
C.__enmap = {};

function registerEvent(id, name, value) {
    C[id] = value;
    C.__enmap[value] = name;
}


// TODO: use EventEmitter
// FIXME: all errors below were AnimErr instances

// adds specified events support to the `subj` object. `subj` object receives
// `handlers` property that keeps the listeners for each event. Also, it gets
// `e_<evt_name>` function for every event provided to call it when it is
// required to call all handlers of all of thise event name
// (`fire('<evt_name>', ...)` is the same but can not be reassigned by user).
// `subj` can define `handle_<evt_name>` function to handle concrete event itself,
// but without messing with other handlers.
// And, user gets `on` function to subcribe to events and `provides` to check
// if it is allowed.
function provideEvents(subj, events) {
    subj.prototype._initHandlers = (function(evts) { // FIXME: make automatic
        return function() {
            var _hdls = {};
            this.handlers = _hdls;
            for (var ei = 0, el = evts.length; ei < el; ei++) {
                _hdls[evts[ei]] = [];
            }
        };
    })(events);
    subj.prototype.on = function(event, handler) {
        if (!this.handlers) throw new Error('Instance is not initialized with handlers, call __initHandlers in its constructor');
        if (!this.provides(event)) throw new Error('Event \'' + C.__enmap[event] +
                                                     '\' not provided by ' + this);
        if (!handler) throw new Error('You are trying to assign ' +
                                        'undefined handler for event ' + event);
        this.handlers[event].push(handler);
        // FIXME: make it chainable, use handler instance to unbind, instead of index
        return (this.handlers[event].length - 1);
    };
    subj.prototype.fire = function(event/*, args*/) {
        if (!this.handlers) throw new Error('Instance is not initialized with handlers, call __initHandlers in its constructor');
        if (!this.provides(event)) throw new Error('Event \'' + C.__enmap[event] +
                                                     '\' not provided by ' + this);
        if (this.disabled) return;
        var evt_args = Array.prototype.slice.call(arguments, 1);
        if (this.handle__x && !(this.handle__x.apply(this, arguments))) return;
        var name = C.__enmap[event];
        if (this['handle_'+name]) this['handle_'+name].apply(this, evt_args);
        var _hdls = this.handlers[event];
        for (var hi = 0, hl = _hdls.length; hi < hl; hi++) {
            _hdls[hi].apply(this, evt_args);
        }
    };
    subj.prototype.provides = (function(evts) {
        return function(event) {
            if (!this.handlers) throw new Error('Instance is not initialized with handlers, call __initHandlers in its constructor');
            if (!event) return evts;
            return this.handlers.hasOwnProperty(event);
        };
    })(events);
    subj.prototype.unbind = function(event, idx) {
        if (!this.handlers) throw new Error('Instance is not initialized with handlers, call __initHandlers in its constructor');
        if (!this.provides(event)) throw new Error('Event ' + event +
                                                     ' not provided by ' + this);
        if (this.handlers[event][idx]) {
            this.handlers[event].splice(idx, 1);
        } else {
            throw new Error('No such handler ' + idx + ' for event ' + event);
        }
    };
    subj.prototype.disposeHandlers = function() {
        if (!this.handlers) throw new Error('Instance is not initialized with handlers, call __initHandlers in its constructor');
        var _hdls = this.handlers;
        for (var evt in _hdls) {
            if (_hdls.hasOwnProperty(evt)) _hdls[evt] = [];
        }
    };
    /* FIXME: call fire/e_-funcs only from inside of their providers, */
    /* TODO: wrap them with event objects */
    var makeFireFunc = function(event) {
        return function(evtobj) {
            this.fire(event, evtobj);
        };
    };

    for (var ei = 0, el = events.length; ei < el; ei++) {
        subj.prototype['e_'+events[ei]] = makeFireFunc(events[ei]);
    }
}

registerEvent('S_NEW_PLAYER', 'new_player', 'new_player');
registerEvent('S_PLAYER_DETACH', 'player_detach', 'player_detach');

// ### Events
/* ---------- */

// NB: All of the events must have different values, or the flow will be broken
// FIXME: allow grouping events, i.e. value may a group_marker + name of an event
//        also, allow events to belong to several groups, it may replace a tests like
//        XT_MOUSE or XT_CONTROL or isPlayerEvent

// * mouse
registerEvent('X_MCLICK', 'mclick', 1);
registerEvent('X_MDCLICK', 'mdclick', 2);
registerEvent('X_MUP', 'mup', 4);
registerEvent('X_MDOWN', 'mdown', 8);
registerEvent('X_MMOVE', 'mmove', 16);
registerEvent('X_MOVER', 'mover', 32);
registerEvent('X_MOUT', 'mout', 64);

registerEvent('XT_MOUSE', 'mouse',
  (C.X_MCLICK | C.X_MDCLICK | C.X_MUP | C.X_MDOWN | C.X_MMOVE | C.X_MOVER | C.X_MOUT));

// * keyboard
registerEvent('X_KPRESS', 'kpress', 128);
registerEvent('X_KUP', 'kup', 256);
registerEvent('X_KDOWN', 'kdown', 1024);

registerEvent('XT_KEYBOARD', 'keyboard',
  (C.X_KPRESS | C.X_KUP | C.X_KDOWN));

// * controllers
registerEvent('XT_CONTROL', 'control', (C.XT_KEYBOARD | C.XT_MOUSE));

// * draw
registerEvent('X_DRAW', 'draw', 'draw');

// * bands
registerEvent('X_START', 'start', 'x_start');
registerEvent('X_STOP', 'stop', 'x_stop');

// * playing (player state)
registerEvent('S_PLAY', 'play', 'play');
registerEvent('S_PAUSE', 'pause', 'pause');
registerEvent('S_STOP', 'stop', 'stop');
registerEvent('S_COMPLETE', 'complete', 'complete');
registerEvent('S_REPEAT', 'repeat', 'repeat');
registerEvent('S_IMPORT', 'import', 'import');
registerEvent('S_LOAD', 'load', 'load');
registerEvent('S_RES_LOAD', 'res_load', 'res_load');
registerEvent('S_ERROR', 'error', 'error');


module.exports = {
  registerEvent: registerEvent,
  provideEvents: provideEvents
};

},{"./constants.js":9}],12:[function(require,module,exports){
var global_opts = { 'liveDebug': false,
                    'autoFocus': true,
                    'setTabindex': true };

module.exports = global_opts;

},{}],13:[function(require,module,exports){
var is = require('../utils.js').is;

/**
 * @class anm.Bounds
 *
 * The holder class for any bounds.
 *
 * @constructor
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Number} width
 * @param {Number} height
 */
function Bounds(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
}
/**
 * @method load
 *
 * Replace current instance values with values from another instance.
 *
 * @param {anm.Bounds} other bounds to load values from
 */
Bounds.prototype.load = function(other) {
    this.x = other.x;
    this.y = other.y;
    this.width = other.width;
    this.height = other.height;
};
/**
 * @private @method loadDiag
 */
Bounds.prototype.loadDiag = function(x1, y1, x2, y2) {
    var t;
    if (x2 < x1) {
        t = x1;
        x1 = x2;
        x2 = t;
    }
    if (y2 < y1) {
        t = y1;
        y1 = y2;
        y2 = t;
    }
    this.x = x1;
    this.y = y1;
    this.width = x2 - x1;
    this.height = y2 - y1;
};
/** @method minX get minimum X value */
Bounds.prototype.minX = function() { return this.x; };
/** @method minY get minimum Y value */
Bounds.prototype.minY = function() { return this.y; };
/** @method maxX get maximum X value */
Bounds.prototype.maxX = function() { return this.x + this.width; };
/** @method maxY get maximum Y value */
Bounds.prototype.maxY = function() { return this.y + this.height; };
/**
 * @method add
 *
 * Add another bounds, so these bounds will be the union of two
 *
 * @param {anm.Bounds} other bounds to add
 */
Bounds.prototype.add = function(other) {
    if (!other.exist()) return;
    if (this.exist()) {
        this.loadDiag(Math.min(this.minX(), other.minX()),
                      Math.min(this.minY(), other.minY()),
                      Math.max(this.maxX(), other.maxX()),
                      Math.max(this.maxY(), other.maxY()));
    } else {
        this.load(other);
    }
};
/**
 * @method addPoint
 *
 * Add another point, so these bounds will include it
 *
 * @param {Object} point point to add
 * @param {Number} point.x X coord of a point
 * @param {Number} point.y Y coord of a point
 */
Bounds.prototype.addPoint = function(pt) {
    this.loadDiag(Math.min(this.minX(), pt.x),
                  Math.min(this.minY(), pt.y),
                  Math.max(this.maxX(), pt.x),
                  Math.max(this.maxY(), pt.y));
};
/**
 * @method toPoints
 *
 * Convert bounds to four corner points
 *
 * @return {[Number]}
 */
Bounds.prototype.toPoints = function() {
    return [
        { x: this.x, y: this.y },
        { x: this.x + this.width, y: this.y },
        { x: this.x + this.width, y: this.y + this.height },
        { x: this.x, y: this.y + this.height }
    ];
};
/**
 * @method exist
 *
 * Are these bounds set
 *
 * @return {Boolean}
 */
Bounds.prototype.exist = function() {
    // if one of the values is NaN, then the whole bounds are invalid?
    return !is.nan(this.x);
};
/**
 * @method clone
 *
 * Clone these bounds
 *
 * @return {anm.Bounds}
 */
Bounds.prototype.clone = function() {
    return new Bounds(this.x, this.y,
                      this.width, this.height);
};

Bounds.NONE = new Bounds(NaN, NaN, NaN, NaN);

module.exports = Bounds;

},{"../utils.js":34}],14:[function(require,module,exports){
var Color = require('./color.js'),
    C = require('../constants.js'),
    conf = require('../conf.js'),
    utils = require('../utils.js'),
    is = utils.is,
    engine = require('engine'),
    AnimationError = require('../errors.js').AnimationError;

// Brush
// -----------------------------------------------------------------------------

// Brush format, general properties:
//
// everything below is parsed by Brush.value():
//
// '#ffaa0b'
// 'rgb(255,170,11)'
// 'rgba(255,170,11,0.8)'
// 'hsl(120, 50%, 100%)'
// 'hsla(120, 50%, 100%,0.8)'
// { r: 255, g: 170, b: 11 }
// { r: 255, g: 170, b: 11, a: 0.8 }
// { color: '#ffaa0b' }
// { color: 'rgb(255,170,11)' }
// { color: 'rgba(255,170,11,0.8)' }
// { color: { r: 255, g: 170, b: 11 } }
// { color: { r: 255, g: 170, b: 11, a: 0.8 } }
// { grad: { stops: [ [ t, color ], ... ],
//           dir: [ [ x0, y0 ], [ x1, y1] ]
//           bounds: [ x, y, width, height ] } }
// { grad: { stops: [ [ t, color ], ... ],
//           dir: [ [ x0, y0 ], [ x1, y1] ]
//           bounds: [ x, y, width, height ],
//           r: [ r0, r1 ] } }

// Fill Brush format == Brush

// Stroke Brush format
// { (color: ... || grad: ...),
//   width: 2,
//   cap: 'round',
//   join: 'round' }

// Shadow Brush format:
// { color: ...,
//   blurRadius: 0.1,
//   offsetX: 5,
//   offsetY: 15 }

/**
 * @class anm.Brush
 *
 * Brush holds either fill, stroke or shadow data in one object.
 *
 * Examples:
 *
 * * `var brush = Brush.fill('#ff0000');`
 * * `var brush = Brush.stroke('#ff0000', 10);`
 * * `var brush = Brush.stroke(Color.rgba(10, 20, 40, 0.5), 10);`
 * * `var brush = Brush.fill(Brush.grad({0: "#000", 0.5: "#ccc"}));`
 * * `var brush = Brush.fill(Brush.rgrad({0: "#000", 0.5: "#ccc"}, [0.5, 0.5]));`
 * * `var brush = Brush.shadow('rgb(10, 20, 40)', 3, 0, 0);`
 *
 * See: {@link anm.Color Color}, {@link anm.Element#fill Element.fill()}, {@link anm.Element#stroke Element.stroke()},
 * {@link anm.Element#shadow Element.shadow()}
 *
 */
function Brush(value) {
    this.type = C.BT_NONE;
    if (value) Brush.value(value, this);
}
Brush.DEFAULT_CAP = C.PC_ROUND;
Brush.DEFAULT_JOIN = C.PC_ROUND;
Brush.DEFAULT_FILL = '#ffbc05';
Brush.DEFAULT_STROKE = Color.TRANSPARENT;
Brush.DEFAULT_SHADOW = Color.TRANSPARENT;

/**
 * @method apply
 *
 * Apply this brush to given context
 *
 * @param {Context2D} ctx context to apply to
 */
Brush.prototype.apply = function(ctx) {
    if (this.type == C.BT_NONE) return;
    var style = this._style || (this._style = this.adapt(ctx));
    if (this.type == C.BT_FILL) {
        ctx.fillStyle = style;
    } else if (this.type == C.BT_STROKE) {
        if (this.width > 0) {
          ctx.lineWidth = this.width;
          ctx.strokeStyle = style || Brush.DEFAULT_STROKE;
          ctx.lineCap = this.cap || Brush.DEFAULT_CAP;
          ctx.lineJoin = this.join || Brush.DEFAULT_JOIN;
        } else {
          Brush.clearStroke(ctx);
        }
        // TODO: mitter
    } else if (this.type == C.BT_SHADOW) {
        if (conf.doNotRenderShadows) return;
        // FIXME: this could be a slow operation to perform
        var props = engine.getAnmProps(ctx);
        if (props.skip_shadows) return;
        var ratio = (engine.PX_RATIO * (props.factor || 1));
        ctx.shadowColor = style;
        ctx.shadowBlur = (this.blurRadius * ratio) || 0;
        ctx.shadowOffsetX = (this.offsetX * ratio) || 0;
        ctx.shadowOffsetY = (this.offsetY * ratio) || 0;
    }
};

/**
 * @method invalidate
 *
 * Invalidate this brush, if its content was updated
 */
Brush.prototype.invalidate = function() {
    //this.type = C.BT_NONE;
    this._converted = false;
    this._style = null;
};

Brush.prototype.convertColorsToRgba = function() {
    if (this._converted) return;
    if (this.color && is.str(this.color)) {
        this.color = Color.fromStr(this.color);
    } else if (this.grad) {
        var stops = this.grad.stops;
        for (var i = 0, il = stops.length; i < il; i++) {
            if (is.str(stops[i][1])) {
                stops[i][1] = Color.from(stops[i][1]);
            }
        }
    }
    this._converted = true;
};

// create canvas-compatible style from brush
Brush.prototype.adapt = function(ctx) {
    if (this.color && is.str(this.color)) return this.color;
    if (this.color) return Color.toRgbaStr(this.color);
    if (this.grad) {
        var src = this.grad,
            stops = src.stops,
            dir = src.dir || [ [0.5, 0], [0.5, 1] ],
            r = src.r || 1.0;
            bounds = src.bounds || [0, 0, 1, 1];
        var grad;
        if (is.defined(src.r)) {
            grad = bounds ?
                ctx.createRadialGradient(
                                bounds[0] + dir[0][0] * bounds[2], // b.x + x0 * b.width
                                bounds[1] + dir[0][1] * bounds[3], // b.y + y0 * b.height
                                Math.max(bounds[2], bounds[3]) * r[0], // max(width, height) * r0
                                bounds[0] + dir[1][0] * bounds[2], // b.x + x1 * b.width
                                bounds[1] + dir[1][1] * bounds[3], // b.y + y1 * b.height
                                Math.max(bounds[2], bounds[3]) * r[1]) // max(width, height) * r1
                : ctx.createRadialGradient(
                               dir[0][0], dir[0][1], r[0],  // x0, y0, r0
                               dir[1][0], dir[1][1], r[1]); // x1, y1, r1
        } else {
            grad = bounds ?
                ctx.createLinearGradient(
                                bounds[0] + dir[0][0] * bounds[2], // b.x + x0 * b.width
                                bounds[1] + dir[0][1] * bounds[3], // b.y + y0 * b.height
                                bounds[0] + dir[1][0] * bounds[2], // b.x + x1 * b.width
                                bounds[1] + dir[1][1] * bounds[3]) // b.y + y1 * b.height
                : ctx.createLinearGradient(
                                dir[0][0], dir[0][1],  // x0, y0
                                dir[1][0], dir[1][1]); // x1, y1
        }
        for (var i = 0, slen = stops.length; i < slen; i++) {
            var stop = stops[i];
            grad.addColorStop(stop[0], Color.adapt(stop[1]));
        }
        return grad;
    }
    if (this.pattern) {
        var elm = this.pattern.elm,
            fill;
        var canvas = engine.createCanvas(this.pattern.w, this.pattern.h, null, 1);
        var cctx = canvas.getContext('2d');
        elm.pivot(0,0);
        elm.disabled = false;
        elm.render(cctx, 0, 0);
        elm.disabled = true;
        fill = canvas;

        return ctx.createPattern(fill, this.pattern.repeat);
    }
    return null;
};

/**
 * @method clone
 *
 * Clone this brush
 *
 * @return {anm.Brush} clone
 */
Brush.prototype.clone = function()  {
    var src = this,
        trg = new Brush();
    trg.type = src.type;
    if (src.color && is.str(src.color)) { trg.color = src.color; }
    else if (src.color) {
        trg.color = { r: src.color.r, g: src.color.g, b: src.color.b, a: src.color.a || 1 };
    }
    if (src.grad) {
        var src_grad = src.grad,
            trg_grad = {};
        trg_grad.stops = [];
        for (i = 0; i < src_grad.stops.length; i++) {
            trg_grad.stops[i] = [].concat(src_grad.stops[i]);
        }
        trg_grad.dir = [];
        for (i = 0; i < src_grad.dir.length; i++) {
            trg_grad.dir[i] = [].concat(src_grad.dir[i]);
        }
        if (src_grad.r) trg_grad.r = [].concat(src_grad.r);
        trg.grad = trg_grad;
    }
    // stroke
    if (src.hasOwnProperty('width')) trg.width = src.width;
    if (src.hasOwnProperty('cap')) trg.cap = src.cap;
    if (src.hasOwnProperty('join')) trg.join = src.join;
    // shadow
    if (src.hasOwnProperty('blurRadius')) trg.blurRadius = src.blurRadius;
    if (src.hasOwnProperty('offsetX')) trg.offsetX = src.offsetX;
    if (src.hasOwnProperty('offsetY')) trg.offsetY = src.offsetY;
    return trg;
};

/**
 * @static @method fill
 *
 * Create a Fill-Brush
 *
 * See {@link anm.Element#fill Element.fill()}
 *
 * Examples:
 *
 * * `var brush = Brush.fill('#ff0000')`
 * * `var brush = Brush.fill(Color.rgba(70, 12, 35, 0.5))`
 * * `var brush = Brush.fill(Color.hsl(0.6, 100, 15))`
 * * `var brush = Brush.fill(Brush.grad({0: '#ffffff', 0.5: '#cccccc'}))`
 *
 * @param {String|Object} color color or gradient
 * @return {anm.Brush}
 */
Brush.fill = function(value) {
    var brush = new Brush();
    brush.type = C.BT_FILL;
    if (is.obj(value)) {
        if (value.stops) {
            brush.grad = value;
        } else if (value.elm) {
            brush.pattern = value;
        }

    } else {
        brush.color = value;
    }
    return brush;
};

/**
 * @static @method stroke
 *
 * Create a Stroke-Brush
 *
 * See {@link anm.Element#stroke Element.stroke()}
 *
 * Examples:
 *
 * * `var brush = Brush.stroke('#ff0000', 2)`
 * * `var brush = Brush.stroke(Color.rgba(70, 12, 35, 0.5), 5, C.PC_ROUND)`
 * * `var brush = Brush.stroke(Color.hsl(0.6, 100, 15), 1)`
 * * `var brush = Brush.stroke(Brush.grad({0: '#ffffff', 0.5: '#cccccc'}), 2)`
 *
 * @param {String|Object} color color or gradient
 * @param {Number} width width, in pixels
 * @param {C.PC_*} [cap]
 * @param {C.PC_*} [join]
 * @param {C.PC_*} [mitter]
 *
 * @return {anm.Brush}
 */
Brush.stroke = function(color, width, cap, join, mitter) {
    var brush = (color && (color instanceof Brush)) ? color.clone() : Brush.fill(color);
    brush.type = C.BT_STROKE;
    brush.width = width || 0;
    brush.cap = cap || Brush.DEFAULT_CAP;
    brush.join = join || Brush.DEFAULT_JOIN;
    brush.mitter = mitter;
    return brush;
};

/**
 * @static @method shadow
 *
 * Create a Shadow-Brush
 *
 * See {@link anm.Element#shadow Element.shadow()}
 *
 * Examples:
 *
 * * `var brush = Brush.shadow('#ff0000', 2)`
 * * `var brush = Brush.shadow(Color.rgba(70, 12, 35, 0.5), 5, 2, 2)`
 *
 * @param {String|Object} color color or gradient
 * @param {Number} [blurRadius] blur radius
 * @param {Number} [offsetX] offset by X axis
 * @param {Number} [offsetY] offset by Y axis
 *
 * @return {anm.Brush}
 */
Brush.shadow = function(color, blurRadius, offsetX, offsetY) {
    var brush = Brush.fill(color);
    brush.type = C.BT_SHADOW;
    brush.blurRadius = blurRadius || 0;
    brush.offsetX = offsetX || 0;
    brush.offsetY = offsetY || 0;
    return brush;
};

Brush.value = function(value, target) {
    var brush = target || (new Brush());
    if (!value) {
        brush.type = C.BT_NONE;
    } else if (is.str(value)) {
        brush.type = C.BT_FILL;
        brush.color = value;
    } else if (is.obj(value)) {
        if (is.defined(value.r) && is.defined(value.g) && is.defined(value.b)) {
            brush.type = C.BT_FILL;
            brush.color = value;
        } else if (value.color || value.grad) {
            if (is.defined(value.width)) {
                brush.type = C.BT_STROKE;
            } else if (is.defined(value.blurRadius) ||
                       is.defined(value.offsetX)) {
                brush.type = C.BT_SHADOW;
            } else {
                brush.type = C.BT_FILL;
            }
            for (var key in value) {
                if (value.hasOwnProperty(key)) {
                    brush[key] = value[key];
                }
            }
        } else throw new AnimationError('Unknown type of brush');
    } else throw new AnimationError('Use Brush.fill, Brush.stroke or Brush.shadow to create brush from values');
};

Brush.grad = function(stops, bounds, dir) {
    var new_stops = [];
    for (var prop in stops) {
        new_stops.push([prop, stops[prop]]);
    }
    return { grad: {
        stops: stops,
        bounds: bounds,
        dir: dir
    } };
};

Brush.rgrad = function(stops, r, bounds, dir) {
    var new_stops = [];
    for (var prop in stops) {
        new_stops.push([prop, stops[prop]]);
    }
    return { grad: {
        r: r,
        stops: stops,
        bounds: bounds,
        dir: dir
    } };
};

Brush.qfill = function(ctx, color) {
    ctx.fillStyle = color;
};

Brush.qstroke = function(ctx, color, width) {
    ctx.lineWidth = width || 1;
    ctx.strokeStyle = color;
    ctx.lineCap = Brush.DEFAULT_CAP;
    ctx.lineJoin = Brush.DEFAULT_JOIN;
};

Brush.clearFill = function(ctx) {
    ctx.fillStyle = Brush.DEFAULT_FILL;
};

Brush.clearStroke = function(ctx) {
    ctx.strokeStyle = Brush.DEFAULT_STROKE;
    ctx.lineWidth = 0;
    ctx.lineCap = Brush.DEFAULT_CAP;
    ctx.lineJoin = Brush.DEFAULT_JOIN;
};

Brush.clearShadow = function(ctx) {
    ctx.shadowColor = Brush.DEFAULT_SHADOW;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
};

/**
 * @static @method interpolateBrushes
 *
 * Create a function from two brushes which takes distance between these brushes
 * (as `0..1`) and returns the new brush representing the values at this point.
 * This method used for color tweens, but iterpolates every possible value
 * including stroke width.
 * NB: if you re-use the returned function, be aware that it shares and updates
 * the same instance between the calls.
 *
 * See {@link anm.Color#interpolate Color.interpolate()}
 *
 * @param {anm.Brush} from initial state of interpolation
 * @param {anm.Brush} to final state of interpolation
 * @return {Function} function that takes t and returns interpolation result
 * @param {Number} return.t distance between initial and final state, as `0..1`
 * @param {anm.Brush} return.return a brush value as a result of interpolation
 */
Brush.interpolateBrushes = function(from, to) {
    var equal = is.equal(from, to);
    from = (from instanceof Brush) ? from : Brush.value(from);
    if (!from._converted) { from.convertColorsToRgba(); }
    if (equal) {
        //if the values are the same, we can just skip the interpolating
        //and return the first value
        return function() {
            return from;
        };
    }

    to   = (to   instanceof Brush) ? to   : Brush.value(to);
    if (!to._converted)   { to.convertColorsToRgba();   }
    var result = from.clone();
    return function(t) {
        if (is.defined(from.width) && is.defined(to.width)) { // from.type && to.type == C.BT_STROKE
            result.width = utils.interpolateFloat(from.width, to.width, t);
        }
        if (from.type === C.BT_SHADOW) {
            result.offsetX = utils.interpolateFloat(from.offsetX, to.offsetX, t);
            result.offsetY = utils.interpolateFloat(from.offsetY, to.offsetY, t);
            result.blurRadius = utils.interpolateFloat(from.blurRadius, to.blurRadius, t);
        }
        if (from.color) {
            result.grad = null;
            result.color = Color.toRgbaStr(Color.interpolate(from.color, to.color, t));
        } else if (from.grad) {
            result.color = null;
            if (!result.grad) result.grad = {};
            var trgg = result.grad, fromg = from.grad, tog = to.grad, i;
            // direction
            for (i = 0; i < fromg.dir.length; i++) {
                if (!trgg.dir[i]) trgg.dir[i] = [];
                trgg.dir[i][0] = utils.interpolateFloat(fromg.dir[i][0], tog.dir[i][0], t);
                trgg.dir[i][1] = utils.interpolateFloat(fromg.dir[i][1], tog.dir[i][1], t);
            }
            // stops
            if (!trgg.stops ||
                (trgg.stops.length !== fromg.stops.length)) trgg.stops = [];
            for (i = 0; i < fromg.stops.length; i++) {
                if (!trgg.stops[i]) trgg.stops[i] = [];
                trgg.stops[i][0] = utils.interpolateFloat(fromg.stops[i][0], tog.stops[i][0], t);
                trgg.stops[i][1] = Color.toRgbaStr(Color.interpolate(fromg.stops[i][1], tog.stops[i][1], t));
            }
            // radius
            if (fromg.r) {
                if (!trgg.r) trgg.r = [];
                trgg.r[0] = utils.interpolateFloat(fromg.r[0], tog.r[0], t);
                trgg.r[1] = utils.interpolateFloat(fromg.r[1], tog.r[1], t);
            } else { trgg.r = null; }
        }
        result.invalidate();
        return result;
    };
};

module.exports = Brush;

},{"../conf.js":8,"../constants.js":9,"../errors.js":10,"../utils.js":34,"./color.js":15,"engine":35}],15:[function(require,module,exports){
var utils = require('../utils.js'),
    is = utils.is;
//a set of functions for parsing, converting and intepolating color values

/**
 * @class anm.Color
 *
 * A collection of static helpers to work with color values
 */
var Color = {};
Color.TRANSPARENT  = 'transparent';
// TODO: Color.RED, Color.BLUE, ....
Color.HEX_RE       = /^#?([a-fA-F\d]{2})([a-fA-F\d]{2})([a-fA-F\d]{2})$/i;
Color.HEX_SHORT_RE = /^#?([a-fA-F\d])([a-fA-F\d])([a-fA-F\d])$/i;
Color.RGB_RE       = /^rgb\s*\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/i;
Color.RGBA_RE      = /^rgba\s*\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*(\d*[.]?\d+)\s*\)$/i;
Color.HSL_RE       = /^hsl\s*\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*%\s*,\s*([0-9]{1,3})\s*%\s*\)$/i;
Color.HSLA_RE      = /^hsla\s*\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*%\s*,\s*([0-9]{1,3})\s*%\s*,\s*(\d*[.]?\d+)\s*\)$/i;
/**
 * @static @method from
 *
 * Get {@link anm.Brush Brush}-compatible object from a color string (in any
 * CSS-compatible format, except named colors and `#rgb` instead of `#rrggbb`)
 *
 * @param {String} source
 * @return {Object} result
 * @param {Number} return.r Red value
 * @param {Number} return.g Green value
 * @param {Number} return.b Blue value
 * @param {Number} return.a Alpha value
 */
Color.from = function(test) {
    return is.str(test) ? Color.fromStr(test) : (test.r && test);
};
/** @static @private @method fromStr */
Color.fromStr = function(str) {
    return Color.fromHex(str) ||
        Color.fromRgb(str) ||
        Color.fromRgba(str) ||
        Color.fromHsl(str) ||
        { r: 0, g: 0, b: 0, a: 0};
};
/** @static @private @method fromHex */
Color.fromHex = function(hex) {
    if (hex[0] !== '#') return null;
    var result = Color.HEX_RE.exec(hex);
    if (result) {
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: 1
        };
    }
    result = Color.HEX_SHORT_RE.exec(hex);
    return result ? {
        r: parseInt(result[1] + result[1], 16),
        g: parseInt(result[2] + result[2], 16),
        b: parseInt(result[3] + result[3], 16),
        a: 1
    } : null;
};
/** @static @private @method fromRgb */
Color.fromRgb = function(rgb) {
    if (rgb.indexOf('rgb(') !== 0) return null;
    var result = Color.RGB_RE.exec(rgb);
    return result ? {
        r: parseInt(result[1]),
        g: parseInt(result[2]),
        b: parseInt(result[3]),
        a: 1
    } : null;
};
/** @static @private @method fromRgba */
Color.fromRgba = function(rgba) {
    if (rgba.indexOf('rgba(') !== 0) return null;
    var result = Color.RGBA_RE.exec(rgba);
    return result ? {
        r: parseInt(result[1]),
        g: parseInt(result[2]),
        b: parseInt(result[3]),
        a: parseFloat(result[4])
    } : null;
};

/** @static @private @method fromHsl */
Color.fromHsl = function(hsl) {
    if (hsl.indexOf('hsl(') !== 0) return null;
    var result = Color.HSL_RE.exec(hsl);
    return result ? Color.fromHslVal(
        parseInt(result[1]) / 180 * Math.PI,
        parseInt(result[2]) / 100,
        parseInt(result[3]) / 100
    ) : null;
};
/** @static @private @method fromHsla */
Color.fromHsla = function(hsla) {
    if (hsla.indexOf('hsla(') !== 0) return null;
    var result = Color.HSLA_RE.exec(hsl);
    if (!result) return null;
    result = Color.fromHslVal(
        parseInt(result[1]) / 180 * Math.PI,
        parseInt(result[2]) / 100,
        parseInt(result[3]) / 100
    );
    result.a = parseFloat(result[4]);
    return result;
};
/**
 * @static @method fromHslVal
 *
 * Get {@link anm.Brush Brush}-compatible object from HSL values
 *
 * @param {Number} hue hue
 * @param {Number} sat saturation
 * @param {Number} light light
 * @return {Object} result
 * @param {Number} return.r Red value
 * @param {Number} return.g Green value
 * @param {Number} return.b Blue value
 * @param {Number} return.a Alpha value
 */
Color.fromHslVal = function(hue, sat, light) {
    var hueToRgb = Color.hueToRgb;
    var t2;
    if (light <= 0.5) {
        t2 = light * (sat + 1);
    } else {
        t2 = light + sat - (light * sat);
    }
    var t1 = light * 2 - t2;
    return { r: hueToRgb(t1, t2, hue + 2),
        g: hueToRgb(t1, t2, hue),
        b: hueToRgb(t1, t2, hue - 2),
        a: 1 };

};
/** @static @private @method hueToRgb */
Color.hueToRgb = function(t1, t2, hue) {
    if (hue < 0) hue += 6;
    if (hue >= 6) hue -= 6;
    if (hue < 1) return (t2 - t1) * hue + t1;
    else if (hue < 3) return t2;
    else if (hue < 4) return (t2 - t1) * (4 - hue) + t1;
    else return t1;
};
/**
 * @static @method rgb
 *
 * Convert RGB values to CSS-compatible string
 *
 * @param {Number} r Red value
 * @param {Number} g Green value
 * @param {Number} b Blue value
 * @return {String} result
 */
Color.rgb = function(r, g, b) {
    return 'rgb(' + r + ',' + g + ',' + b + ')';
};
/**
 * @static @method rgba
 *
 * Convert RGB values to CSS-compatible string
 *
 * @param {Number} r Red value
 * @param {Number} g Green value
 * @param {Number} b Blue value
 * @param {Number} a Alpha value
 * @return {String} result
 */
Color.rgba = function(r, g, b, a) {
    return 'rgba(' + r + ',' + g + ',' + b + ',' +
           (is.defined(a) ? a.toFixed(2) : 1.0) + ')';
};
/**
 * @static @method hsl
 *
 * Convert HSL values to CSS-compatible string
 *
 * @param {Number} h Hue value, in radians
 * @param {Number} s Saturation value
 * @param {Number} l Light value
 * @return {String} result
 */
Color.hsl = function(h, s, l) {
    return Color.dhsl(h / Math.PI * 180, s, l);
};
/**
 * @static @method dhsl
 *
 * Convert DHSL values to CSS-compatible string
 *
 * @param {Number} h Hue value, in degrees
 * @param {Number} s Saturation value
 * @param {Number} l Light value
 * @return {String} result
 */
Color.dhsl = function(dh, s, l) {
    return 'hsl(' + Math.floor(dh) + ',' +
                    Math.floor(s * 100) + '%,' +
                    Math.floor(l * 100) + '%)';
};
/**
 * @static @method hsla
 *
 * Convert HSLA values to CSS-compatible string
 *
 * @param {Number} h Hue value, in radians
 * @param {Number} s Saturation value
 * @param {Number} l Light value
 * @param {Number} a Alpha value
 * @return {String} result
 */
Color.hsla = function(h, s, l, a) {
    return Color.dhsla(h / Math.PI * 180, s, l, a);
};
/**
 * @static @method hsla
 *
 * Convert HSLA values to CSS-compatible string
 *
 * @param {Number} h Hue value, in radians
 * @param {Number} s Saturation value
 * @param {Number} l Light value
 * @param {Number} a Alpha value
 * @return {String} result
 */
Color.dhsla = function(dh, s, l, a) {
    return 'hsla('+ Math.floor(dh) + ',' +
                    Math.floor(s * 100) + '%,' +
                    Math.floor(l * 100) + '%,' +
                    (is.defined(a) ? a.toFixed(2) : 1.0) + ')';
};
/** @static @private @method adapt */
Color.adapt = function(color) {
    if (!color) return null;
    if (is.str(color)) return color;
    // "r" is reserved for gradients, so we test for "g" to be sure
    if (is.defined(color.g)) return Color.toRgbaStr(color);
    if (is.defined(color.h)) return Color.toHslaStr(color);
};
/** @static @private @method toRgbaStr */
Color.toRgbaStr = function(color) {
    return Color.rgba(color.r,
                      color.g,
                      color.b,
                      color.a);
};
/** @static @private @method toHslaStr */
Color.toHslaStr = function(color) {
    return Color.hsla(color.h,
                      color.s,
                      color.l,
                      color.a);
};
/**
 * @static @method interpolate
 *
 * Find a color located at a given distance between two given colors
 *
 * See {@link anm.Brush#interpolate Brush.interpolate()}
 *
 * @param {anm.Color} c1 starting value of a color
 * @param {anm.Color} c2 final value of a color
 * @param {Number} t distance between colors, `0..1`
 * @return {anm.Color} color located at a given distance between two given colors
 */
Color.interpolate = function(c1, c2, t) {
    return {
        r: Math.round(utils.interpolateFloat(c1.r, c2.r, t)),
        g: Math.round(utils.interpolateFloat(c1.g, c2.g, t)),
        b: Math.round(utils.interpolateFloat(c1.b, c2.b, t)),
        a: utils.interpolateFloat(c1.a, c2.a, t)
    };
};

module.exports = Color;

},{"../utils.js":34}],16:[function(require,module,exports){
var C = require('../constants.js');

var utils = require('../utils.js'),
    is = utils.is;

var segments = require('./segments.js'),
    MSeg = segments.MSeg,
    LSeg = segments.LSeg,
    CSeg = segments.CSeg;

var Brush = require('./brush.js');

var Bounds = require('./bounds.js');

// Paths
// -----------------------------------------------------------------------------

// M<X> <Y> - move to
// L<X> <Y> - line to
// C<X1> <Y1> <X2> <Y2> <X3> <Y3> - curve to
// Z - close path
// lowercase marker means relative coord
// Example: "M0 10 L20 20 C10 20 15 30 10 9 Z"

// all commands:
// V = vertical lineto
// C = curveto
// S = smooth curveto
// Q = quadratic Bézier curve
// T = smooth quadratic Bézier curveto
// A = elliptical Arc
// Z = closepath

/**
 * @class anm.Path
 *
 * A Class that helps in creating SVG-compatible paths easily.
 *
 * Examples:
 *
 * * `var path = new Path('M0.0 10.0 L20.0 20.0 C10.0 20.0 15.0 30.0 10.0 9.0 Z');`
 * * `var path = new Path().add(new MSeg([0, 0])).add(new LSeg([20, 20])).add(new CSeg([10, 20, 15, 30, 10, 9]));`
 * * `var path = new Path().move(0, 0).line(20, 20).curve(10, 20, 15, 30, 10, 9);`
 * * `var path = new Path().move(0, 0).line(20, 20).curve(10, 20, 15, 30, 10, 9).close();`
 *
 * See: {@link anm.Element#path Element.path()}, {@link anm.Element#translate_path Element.translate_path()}
 *
 * @constructor
 *
 * @param {String} [value] String representation of SVG path
 *
 * @return {anm.Path}
 */
function Path(val) {
    this.segs = [];
    this.closed = false;

    if (is.str(val)) {
        this.parse(val);
    } else if (is.arr(val)) {
        this.segs = val;
    }

    this.cached_hits = {};
}

/**
 * @method visit
 * @chainable
 *
 * // FIXME: rename to `.each`
 *
 * Visits every chunk of path in array-form and calls visitor function, so
 * visitor function gets chunk marker and positions sequentially
 * data argument will be also passed to visitor if specified
 *
 * @param {Function} visitor
 * @param {anm.MSeg|anm.LSeg|anm.CSeg} visitor.segment
 */
Path.prototype.visit = function(visitor, data) {
    var segments = this.segs;
    for (var si = 0, sl = segments.length; si < sl; si++) {
        visitor(segments[si], data);
    }
    return this;
};
/**
 * @method length
 *
 * Get path length, in points.
 *
 * @return {Number} path length
 */
Path.prototype.length = function() {
    if (is.defined(this.cached_len)) return this.cached_len;
    var sum = 0;
    var p = this.start();
    this.visit(function(segment) {
        sum += segment.length(p);
        p = segment.last();
    });
    this.cached_len = sum;
    return sum;
};
/**
 * @method add
 * @chainable
 *
 * Add a segment to this path
 *
 * @param {anm.MSeg|anm.LSeg|anm.CSeg} segment segment to add
 *
 * @return {anm.Path} itself
 */
Path.prototype.add = function(seg) {
    this.segs.push(seg);
    return this;
};
/**
 * @method move
 * @chainable
 *
 * Shortcut to adding Move Segment
 *
 * @param {Number} x X coordinate of move-to operation
 * @param {Number} y Y coordinate of move-to operation
 *
 * @return {anm.Path} itself
 */
Path.prototype.move = function(x, y) {
    return this.add(new MSeg([x, y]));
};
/**
 * @method line
 * @chainable
 *
 * Shortcut to adding Line Segment
 *
 * @param {Number} x X coordinate of line-to operation
 * @param {Number} y Y coordinate of line-to operation
 *
 * @return {anm.Path} itself
 */
Path.prototype.line = function(x, y) {
    return this.add(new LSeg([x, y]));
};
/**
 * @method curve
 * @chainable
 *
 * Shortcut to adding Curve Segment
 *
 * @param {Number} x1 X coordinate of first point of curve-to operation
 * @param {Number} y1 Y coordinate of first point of curve-to operation
 * @param {Number} x2 X coordinate of second point of curve-to operation
 * @param {Number} y2 Y coordinate of second point of curve-to operation
 * @param {Number} x3 X coordinate of third point of curve-to operation
 * @param {Number} y3 Y coordinate of third point of curve-to operation
 *
 * @return {anm.Path} itself
 */
Path.prototype.curve = function(x1, y1, x2, y2, x3, y3) {
    return this.add(new CSeg([x1, y1, x2, y2, x3, y3]));
};
/**
 * @method close
 * @chainable
 *
 * Close the path
 *
 * @return {anm.Path} itself
 */
Path.prototype.close = function() {
    this.closed = true;
    return this;
};
/**
 * @method apply
 *
 * Apply this path to a given 2D context with given fill / stroke / shadow
 *
 * Example: `path.apply(ctx, Brush.fill('#ff0000'), Brush.stroke('#00ff00', 2))`
 *
 * @param {Context2D} ctx where to apply
 * @param {anm.Brush} fill fill to use
 * @param {anm.Brush} stroke stroke to use
 * @param {anm.Brush} shadow shadow to use
 *
 * @return {anm.Path} itself
 */
Path.prototype.apply = function(ctx, fill, stroke, shadow) {
    ctx.beginPath();
    // unrolled for speed
    var segments = this.segs;
    for (var si = 0, sl = segments.length; si < sl; si++) {
        segments[si].draw(ctx);
    }

    if (this.closed) ctx.closePath();

    if (shadow) { shadow.apply(ctx); }
    if (fill) { fill.apply(ctx); ctx.fill(); }
    if (shadow) { Brush.clearShadow(ctx); }
    if (stroke) { stroke.apply(ctx); ctx.stroke(); }
};
/**
 * @method parse
 * @chainable
 * @deprecated
 *
 * Same as `new Path(str)`, but updates current instance instead of creating new one.
 *
 * @param {String} source string representation of SVG path
 * @return {anm.Path} itself
 */
Path.prototype.parse = function(str) {
    if (str) Path.parse(str, this);
    return this;
};
/**
 * @method hitAt
 *
 * Find a segment hit data in a path that corresponds
 * to specified distance (t) of the path.
 *
 * @param {Number} t distance in a range of [0..1]
 * @return {Object} hit data
 */
Path.prototype.hitAt = function(t) {
    if (is.defined(this.cached_hits[t])) return this.cached_hits[t];

    var plen = this.length(); // path length in pixels
    if (plen === 0) return null;
    if (t < 0 || t > 1.0) return null;

    var startp = this.start(); // start point of segment

    if (t === 0) return (this.cached_hits[t] = {
        'seg': this.segs[0], 'start': startp, 'slen': 0.0, 'segt': 0.0
    });

    /*var endp = this.end();
      if (t == 1) return func ? func(startp, endp) : endp;*/

    var nsegs = this.segs.length; // number of segments
    if (nsegs === 0) return null;

    var distance = t * plen;
    var p = startp;
    var length = 0; // checked length in pixels
    var seg, slen;
    for (var si = 0; si < nsegs; si++) {
        seg = this.segs[si];
        slen = seg.length(p); // segment length
        if (distance <= (length + slen)) {
            // inside current segment
            var segdist = distance - length;
            return (this.cached_hits[t] = {
                'seg': seg, 'start': p, 'slen': slen, 'segt': (slen != 0) ? seg.findT(p, segdist) : 0
            });
        }
        length += slen;
        // end point of segment
        p = seg.last();
    }

    /*var lseg = this.segs[nsegs - 1];
      return {
        'seg': lseg, 'start': p, 'slen': lseg.length(p), 'segt': 1.0
      };*/
    return null;
};
/**
 * @method pointAt
 *
 * Find a point on a path at specified distance (t) of the path.
 *
 * @param {Number} t distance in a range of [0..1]
 * @return {[Number]} point in a form of [x, y]
 */
Path.prototype.pointAt = function(t) {
    var hit = this.hitAt(t);
    if (!hit) return this.start();
    return hit.seg.atT(hit.start, hit.segt);
};
/**
 * @method tangentAt
 *
 * Find a tangent on a path at specified distance (t) of the path.
 *
 * @param {Number} t distance in a range of [0..1]
 * @return {[Number]} point in a form of [x, y]
 */
Path.prototype.tangentAt = function(t) {
    var t = t;
    if (this.length() > 0) {
        if (t == 0) t = 0.0001;
        if (t == 1) t = 0.9999;
    }
    var hit = this.hitAt(t);
    if (!hit) return 0;
    return hit.seg.tangentAt(hit.start, hit.segt);
};
/**
 * @method start
 *
 * Get first point of a path
 *
 * @return {[Number]|Null} point in a form of [x, y]
 */
Path.prototype.start = function() {
    if (this.segs.length < 1) return null;
    return [ this.segs[0].pts[0],   // first-x
             this.segs[0].pts[1] ]; // first-y
};
/**
 * @method end
 *
 * Get last point of a path
 *
 * @return {[Number]|Null} point in a form of [x, y]
 */
Path.prototype.end = function() {
    if (this.segs.length < 1) return null;
    return this.segs[this.segs.length - 1].last();
};
/**
 * @method bounds
 *
 * Get bounds of a path
 *
 * @return {anm.Bounds} path bounds
 */
Path.prototype.bounds = function() {
    // FIXME: it is not ok for curve path, possibly
    if (this.$bounds) return this.$bounds;
    if (this.segs.length <= 0) return Bounds.NONE;
    var minX = this.segs[0].pts[0], maxX = this.segs[0].pts[0],
        minY = this.segs[0].pts[1], maxY = this.segs[0].pts[1];
    this.visit(function(segment) {
        var pts = segment.pts,
            pnum = pts.length, pi;
        for (pi = 0; pi < pnum; pi+=2) {
            minX = Math.min(minX, pts[pi]);
            maxX = Math.max(maxX, pts[pi]);
        }
        for (pi = 1; pi < pnum; pi+=2) {
            minY = Math.min(minY, pts[pi]);
            maxY = Math.max(maxY, pts[pi]);
        }
    });
    return (this.$bounds = new Bounds(minX, minY,
                                      maxX - minX, maxY - minY));
};
/* TODO: rename to `modify`? */
Path.prototype.vpoints = function(func) {
    this.visit(function(segment) {
        var pts = segment.pts,
            pnum = pts.length;
        for (var pi = 0; pi < pnum; pi+=2) {
            var res = func(pts[pi], pts[pi+1]);
            if (res) {
                pts[pi] = res[0];
                pts[pi+1] = res[1];
            }
        }
    });
};
/**
 * @method shift
 * @chainable
 *
 * Shift this path to a point
 *
 * @param {[Number]} point in a form of [x, y]
 *
 * @return {anm.Path} itself
 */
Path.prototype.shift = function(pt) {
    this.vpoints(function(x, y) {
        return [ x + pt[0],
                 y + pt[1] ];
    });
    return this;
};
/**
 * @method zoom
 * @chainable
 *
 * Scale this path by given values
 *
 * @param {[Number]} values in a form of [sx, sy]
 *
 * @return {anm.Path} itself
 */
Path.prototype.zoom = function(vals) {
    this.vpoints(function(x, y) {
        return [ x * vals[0],
                 y * vals[1] ];
    });
    return this;
};
/**
 * @method normalize
 *
 * Moves path to be positioned at 0,0 and returns the difference
 *
 * @return {[Number]} [ center-x, center-y ]
 */
// moves path to be positioned at 0,0 and
// returns subtracted top-left point
// and a center point
Path.prototype.normalize = function() {
    var bounds = this.bounds();
    var w = bounds.width,
        h = bounds.height;
    var hw = Math.floor(w/2),
        hh = Math.floor(h/2);
    var min_x = bounds.x,
        min_y = bounds.y;
    this.vpoints(function(x, y) {
        return [ x - min_x - hw,
                 y - min_y - hh];
        });
    return [ hw, hh ];
};

Path.prototype.getPoints = function() {
    var points = [];
    this.visit(function(seg) {
        points = points.concat(seg.pts);
    });
    return points;
};

Path.prototype.toString = function() {
    return "[ Path '" + Path.toSVGString(this) + "' ]";
};
/**
 * @method clone
 *
 * Clone this path
 *
 * @return {anm.Path} clone
 */
Path.prototype.clone = function() {
    var _clone = new Path();
    this.visit(function(seg) {
        _clone.add(seg.clone());
    });
    clone.closed = this.closed;
    return _clone;
};
/**
 * @method invalidate
 *
 * Invalidate bounds of this path
 */
Path.prototype.invalidate = function() {
    this.cached_len = undefined;
    this.cached_hits = {};
    this.$bounds = null;
};

Path.prototype.reset = function() {
    this.segs = [];
    this.closed = false;
};

Path.prototype.dispose = function() { };

// visits every chunk of path in string-form and calls
// visitor function, so visitor function gets
// chunk marker and positions sequentially
// data argument will be also passed to visitor if specified
Path.visitStrPath = function(path, visitor, data) {
    var cur_pos = 0;
    while (true) {
        var marker = path[cur_pos];
        if (marker === 'Z') {
            visitor(marker, [], data);
            return;
        }
        var pos_data = null;
        if ((marker === 'M') || (marker === 'L')) {
            pos_data = collectPositions(path, cur_pos, 2);
        } else if (marker === 'C') {
            pos_data = collectPositions(path, cur_pos, 6);
        }
        cur_pos += pos_data[0];
        var positions = pos_data[1];
        visitor(marker, positions, data);
    }
};

Path.toSVGString = function(path) {
    var buffer = [];
    path.visit(encodeVisitor, buffer);
    buffer.push('Z');
    return buffer.join(' ');
};

// parses `count` positions from path (string form),
// starting at `start`, returns a length of parsed data and
// positions array
var collectPositions = function(path, start, count) {
    var pos = start + 1;
    var positions = [];
    var got = 0;
    while (got != count) {
        var posstr = utils.collect_to(path, pos, ' ');
        pos += posstr.length + 1; got++;
        positions.push(parseFloat(posstr));
    }
    return [pos - start, positions];
};

// visitor to parse a string path into Path object
var parserVisitor = function(marker, positions, path) {
    if (marker === 'M') {
        path.add(new MSeg(positions));
    } else if (marker === 'L') {
        path.add(new LSeg(positions));
    } else if (marker === 'C') {
        path.add(new CSeg(positions));
    }
};

// visitor to apply string path to context
var strApplyVisitor = function(marker, positions, ctx) {
    if (marker === 'M') {
        ctx.moveTo(positions[0], positions[1]);
    } else if (marker === 'L') {
        ctx.lineTo(positions[0], positions[1]);
    } else if (marker === 'C') {
        ctx.bezierCurveTo(positions[0], positions[1],
                          positions[2], positions[3],
                          positions[4], positions[5]);
    }
};

var encodeVisitor = function(segment, buffer) {
    buffer.push(segment.toString());
};

// converts path given in string form to array of segments
Path.parse = function(path, target) {
    target = target || new Path();
    target.segs = [];
    Path.visitStrPath(path, parserVisitor, target);
    target.str = path;
    return target;
};
/**
 * @static @method parseAndAppy
 *
 * Parses a path in string form and immediately applies it to context
 *
 * @param {Context2D} ctx context to apply to
 * @param {String} path SVG representation of a path
 */
Path.parseAndApply = function(ctx, path) {
    Path.visitStrPath(path, strApplyVisitor, ctx);
};

module.exports = Path;

},{"../constants.js":9,"../utils.js":34,"./bounds.js":13,"./brush.js":14,"./segments.js":17}],17:[function(require,module,exports){
var C = require('../constants.js');

/**
 * @class anm.MSeg
 *
 * Represents Move Segment of an SVG-compatible curve. Takes one point to move to.
 *
 * See {@link anm.LSeg LSeg}, {@link anm.CSeg CSeg}, {@link anm.Path Path};
 *
 * @constuctor
 *
 * @param {Array[Number]} pts point to initialize with, in format `[x, y]`
 */
function MSeg(pts) {
    this.pts = pts;
};
/**
 * @method draw
 *
 * Apply this segment to a given context
 *
 * @param {Context2D} ctx context to draw
 */
MSeg.prototype.draw = function(ctx) {
    ctx.moveTo(this.pts[0], this.pts[1]);
};
/**
 * @method length
 *
 * Find length of a segment, in pixels. Needs to know a start point,
 * which is usually a last point of a previous segment or [0, 0].
 * For Move Segment it's always 0.
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 *
 * @return Number segment length
 */
MSeg.prototype.length = function(start) {
    return 0;
};
/**
 * @method findT
 *
 * Find `t` parameter in range `[0, 1]` corresponding to a given distance `dist` in pixels.
 * Needs to know a start point, which is usually a last point of a
 * previous segment or [0, 0]. For Move Segment it's always 0.
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 * @param {Number} dist distance, in pixels
 *
 * @return {Number} `t` in a range of `[0..1]`
 */
MSeg.prototype.findT = function(start, dist) {
    return 0;
};
/**
 * @method atDist
 *
 * Find a point located at given distance `dist` in pixels.
 * Needs to know a start point, which is usually a last point of a
 * previous segment or [0, 0]. For Move Segment it's always a point
 * it was initialized with.
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 * @param {Number} dist distance, in pixels
 *
 * @return {Array[Number]} point in format `[x, y]`
 */
MSeg.prototype.atDist = function(start, dist) {
    return this.atT(start, null);
};
/**
 * @method atT
 *
 * Find a point located at given distance `t`, which is specified in range of
 * `[0..1]` where `0` is first point of a segment and `1` is the last.
 * Needs to know a start point, which is usually a last point of a
 * previous segment or [0, 0]. For Move Segment it's always a point
 * it was initialized with.
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 * @param {Number} t `t` parameter, in range of `[0..1]`
 *
 * @return {Array[Number]} point in format `[x, y]`
 */
MSeg.prototype.atT = function(start, t) {
    return [ this.pts[0], this.pts[1] ];
};
/**
 * @method tangentAt
 *
 * Find a tangent at given distance `t`, which is specified in range of
 * `[0..1]` where `0` is first point of a segment and `1` is the last.
 * Needs to know a start point, which is usually a last point of a
 * previous segment or `[0, 0]`. For Move Segment it's always `0`.
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 * @param {Number} t `t` parameter, in range of `[0..1]`
 *
 * @return {Number} tangent at given distance
 */
MSeg.prototype.tangentAt = function(start, t) {
    return 0;
};
/**
 * @method last
 *
 * Get last point of a segment. For Move Segment it's always a point it was initialized with.
 *
 * @return {Array[Number]} last point in format `[x, y]`
 */
MSeg.prototype.last = function() {
    return [ this.pts[0], this.pts[1] ];
};
MSeg.prototype.toString = function() {
    return "M" + this.pts.join(" ");
};
/**
 * @method clone
 *
 * Clone this segment.
 *
 * @return {anm.MSeg} clone
 */
MSeg.prototype.clone = function() {
    return new MSeg(this.pts);
};

/**
 * @class anm.LSeg
 *
 * Represents Line Segment of an SVG-compatible curve. Takes one point as an end of a line.
 *
 * See {@link anm.MSeg MSeg}, {@link anm.CSeg CSeg}, {@link anm.Path Path};
 *
 * @constuctor
 *
 * @param {Array[Number]} pts points to initialize with, in format `[x, y]`
 */
function LSeg(pts) {
    this.pts = pts;
};
/**
 * @method draw
 *
 * Apply this segment to a given context
 *
 * @param {Context2D} ctx context to draw
 */
LSeg.prototype.draw = function(ctx) {
    ctx.lineTo(this.pts[0], this.pts[1]);
};
/**
 * @method length
 *
 * Find length of a segment, in pixels. Needs to know a start point,
 * which is usually a last point of a previous segment or [0, 0].
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 *
 * @return Number segment length
 */
LSeg.prototype.length = function(start) {
    var dx = this.pts[0] - start[0];
    var dy = this.pts[1] - start[1];
    return Math.sqrt(dx*dx + dy*dy);
};
/**
 * @method findT
 *
 * Find `t` parameter in range `[0, 1]` corresponding to a given distance `dist` in pixels.
 * Needs to know a start point, which is usually a last point of a
 * previous segment or [0, 0].
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 * @param {Number} dist distance, in pixels
 *
 * @return {Number} `t` in a range of `[0..1]`
 */
LSeg.prototype.findT = function(start, dist) {
    if (dist <= 0) return 0;
    var length = this.length(start);
    if (dist >= length) return 1;
    return dist / length;
};
/**
 * @method atDist
 *
 * Find a point located at given distance `dist` in pixels.
 * Needs to know a start point, which is usually a last point of a
 * previous segment or [0, 0].
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 * @param {Number} dist distance, in pixels
 *
 * @return {Array[Number]} point in format `[x, y]`
 */
LSeg.prototype.atDist = function(start, dist) {
    return this.atT(start, this.findT(start, dist));
};
/**
 * @method atT
 *
 * Find a point located at given distance `t`, which is specified in range of
 * `[0..1]` where `0` is first point of a segment and `1` is the last.
 * Needs to know a start point, which is usually a last point of a
 * previous segment or [0, 0].
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 * @param {Number} t `t` parameter, in range of `[0..1]`
 *
 * @return {Array[Number]} point in format `[x, y]`
 */
LSeg.prototype.atT = function(start, t) {
    var p0x = start[0];
    var p0y = start[1];
    var p1x = this.pts[0];
    var p1y = this.pts[1];
    return [
        p0x + (p1x - p0x) * t,
        p0y + (p1y - p0y) * t
    ];
};
/**
 * @method tangentAt
 *
 * Find a tangent at given distance `t`, which is specified in range of
 * `[0..1]` where `0` is first point of a segment and `1` is the last.
 * Needs to know a start point, which is usually a last point of a
 * previous segment or `[0, 0]`.
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 * @param {Number} t `t` parameter, in range of `[0..1]`
 *
 * @return {Number} tangent at given distance
 */
LSeg.prototype.tangentAt = function(start, t) {
    return Math.atan2(this.pts[1] - start[1],
                      this.pts[0] - start[0]);
};
/**
 * @method last
 *
 * Get last point of a segment. For Line Segment it's always a point it was initialized with.
 *
 * @return {Array[Number]} last point in format `[x, y]`
 */
LSeg.prototype.last = function() {
    return [ this.pts[0], this.pts[1] ];
};
LSeg.prototype.toString = function() {
    return "L" + this.pts.join(" ");
};
/**
 * @method clone
 *
 * Clone this segment.
 *
 * @return {anm.LSeg} clone
 */
LSeg.prototype.clone = function() {
    return new LSeg(this.pts);
};

/**
 * @class anm.CSeg
 *
 * Represents Curve Segment of an SVG-compatible curve. Takes three points of a curve.
 *
 * See {@link anm.MSeg MSeg}, {@link anm.LSeg LSeg}, {@link anm.Path Path};
 *
 * @constuctor
 *
 * @param {Array[Number]} pts points to initialize with, in format `[x, y, x, y, ...]`
 */
function CSeg(pts) {
    this.pts = pts;
};
/**
 * @method draw
 *
 * Apply this segment to a given context
 *
 * @param {Context2D} ctx context to draw
 */
CSeg.prototype.draw = function(ctx) {
    ctx.bezierCurveTo(this.pts[0], this.pts[1], this.pts[2], this.pts[3], this.pts[4], this.pts[5]);
};
/**
 * @method length
 *
 * Find length of a segment, in pixels. Needs to know a start point,
 * which is usually a last point of a previous segment or [0, 0].
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 *
 * @return Number segment length
 */
CSeg.prototype.length = function(start) {
    return this.findLengthAndT(start, Number.MAX_VALUE)[0];
};
/**
 * @method findT
 *
 * Find `t` parameter in range `[0, 1]` corresponding to a given distance `dist` in pixels.
 * Needs to know a start point, which is usually a last point of a
 * previous segment or [0, 0].
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 * @param {Number} dist distance, in pixels
 *
 * @return {Number} `t` in a range of `[0..1]`
 */
CSeg.prototype.findT = function(start, dist) {
    return this.findLengthAndT(start, dist)[1];
};
CSeg.prototype.findLengthAndT = function(start, dist) {
    var positions = this.pts;
    var p0x = start[0];
    var p0y = start[1];
    var p1x = positions[0];
    var p1y = positions[1];
    var p2x = positions[2];
    var p2y = positions[3];
    var p3x = positions[4];
    var p3y = positions[5];

    var p0to1 = Math.sqrt(Math.pow(p1x-p0x, 2) + Math.pow(p1y-p0y, 2));
    var p1to2 = Math.sqrt(Math.pow(p2x-p1x, 2) + Math.pow(p2y-p1y, 2));
    var p2to3 = Math.sqrt(Math.pow(p3x-p2x, 2) + Math.pow(p3y-p2y, 2));

    var len = p0to1 + p1to2 + p2to3 + 1;

    // choose the step as 1/len
    var dt = 1.0 / len;

    var q1 = 3 * dt;
    var q2 = q1 * dt;
    var q3 = dt * dt * dt;
    var q4 = 2 * q2;
    var q5 = 6 * q3;

    var q6x = p0x - 2 * p1x + p2x;
    var q6y = p0y - 2 * p1y + p2y;

    var q7x = 3 * (p1x - p2x) - p0x + p3x;
    var q7y = 3 * (p1y - p2y) - p0y + p3y;

    var bx = p0x;
    var by = p0y;

    var dbx = (p1x - p0x) * q1 + q6x * q2 + q3 * q7x;
    var dby = (p1y - p0y) * q1 + q6y * q2 + q3 * q7y;

    var ddbx = q6x * q4 + q7x * q5;
    var ddby = q6y * q4 + q7y * q5;

    var dddbx = q7x * q5;
    var dddby = q7y * q5;

    var length = 0;
    for (var idx = 0; idx < len; idx++) {
        var px = bx;
        var py = by;

        bx += dbx;
        by += dby;

        dbx += ddbx;
        dby += ddby;

        ddbx += dddbx;
        ddby += dddby;

        length += Math.sqrt((bx - px) * (bx - px) + (by - py) * (by - py));
        if (length >= dist) {
            return [length, dt * idx];
        }
    }
    return [length, 1];
};
/**
 * @method atDist
 *
 * Find a point located at given distance `dist` in pixels.
 * Needs to know a start point, which is usually a last point of a
 * previous segment or [0, 0]. For Move Segment it's always a point
 * it was initialized with.
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 * @param {Number} dist distance, in pixels
 *
 * @return {Array[Number]} point in format `[x, y]`
 */
CSeg.prototype.atDist = function(start, dist) {
    return this.atT(start, this.findT(start, dist));
};
/**
 * @method atT
 *
 * Find a point located at given distance `t`, which is specified in range of
 * `[0..1]` where `0` is first point of a segment and `1` is the last.
 * Needs to know a start point, which is usually a last point of a
 * previous segment or [0, 0]. For Move Segment it's always a point
 * it was initialized with.
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 * @param {Number} t `t` parameter, in range of `[0..1]`
 *
 * @return {Array[Number]} point in format `[x, y]`
 */
CSeg.prototype.atT = function(start, t) {
    var tt = t * t,       // t^2
        ttt = tt * t,      // t^3
        t1 = 1 - t,       // 1-t
        tt1 = t1 * t1,     // (1-t)^2
        tt2 = tt1 * t1,    // (1-t)^3
        tt3 = 3 * t * tt1,   // 3*t*(1-t)^2
        tt4 = 3 * tt * t1;   // 3*t^2*(1-t)

    return [ start[0] * tt2 + this.pts[0] * tt3 + this.pts[2] * tt4 + this.pts[4] * ttt,
             start[1] * tt2 + this.pts[1] * tt3 + this.pts[3] * tt4 + this.pts[5] * ttt ];
};
/**
 * @method tangentAt
 *
 * Find a tangent at given distance `t`, which is specified in range of
 * `[0..1]` where `0` is first point of a segment and `1` is the last.
 * Needs to know a start point, which is usually a last point of a
 * previous segment or `[0, 0]`.
 *
 * @param {Array[Number]} start start point in format `[x, y]`
 * @param {Number} t `t` parameter, in range of `[0..1]`
 *
 * @return {Number} tangent at given distance
 */
CSeg.prototype.tangentAt = function(start, t) {
    if (t < 0) t = 0;
    if (t > 1) t = 1;

    var a = 3 * (1 - t) * (1 - t);
    var b = 6 * (1 - t) * t;
    var c = 3 * t * t;

    return Math.atan2((a * (this.pts[1] - start[1])) +
                      (b * (this.pts[3] - this.pts[1])) +
                      (c * (this.pts[5] - this.pts[3])),
                      // -------------------------------
                      (a * (this.pts[0] - start[0])) +
                      (b * (this.pts[2] - this.pts[0])) +
                      (c * (this.pts[4] - this.pts[2])));
};
/**
 * @method last
 *
 * Get last point of a segment.
 *
 * @return {Array[Number]} last point in format `[x, y]`
 */
CSeg.prototype.last = function() {
    return [ this.pts[4], this.pts[5] ];
};
CSeg.prototype._ensure_params = function(start) {
    if (this._lstart &&
        (this._lstart[0] === start[0]) &&
        (this._lstart[1] === start[1])) return;
    this._lstart = start;
    this._params = this._calc_params(start);
};
CSeg.prototype._calc_params = function(start) {
    // See http://www.planetclegg.com/projects/WarpingTextToSplines.html
    var pts = this.pts;
    var params = [];
    var p0x = start[0];
    var p0y = start[1];
    var p1x = pts[0];
    var p1y = pts[1];
    var p2x = pts[2];
    var p2y = pts[3];
    var p3x = pts[4];
    var p3y = pts[5];

    params[0] = p3x - 3*p2x + 3*p1x - p0x;  // A = x3 - 3 * x2 + 3 * x1 - x0
    params[1] = 3*p2x - 6*p1x + 3*p0x;      // B = 3 * x2 - 6 * x1 + 3 * x0
    params[2] = 3*p1x - 3*p0x;              // C = 3 * x1 - 3 * x0
    params[3] = p0x;                        // D = x0

    params[4] = p3y - 3*p2y + 3*p1y - p0y;  // E = y3 - 3 * y2 + 3 * y1 - y0
    params[5] = 3*p2y - 6*p1y + 3*p0y;      // F = 3 * y2 - 6 * y1 + 3 * y0
    params[6] = 3*p1y - 3*p0y;              // G = 3 * y1 - 3 * y0
    params[7] = p0y;                        // H = y0

    return params;
};
/**
 * @method clone
 *
 * Clone this segment.
 *
 * @return {anm.CSeg} clone
 */
CSeg.prototype.clone = function() {
    return new CSeg(this.pts);
};
CSeg.prototype.toString = function() {
    return "C" + this.pts.join(" ");
};

module.exports = {
  MSeg: MSeg,
  LSeg: LSeg,
  CSeg: CSeg
};

},{"../constants.js":9}],18:[function(require,module,exports){
var conf = require('../conf.js'),
    log = require('../log.js');

var engine = require('engine'),
    resMan = require('../resource_manager.js');

var Bounds = require('./bounds.js');

Sheet.instances = 0;
Sheet.MISSED_SIDE = 50;
/* TODO: rename to Static and take optional function as source? */
/**
 * @class anm.Sheet
 *
 * Sheet class represent both single image and sprite-sheet. It stores
 * active region, and if its bounds are equal to image size (and they are,
 * by default), then the source is treated as a single image. This active region
 * may be changed dynamically during the animation, and this gives the effect of
 * a spite-sheet.
 *
 * See {@link anm.Element#image Element.image()}
 *
 * @constructor
 *
 * @param {String} src image/spritesheet URL
 * @param {Function} [f] callback to perform when image will be received
 * @param {anm.Sheet} f.this sheet instance
 * @param {Image} f.img corresponding DOM Image element
 * @param {Number} [start_region] an id for initial region
 */
function Sheet(src, callback, start_region) {
    this.id = Sheet.instances++;
    this.src = src;
    this._dimen = /*dimen ||*/ [0, 0];
    this.regions = [ [ 0, 0, 1, 1 ] ]; // for image, sheet contains just one image
    this.regions_f = null;
    // this.aliases = {}; // map of names to regions (or regions ranges)
    /* use state property for region num? or conform with state jumps/positions */
    /* TODO: rename region to frame */
    this.cur_region = start_region || 0; // current region may be changed with modifier
    this.ready = false;
    this.wasError = false;
    this._image = null;
    this._callback = callback;
    this._thumbnail = false; // internal flag, used to load a player thumbnail
}

var https = engine.isHttps;

/**
* @private @method load
*/
Sheet.prototype.load = function(player_id, callback, errback) {
    callback = callback || this._callback;
    if (this._image) throw new Error('Already loaded'); // just skip loading?
    var me = this;
    if (!me.src) {
        log.error('Empty source URL for image');
        me.ready = true; me.wasError = true;
        if (errback) errback.call(me, 'Empty source');
        return;
    }
    resMan.loadOrGet(player_id, me.src,
        function(notify_success, notify_error, notify_progress) { // loader
            var src = me.src;
            if (https) {
                src = src.replace('http:', 'https:');
            }
            if (!me._thumbnail && conf.doNotLoadImages) {
              notify_error('Loading images is turned off');
              return; }
            var img = new Image();
            var props = engine.getAnmProps(img);
            img.onload = img.onreadystatechange = function() {
                if (props.ready) return;
                if (this.readyState && (this.readyState !== 'complete')) {
                    notify_error(this.readyState);
                }
                props.ready = true; // this flag is to check later if request succeeded
                // this flag is browser internal
                img.isReady = true; /* FIXME: use 'image.complete' and
                                      '...' (network exist) combination,
                                      'complete' fails on Firefox */
                notify_success(img);
            };
            img.onerror = notify_error;
            img.addEventListener('error', notify_error, false);
            try { img.src = src; }
            catch(e) { notify_error(e); }
        },
        function(image) {  // oncomplete
            me._image = image;
            me._dimen = [ image.width, image.height ];
            me.ready = true; // this flag is for users of the Sheet class
            if (callback) callback.call(me, image);
        },
        function(err) { log.error(err.srcElement || err.path, err.message || err);
                        me.ready = true;
                        me.wasError = true;
                        if (errback) errback.call(me, err); });
};
/**
 * @private @method updateRegion
 */
Sheet.prototype.updateRegion = function() {
    if (this.cur_region < 0) return;
    var region;
    if (this.region_f) { region = this.region_f(this.cur_region); }
    else {
        var r = this.regions[this.cur_region],
            d = this._dimen;
        region = [ r[0] * d[0], r[1] * d[1],
                   r[2] * d[0], r[3] * d[1] ];
    }
    this.region = region;
};
/**
 * @private @method apply
 */
Sheet.prototype.apply = function(ctx/*, fill, stroke, shadow*/) {
    if (!this.ready) return;

    if (this.wasError) { this.applyMissed(ctx); return; }
    this.updateRegion();
    var region = this.region;
    ctx.drawImage(this._image, region[0], region[1],
                               region[2], region[3], 0, 0, region[2], region[3]);
};
/**
 * @private @method applyMissed
 *
 * If there was an error in process of receiving an image, the "missing" image is
 * displayed, this method draws it in context.
 */
Sheet.prototype.applyMissed = function(ctx) {
    ctx.save();
    ctx.strokeStyle = '#900';
    ctx.lineWidth = 1;
    ctx.beginPath();
    var side = Sheet.MISSED_SIDE;
    ctx.moveTo(0, 0);
    ctx.lineTo(side, 0);
    ctx.lineTo(0, side);
    ctx.lineTo(side, side);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, side);
    ctx.lineTo(side, 0);
    ctx.lineTo(side, side);
    ctx.stroke();
    ctx.restore();
};
Sheet.MISSED_BOUNDS = new Bounds(0, 0, Sheet.MISSED_SIDE, Sheet.MISSED_SIDE);
/**
 * @method bounds
 *
 * Get image bounds
 *
 * @return anm.Bounds bounds
 */
Sheet.prototype.bounds = function() {
    if (this.wasError) return Sheet.MISSED_BOUNDS;
    // TODO: when using current_region, bounds will depend on that region
    if (!this.ready) return Bounds.NONE;
    if(!this.region) {
      this.updateRegion();
    }
    var r = this.region;
    return new Bounds(0, 0, r[2], r[3]);
};
/**
 * @method clone
 *
 * Clone this image
 *
 * @return anm.Sheet clone
 */
Sheet.prototype.clone = function() {
    // FIXME: fix for sprite-sheet
    return new Sheet(this.src);
};

Sheet.prototype.invalidate = function() {
};
Sheet.prototype.reset = function() { };
Sheet.prototype.dispose = function() {
};

// TODO: Bring back Sprite-animator
// https://github.com/Animatron/player/blob/3903d59c7653ec6a0dcc578d6193e6bdece4a3a0/src/builder.js#L213
// https://github.com/Animatron/player/blob/3903d59c7653ec6a0dcc578d6193e6bdece4a3a0/src/builder.js#L926

module.exports = Sheet;

},{"../conf.js":8,"../log.js":23,"../resource_manager.js":30,"./bounds.js":13,"engine":35}],19:[function(require,module,exports){
var C = require('../constants.js'),
    is = require('../utils.js').is,
    SystemError = require('../errors.js').SystemError;

var engine = require('engine');

var Brush = require('./brush.js');

var Bounds = require('./bounds.js');

// TODO: new Text("My Text").font("Arial").size(5).bold()

/**
 * @class anm.Text
 *
 * Controls Text to operate a single or several lines of text.
 *
 * Examples:
 *
 * * `var text = new Text('Hello');`
 * * `var text = new Text('Hello').font('Arial');`
 * * `var text = new Text('Hello').font('12px Arial italic');`
 * * `var text = new Text(['Hello', 'Hello', 'Is there anybody in there?']).align(C.TA_CENTER);`
 *
 * See: {@link anm.Element#text Element.text()}
 *
 * @constructor
 *
 * @param {String|[String]} lines lines to init with, one or several
 * @param {String} [font] font description in CSS format, i.e. `Arial` or `12px Arial bold`
 * @param {C.TA_*} [align] text align, one of `C.TA_LEFT` (default), `C.TA_RIGHT` or `C.TA_CENTER`
 * @param {C.BL_*} [baseline] text baseline, one of `C.BL_MIDDLE` (default), `C.BL_TOP`, `C.BL_BOTTOM`, `C.BL_ALPHABETIC`, `C.BL_IDEOGRAPHIC`, `C.BL_ALPHABETIC`
 * @param {Boolean} [underlined] is text underlined
 *
 * @return {anm.Text}
 */
function Text(lines, font, align, baseline, underlined) {
    this.lines = lines;
    this.$font = font || Text.DEFAULT_FONT;
    this.$align = align || Text.DEFAULT_ALIGN;
    this.baseline = baseline || Text.DEFAULT_BASELINE;
    this.underlined = is.defined(underlined) ? underlined : Text.DEFAULT_UNDERLINE;
    this.size = -1;
    this.$bounds = null;
}

Text.DEFAULT_FFACE = 'sans-serif';
Text.DEFAULT_FSIZE = 24;
Text.DEFAULT_FONT = Text.DEFAULT_FSIZE + 'px ' + Text.DEFAULT_FFACE;
Text.DEFAULT_ALIGN = C.TA_LEFT;
Text.DEFAULT_BASELINE = C.BL_MIDDLE; // FIXME: also change to middle?
Text.DEFAULT_UNDERLINE = false;

Text.__measuring_f = engine.createTextMeasurer();

/**
 * @method apply
 *
 * Apply this text to a given 2D context with given fill / stroke / shadow
 *
 * Example: `text.apply(ctx, Brush.fill('#ff0000'), Brush.stroke('#00ff00', 2))`
 *
 * @param {Context2D} ctx where to apply
 * @param {anm.Brush} fill fill to use
 * @param {anm.Brush} stroke stroke to use
 * @param {anm.Brush} shadow shadow to use
 *
 * @return {anm.Text} itself
 */
Text.prototype.apply = function(ctx, fill, stroke, shadow) {
    var bounds = this.bounds(),
        height = (bounds.height / this.lineCount()),
        underlined = this.underlined;

    ctx.font = this.$font;
    ctx.textBaseline = this.baseline || Text.DEFAULT_BASELINE;
    ctx.textAlign = this.$align || Text.DEFAULT_ALIGN;

    var ascent = this.ascent(height, ctx.textBaseline);

    var x = this.xOffset(bounds.width, ctx.textAlign),
        y;
    if (shadow) { shadow.apply(ctx); } else { Brush.clearShadow(ctx); }
    if (fill) {
        fill.apply(ctx);
        y = 0;
        this.visitLines(function(line) {
            ctx.fillText(line, x, y+ascent);
            y += height;
        });
    } else { Brush.clearFill(ctx); }
    if (shadow) { Brush.clearShadow(ctx); }
    if (stroke) {
        stroke.apply(ctx);
        y = 0;
        this.visitLines(function(line) {
            ctx.strokeText(line, x, y+ascent);
            y += height;
        });
    } else { Brush.clearStroke(ctx); }
    if (underlined && fill) {
        y = 0;
        var stroke = Brush.stroke(fill, 1); // passing fill is intentional,
                                            // stroke should have a color of a fill
        stroke.apply(ctx);
        //ctx.lineWidth = 1;
        var line_bounds = null,
            line_width = 0,
            me = this;
        this.visitLines(function(line) {
            line_bounds = Text.bounds(me, line);
            line_width = line_bounds.width;
            ctx.beginPath();
            ctx.moveTo(x, y + height);      // not entirely correct
            ctx.lineTo(line_width, y + height);
            ctx.stroke();

            y += height;
        });
    }
};
/**
 * @method font
 * @chainable
 *
 * Change the font of a text
 *
 * @param {String} value font description in CSS format, i.e. `Arial` or `12px Arial bold`
 * @return {anm.Text} itself
 */
Text.prototype.font = function(value) {
    if (!value) return this.$font;
    this.$font = value;
    return this;
};
/**
 * @method align
 * @chainable
 *
 * Change the alignment of a text
 *
 * @param {C.TA_} value text align, one of `C.TA_LEFT` (default), `C.TA_RIGHT` or `C.TA_CENTER`
 * @return {anm.Text} itself
 */
Text.prototype.align = function(value) {
    if (!value) return this.$align;
    this.$align = value;
    return this;
};
/**
 * @method bounds
 *
 * Get bounds of this text. NB: Be aware, bounds are cached, use `invalidate()`` to update them.
 *
 * @return {Object} bounds data
 */
Text.prototype.bounds = function() {
    if (this.$bounds) return this.$bounds;
    var bounds = Text.bounds(this, this.lines);
    return (this.$bounds = bounds);
};
// should be static
Text.prototype.ascent = function(height, baseline) {
    return (baseline == C.BL_MIDDLE) ? (height / 2) : height;
};
// should be static
Text.prototype.xOffset = function(width, align) {
    if (align == C.TA_LEFT) return 0;
    if (align == C.TA_CENTER) return width / 2;
    if (align == C.TA_RIGHT) return width;
    return 0;
};
/**
 * @method lineCount
 *
 * Get number of lines in this text
 *
 * @return {Number} number of lines
 */
Text.prototype.lineCount = function() {
    var lines = this.lines;
    return (is.arr(lines) ? lines.length : 1);
};
/**
 * @method visitLines
 *
 * // FIXME: rename to `.each`
 *
 * Visit every line of a path with given function
 *
 * @param {Function} f visiting function
 * @param {String} f.line current line
 */
Text.prototype.visitLines = function(func, data) {
    var lines = this.lines;
    if (is.arr(lines)) {
        var line;
        for (var i = 0, ilen = lines.length; i < ilen; i++) {
            line = lines[i];
            func(line);
        }
    } else {
        func(lines.toString());
    }
};
/**
 * @method clone
 *
 * Clone this text
 *
 * @return {anm.Text} clone
 */
Text.prototype.clone = function() {
    var c = new Text(this.lines, this.$font);
    if (this.lines && Array.isArray(this.lines)) {
        c.lines = [].concat(this.lines);
    }
    return c;
};
/**
 * @method invalidate
 *
 * Invalidate bounds of this text
 */
Text.prototype.invalidate = function() {
    this.$bounds = null;
};
Text.prototype.reset = function() { };
Text.prototype.dispose = function() { };
Text.bounds = function(spec, lines) {
    if (!Text.__measuring_f) throw new SysErr('no Text buffer, bounds call failed');
    var dimen = Text.__measuring_f(spec, lines);
    return new Bounds(0, 0, dimen[0], dimen[1]);
};

module.exports = Text;

},{"../constants.js":9,"../errors.js":10,"../utils.js":34,"./bounds.js":13,"./brush.js":14,"engine":35}],20:[function(require,module,exports){
// Importers
// -----------------------------------------------------------------------------
var importers = {};

importers.register = function(alias, conf) {
  if (importers[alias]) throw new Error('Importer ' + alias + ' is already registered!');
  importers[alias] = conf;
};

importers.get = function(alias) {
  return importers[alias];
};

importers.create = function(alias) {
  return new importers[alias]();
};

importers.isAccessible = function(alias) {
  return typeof importers[alias] !== 'undefined';
};

module.exports = importers;

},{}],21:[function(require,module,exports){
var utils = require('./utils.js'),
    is = utils.is;

var loc = require('./loc.js'),
    Errors = loc.Errors,
    errors = require('./errors.js'),
    SystemError = errors.SystemError,
    PlayerError = errors.PlayerError;

var C = require('./constants.js'),
    global_opts = require('./global_opts.js');

var engine = require('engine');

var Animation = require('./animation/animation.js');

var Loader = {};

Loader.loadFromUrl = function(player, url, importer, callback) {
    if (!JSON) throw new SystemError(Errors.S.NO_JSON_PARSER);

    mporter = importer || anm.importers.create('animatron');

    var url_with_params = url.split('?');
        url = url_with_params[0];
    var url_params = url_with_params[1], // TODO: validate them?
        params = (url_params && url_params.length > 0) ? utils.paramsToObj(url_params) : {},
        options = optsFromUrlParams(params);

    if (options) {
        player._addOpts(options);
        player._checkOpts();
    }

    var failure = player.__defAsyncSafe(function(err) {
        throw new SystemError(utils.strf(Errors.P.SNAPSHOT_LOADING_FAILED,
                               [ (err ? (err.message || err) : '¿Por qué?') ]));
    });

    var success = function(req) {
        try {
            Loader.loadFromObj(player, JSON.parse(req.responseText), importer, function(anim) {
                player._applyUrlParamsToAnimation(params);
                if (callback) callback.call(player, anim);
            });
        } catch(e) { failure(e); }
    };

    var anm_cookie = engine.getCookie('_animatronauth');

    engine.ajax(url, success, failure, 'GET',
        anm_cookie ? { 'Animatron-Security-Token': anm_cookie } : null);
};

Loader.loadFromObj = function(player, object, importer, callback) {
    if (!importer) throw new PlayerError(Errors.P.NO_IMPORTER_TO_LOAD_WITH);
    var anim = importer.load(object);
    player.fire(C.S_IMPORT, importer, anim, object);
    Loader.loadAnimation(player, anim, callback);
};

Loader.loadAnimation = function(player, anim, callback) {
    if (player.anim) player.anim.dispose();
    // add debug rendering
    if (player.debug && !global_opts.liveDebug)
        anim.visitElems(function(e) {e.addDebugRender();}); /* FIXME: ensure not to add twice */
    if (!anim.width || !anim.height) {
        anim.width = player.width;
        anim.height = player.height;
    } else if (player.forceAnimationSize) {
        player._resize(anim.width, anim.height);
    }
    // assign
    player.anim = anim;
    if (callback) callback.call(player, anim);
};

Loader.loadElements = function(player, elms, callback) {
    var anim = new Animation();
    anim.add(elms);
    Loader.loadAnimation(player, anim, callback);
};

var optsFromUrlParams = function(params/* as object */) {
    function __boolParam(val) {
        if (!val) return false;
        if (val === 0) return false;
        if (val == 1) return true;
        if (val == 'false') return false;
        if (val == 'true') return true;
        if (val == 'off') return false;
        if (val == 'on') return true;
        if (val == 'no') return false;
        if (val == 'yes') return true;
    }
    function __extractBool() {
        var variants = arguments;
        for (var i = 0; i < variants.length; i++) {
            if (is.defined(params[variants[i]])) return __boolParam(params[variants[i]]);
        }
        return undefined;
    }
    var opts = {};
    opts.debug = is.defined(params.debug) ? __boolParam(params.debug) : undefined;
    opts.muteErrors = __extractBool('me', 'muterrors');
    opts.repeat = __extractBool('r', 'repeat');
    opts.autoPlay = __extractBool('a', 'auto', 'autoplay');
    opts.mode = params.m || params.mode || undefined;
    opts.zoom = params.z || params.zoom;
    opts.speed = params.v || params.speed;
    opts.width = params.w || params.width;
    opts.height = params.h || params.height;
    opts.infiniteDuration = __extractBool('i', 'inf', 'infinite');
    opts.audioEnabled = __extractBool('s', 'snd', 'sound', 'audio');
    opts.controlsEnabled = __extractBool('c', 'controls');
    opts.infoEnabled = __extractBool('info');
    opts.loadingMode = params.lm || params.lmode || params.loadingmode || undefined;
    opts.thumbnail = params.th || params.thumb || undefined;
    opts.bgColor = params.bg || params.bgcolor;
    opts.ribbonsColor = params.ribbons || params.ribcolor;
    return opts;
};

module.exports = Loader;

},{"./animation/animation.js":1,"./constants.js":9,"./errors.js":10,"./global_opts.js":12,"./loc.js":22,"./utils.js":34,"engine":35}],22:[function(require,module,exports){
// Strings

var Strings = {};

Strings.COPYRIGHT = 'Animatron Player';
Strings.LOADING = 'Loading...';
Strings.LOADING_ANIMATION = 'Loading {0}...';

// Error Strings

var Errors = {};

Errors.S = {}; // System Errors
Errors.P = {}; // Player Errors
Errors.A = {}; // Animation Errors

Errors.S.CANVAS_NOT_SUPPORTED = 'Your browser does not support HTML5 canvas, so we cannot play anything for you.'
Errors.S.SAD_SMILEY_HTML = '<span style="font-size: 4em;">:(</span><br>' +
  Errors.S.CANVAS_NOT_SUPPORTED;
Errors.S.NO_JSON_PARSER = 'JSON parser is not accessible';
Errors.S.ERROR_HANDLING_FAILED = 'Error-handling mechanics were broken with error {0}';
Errors.S.NO_METHOD_FOR_PLAYER = 'No method \'{0}\' exist for player';
Errors.P.NO_IMPORTER_TO_LOAD_WITH = 'Cannot load this project without importer. Please define it';
Errors.P.NO_WRAPPER_WITH_ID = 'No element found with given id: {0}';
Errors.P.NO_WRAPPER_WAS_PASSED = 'No element was passed to player initializer';
Errors.P.CANVAS_NOT_VERIFIED = 'Canvas is not verified by the provider';
Errors.P.CANVAS_NOT_PREPARED = 'Canvas is not prepared, don\'t forget to call \'init\' method';
Errors.P.ALREADY_PLAYING = 'Player is already in playing mode, please call ' +
                           '\'stop\' or \'pause\' before playing again';
Errors.P.PAUSING_WHEN_STOPPED = 'Player is stopped, so it is not allowed to pause';
Errors.P.NO_ANIMATION_PASSED = 'No animation passed to load method';
Errors.P.NO_STATE = 'There\'s no player state defined, nowhere to draw, ' +
                    'please load something in player before ' +
                    'calling its playing-related methods';
Errors.P.NO_ANIMATION = 'There\'s nothing at all to manage with, ' +
                    'please load something in player before ' +
                    'calling its playing-related methods';
Errors.P.COULD_NOT_LOAD_WHILE_PLAYING = 'Could not load any animation while playing or paused, ' +
                    'please stop player before loading';
Errors.P.LOAD_WAS_ALREADY_POSTPONED = 'Load was called while loading process was already in progress';
Errors.P.NO_LOAD_CALL_BEFORE_PLAY = 'No animation was loaded into player before the request to play';
Errors.P.BEFOREFRAME_BEFORE_PLAY = 'Please assign beforeFrame callback before calling play()';
Errors.P.AFTERFRAME_BEFORE_PLAY = 'Please assign afterFrame callback before calling play()';
Errors.P.BEFORERENDER_BEFORE_PLAY = 'Please assign beforeRender callback before calling play()';
Errors.P.AFTERRENDER_BEFORE_PLAY = 'Please assign afterRender callback before calling play()';
Errors.P.PASSED_TIME_VALUE_IS_NO_TIME = 'Given time is not allowed, it is treated as no-time';
Errors.P.PASSED_TIME_NOT_IN_RANGE = 'Passed time ({0}) is not in animation range';
Errors.P.DURATION_IS_NOT_KNOWN = 'Duration is not known';
Errors.P.ALREADY_ATTACHED = 'Player is already attached to this canvas, please use another one';
Errors.P.INIT_TWICE = 'Initialization was called twice';
Errors.P.INIT_AFTER_LOAD = 'Initialization was called after loading a animation';
Errors.P.SNAPSHOT_LOADING_FAILED = 'Snapshot failed to load ({0})';
Errors.P.IMPORTER_CONSTRUCTOR_PASSED = 'You\'ve passed importer constructor to snapshot loader, but not an instance! ' +
                                       'Probably you used anm.importers.get instead of anm.importers.create.';
Errors.A.ELEMENT_IS_REGISTERED = 'This element is already registered in animation';
Errors.A.ELEMENT_IS_NOT_REGISTERED = 'There is no such element registered in animation';
Errors.A.UNSAFE_TO_REMOVE = 'Unsafe to remove, please use iterator-based looping (with returning false from iterating function) to remove safely';
Errors.A.NO_ELEMENT_TO_REMOVE = 'Please pass some element or use detach() method';
Errors.A.NO_ELEMENT = 'No such element found';
Errors.A.ELEMENT_NOT_ATTACHED = 'Element is not attached to something at all';
Errors.A.MODIFIER_NOT_ATTACHED = 'Modifier wasn\'t applied to anything';
Errors.A.NO_MODIFIER_PASSED = 'No modifier was passed';
Errors.A.NO_PAINTER_PASSED = 'No painter was passed';
Errors.A.MODIFIER_REGISTERED = 'Modifier was already added to this element';
Errors.A.PAINTER_REGISTERED = 'Painter was already added to this element';
Errors.A.RESOURCES_FAILED_TO_LOAD = 'Some of resources required to play this animation were failed to load';
Errors.A.MASK_SHOULD_BE_ATTACHED_TO_ANIMATION = 'Element to be masked should be attached to animation when rendering';

module.exports = {
  Strings: Strings,
  Errors: Errors
};

},{}],23:[function(require,module,exports){
(function (global){
var conf = require('./conf.js'),
    C = require('./constants.js');

var nop = function() {};
var c = global.console || {log: nop, info: nop, warn: nop, error: nop},
    anmConsole;
if (global.console) {
    anmConsole = {
        log: c.debug || c.log,
        info: c.info || c.log,
        warn: c.warn || c.log,
        error: c.error || c.log
    };
    if (!c.log.apply) {
        //in ie9, console.log isn't a real Function object and does not have .apply()
        //we will have to remedy this using Function.prototype.bind()
        anmConsole.log = Function.prototype.bind.call(anmConsole.log, c);
        anmConsole.info = Function.prototype.bind.call(anmConsole.info, c);
        anmConsole.warn = Function.prototype.bind.call(anmConsole.warn, c);
        anmConsole.error = Function.prototype.bind.call(anmConsole.log, c);
    }
}

var log = {
    debug: function() { if (conf.logLevel & C.L_DEBUG) anmConsole.log.apply(c, arguments); },
    info:  function() { if (conf.logLevel & C.L_INFO)  anmConsole.info.apply(c, arguments); },
    warn:  function() { if (conf.logLevel & C.L_WARN)  anmConsole.warn.apply(c, arguments); },
    error: function() { if (conf.logLevel & C.L_ERROR) anmConsole.error.apply(c, arguments); }
};

module.exports = log;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./conf.js":8,"./constants.js":9}],24:[function(require,module,exports){
(function (global){
var conf = require('../conf.js'),
    log = require('../log.js'),
    utils = require('../utils.js');

var C = require('../constants.js');

var engine = require('engine');

var ResMan = require('../resource_manager.js');

var testAudio = engine.createAudio(),
    oggSupported =  !!(testAudio.canPlayType && testAudio.canPlayType('audio/ogg;').replace(/no/, ''));

var audioExt = oggSupported ? '.ogg' : '.mp3';
var audioType = oggSupported ? 'audio/ogg' : 'audio/mp3';

function getAudioContext() {
    if (engine.isLocal) {
        // we will not be able to load the audio as an ArrayBuffer
        // when we're under file protocol, so we shall have to
        // fall back to <audio> when playing locally.
        return null;
    }

    var AudioContext = global.AudioContext || global.webkitAudioContext;
    if (!AudioContext) {
      return null;
    }

    if (global.anmAudioContext) {
        return global.anmAudioContext;
    }

    try {
      var ctx = new AudioContext();
      return (global.anmAudioContext = ctx);
    } catch (e) {
      return null;
    }
}

var audioContext = getAudioContext();

/**
 * @class anm.Audio
 */
function Audio(url) {
    this.url = url + audioExt;
    this.ready = false;
    this.playing = false;
    this.canPlay = false;
    this.volume = 1;
    this.audio = null;
}
/** @private @method load */
Audio.prototype.load = function(player) {
    var me = this;
    ResMan.loadOrGet(player.id, me.url,
      function(notify_success, notify_error, notify_progress) { // loader
          var url = me.url;
          if (engine.isHttps) {
              url = url.replace('http:', 'https:');
          }

          if (anm.conf.doNotLoadAudio) {
            notify_error('Loading audio is turned off');
            return;
          }

          if (audioContext) {
            // use Web Audio API if possible

            var node = {};

            var decode = function(node, url) {
              try {
                audioContext.decodeAudioData(node.buf, function onSuccess(decodedBuffer) {
                  notify_success(decodedBuffer);
                }, function(err) {
                  if (syncStream(node)) decode(node, url);
                });
              } catch(e) {
                notify_error('Unable to load audio ' + url + ': ' + e.message);
              }
            };

            var loadingDone = function(e) {
              var req = e.target;
              if (req.status == 200) {
                node.buf = req.response;
                node.sync = 0;
                node.retry = 0;
                decode(node);
              } else {
                notify_error('Unable to load audio ' + url + ': ' + req.statusText);
              }
            };

            node.xhr = new XMLHttpRequest();
            node.xhr.open('GET', url, true);
            node.xhr.responseType = 'arraybuffer';
            node.xhr.addEventListener('load', loadingDone, false);
            node.xhr.addEventListener('error', audioErrProxy(url, notify_error), false);
            node.xhr.send();
          } else {
            var el = engine.createAudio();
            el.setAttribute("preload", "auto");

            var progressListener = function(e) {
              var buffered = el.buffered;
              if (buffered.length == 1) {
                  // 0 == HAVE_NOTHING
                  // 1 == HAVE_METADATA
                  // 2 == HAVE_CURRENT_DATA
                  // 3 == HAVE_FUTURE_DATA
                  // 4 == HAVE_ENOUGH_DATA
                  if (el.readyState === 4 || el.readyState === 3) {
                    engine.unsubscribeElementEvents(el,
                        { 'progress': progressAndLoadingListener,
                          'loadedmetadata': loadingListener,
                          'canplay': canPlayListener });
                    notify_success(el);
                    notify_progress(1);
                    return;
                  }

                  if (me.canPlay && window.chrome) {
                    el.volume = 0;
                    el.currentTime = end;
                    el.play();
                    el.pause();
                  }
              } else if (me.canPlay && buffered.length != 1) {
                // will skip preloading since it seems like it will not work properly anyway:
                // it's a workaround for Android-based browsers which
                // will not allow prebuffering until user will explicitly allow it (by touching something)
                notify_success(el);
                notify_progress(1);
              }
            };

            var loadingListener = function(e) {
                var ranges = [];
                for (var i = 0; i < el.buffered.length; i++) {
                    ranges.push([ el.buffered.start(i),
                                  el.buffered.end(i) ]);
                }

                for (i = 0, progress = 0; i < el.buffered.length; i ++) {
                    progress += (1 / el.duration) * (ranges[i][1] - ranges[i][0]);
                }

                notify_progress(progress);
            };

            var progressAndLoadingListener = function(e) {
                progressListener(e); loadingListener(e);
            };

            var canPlayListener = function(e) {
              me.canPlay = true;
              progressListener(e);
            };

            engine.subscribeElementEvents(el,
                { 'progress': progressAndLoadingListener,
                  'loadedmetadata': loadingListener,
                  'canplay': canPlayListener,
                  'error': audioErrProxy(url, notify_error) });

            var addSource = function(audio, url, type) {
                var src = engine.createSource();
                src.addEventListener("error", notify_error, false);
                src.type = type;
                src.src = url;
                audio.appendChild(src);
            };

            try {
              engine.appendToBody(el);
              addSource(el, url, audioType);
            } catch(e) {
                notify_error(e);
            }
          }
      },
      function(audio) { // oncomplete
          me.audio = audio;
          me.ready = true;
          if (player.muted) {
              me.mute();
          }

      },
      function(err) {
          log.error(err ? (err.message || err) : 'Unknown error');
      });
};
/** @private @method play */
Audio.prototype.play = function(ltime, duration) {
    if (!this.ready || this.playing) {
      return false;
    }

    this.playing = true;
    var current_time = this.offset + ltime;

    if (audioContext) {
      if (current_time > this.audio.duration) {
        this._audio_is_playing = false;
        return;
      }

      this._source = audioContext.createBufferSource();
      this._source.buffer = this.audio;
      this._gain = audioContext.createGain();
      this._source.connect(this._gain);
      this._gain.connect(audioContext.destination);
      this._gain.gain.value = this.volume;

      if (this._source.play) {
        this._source.play(0, current_time);
      } else if (this._source.start) {
        this._source.start(0, current_time, this._source.buffer.duration - current_time);
      } else {
        this._source.noteGrainOn(0, current_time, this._source.buffer.duration - current_time);
      }
    } else {
      this.audio.currentTime = current_time;
      this.audio.volume = this.volume;
      this.audio.play();
    }
};
/** @private @method stop */
Audio.prototype.stop = function() {
    if (!this.playing) {
        return;
    }
    try {
        if (audioContext) {
            if (this._source.stop) {
                this._source.stop(0);
            } else {
                this._source.noteOff(0);
            }
            this._source = null;
        } else {
            this.audio.pause();
            this.audio.volume = 0;
        }
    } catch (err) {
        // do nothing
    }
    this.playing = false;
};
/** @private @method stopIfNotMaster */
Audio.prototype.stopIfNotMaster = function() {
    if (!this.master) this.stop();
};
/**
 * @method setVolume
 * @chainable
 * @deprecated will be renamed to `.volume()`, will be both getter and setter
 *
 * Change audio volume on the fly
 *
 * @param {Number} volume Volume value
 * @return {anm.Audio}
 */
Audio.prototype.setVolume = function(volume) {
    if (this.muted) {
        this.unmuteVolume = volume;
        return;
    }
    this.volume = volume;
    if (this._gain) {
        this._gain.gain.value = volume;
    } else if (this.audio) {
        this.audio.volume = volume;
    }
    return this;
};
/**
 * @method mute
 *
 * Mute this audio
 */
Audio.prototype.mute = function() {
    if (this.muted) {
        return;
    }
    this.unmuteVolume = this.volume;
    this.setVolume(0);
    this.muted = true;
};
/**
 * @method unmute
 *
 * Unmute this audio
 */
Audio.prototype.unmute = function() {
    if (!this.muted) {
        return;
    }
    this.muted = false;
    this.setVolume(this.unmuteVolume);
};
/**
 * @method toggleMute
 *
 * Toggle mute value of this audio
 */
Audio.prototype.toggleMute = function() {
    if (this.muted) {
        this.unmute();
    } else {
        this.mute();
    }
};
/** @private @method connect */
Audio.prototype.connect = function(element) {
    var me = this;
    element.on(C.X_START, function() {
        me.play.apply(me, arguments);
    });
    element.on(C.X_STOP, function() {
        me.stopIfNotMaster();
    });
    var stop = function() {
        me.stop();
    };
    element.on(C.S_STOP, stop);
    element.on(C.S_PAUSE, stop);
};
/**
 * @method clone
 *
 * @return {anm.Audio}
 */
Audio.prototype.clone = function() {
    var clone = new Audio('');
    clone.url = this.url;
    clone.offset = this.offset;
    return clone;
};

// workaround, see http://stackoverflow.com/questions/10365335/decodeaudiodata-returning-a-null-error
function syncStream(node){
  var buf8 = new Uint8Array(node.buf);
  buf8.indexOf = Array.prototype.indexOf;
  var i=node.sync, b=buf8;
  while(1) {
      node.retry++;
      i=b.indexOf(0xFF,i); if(i==-1 || (b[i+1] & 0xE0 == 0xE0 )) break;
      i++;
  }
  if(i!=-1) {
      var tmp=node.buf.slice(i); //carefull there it returns copy
      delete(node.buf); node.buf=null;
      node.buf=tmp;
      node.sync=i;
      return true;
  }
  return false;
}

function audioErrProxy(src, pass_to) {
  return function(err) {
    // e_.MEDIA_ERR_ABORTED=1
    // e_.MEDIA_ERR_NETWORK=2
    // e_.MEDIA_ERR_DECODE=3
    // e_.MEDIA_ERR_SRC_NOT_SUPPORTED=4
    // e_.MEDIA_ERR_ENCRYPTED=5
    pass_to(new Error('Failed to load audio file from ' + src + ' with error code: ' +
                      err.currentTarget.error.code));
  };
}

module.exports = Audio;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../conf.js":8,"../constants.js":9,"../log.js":23,"../resource_manager.js":30,"../utils.js":34,"engine":35}],25:[function(require,module,exports){
/*
 * Copyright (c) 2011-@COPYRIGHT_YEAR by Animatron.
 * All rights are reserved.
 *
 * Animatron Player is licensed under the MIT License, see LICENSE.
 *
 * @VERSION
 */

var conf = require('../conf.js'),
    log = require('../log.js');

var C = require('../constants.js');

var engine = require('engine');

var ResMan = require('../resource_manager.js');

/**
 * @class anm.Video
 */
function Video(url) {
    this.url = url;
    this.ready = false;
    this.playing = false;
}
/** @private @method connect */
Video.prototype.connect = function(element) {
    var me = this;
    element.on(C.X_START, function() {
        me.play.apply(me, arguments);
    });
    var stop = function() { me.stop(); };
    element.on(C.X_STOP, stop);
    element.on(C.S_STOP, stop);
    element.on(C.S_PAUSE, stop);
};
/** @private @method load */
Video.prototype.load = function(player) {

    var me = this;
    ResMan.loadOrGet(player.id, me.url,
        function(notify_success, notify_error, notify_progress) { // loader
            var url = me.url;
            if (engine.isHttps) { url = url.replace('http:', 'https:'); }

            var el = engine.createVideo();
            el.setAttribute("preload", "auto");
            el.style.display = 'none';

            var progressListener = function(e) {
                var buffered = el.buffered;
                if (buffered.length == 1) {
                    // 0 == HAVE_NOTHING
                    // 1 == HAVE_METADATA
                    // 2 == HAVE_CURRENT_DATA
                    // 3 == HAVE_FUTURE_DATA
                    // 4 == HAVE_ENOUGH_DATA
                    if (el.readyState === 4) {
                        engine.unsubscribeElementEvents(el,
                            { 'progress': progressAndLoadingListener,
                              'loadedmetadata': loadingListener,
                              'canplay': canPlayListener });
                        notify_success(el);
                        notify_progress(1);
                        return;
                    }
                }
            };

            var loadingListener = function(e) {
                var ranges = [];
                for (var i = 0; i < el.buffered.length; i++) {
                    ranges.push([ el.buffered.start(i),
                                  el.buffered.end(i) ]);
                }

                for (var i = 0, progress = 0; i < el.buffered.length; i ++) {
                    progress += (1 / el.duration) * (ranges[i][1] - ranges[i][0]);
                }

                notify_progress(progress);
            }

            var progressAndLoadingListener = function(e) {
                progressListener(e); loadingListener(e);
            }

            var canPlayListener = function(e) {
                me.canPlay = true;
                progressListener(e);
            };

            engine.subscribeElementEvents(el,
                { 'progress': progressAndLoadingListener,
                  'loadedmetadata': loadingListener,
                  'canplay': canPlayListener,
                  'error': videoErrProxy(url, notify_error) });

            var addSource = function(video, url, type) {
                var src = engine.createSource();
                src.addEventListener("error", notify_error, false);
                src.type = 'video/' + type;
                src.src = url;
                video.appendChild(src);
            };

            try {
                engine.appendToBody(el);
                addSource(el, url, 'mp4');
            } catch(e) { notify_error(e); }

        },
        function(video) { // oncomplete
            me.video = video;
            me.ready = true;
        },
        function(err) { log.error(err ? (err.message || err) : 'Unknown error');
                        /* throw err; */
        });
};
/** @private @method apply */
Video.prototype.apply = function(ctx) {
    ctx.drawImage(this.video, 0, 0);
};
Video.prototype.bounds = function() {};
/** @private @method play */
Video.prototype.play = function(ltime, duration) {
    if (!this.ready || this.playing) {
       return false;
    }

    this.playing = true;
    var current_time = (this.offset || 0) + ltime;

    this.video.currentTime = current_time;
    this.video.play();
}
/** @private @method stop */
Video.prototype.stop = function() {
    if (!this.playing) return;
    this.video.pause();
    this.playing = false;
};
Video.prototype.invalidate = function() {};
Video.prototype.dispose = function() {};
/**
 * @method clone
 *
 * @return {anm.Video}
 */
Video.prototype.clone = function() {
    var clone = new Video(this.url);
    clone.offset = this.offset;
    return clone;
};

function videoErrProxy(src, pass_to) {
  return function(err) {
    // e_.MEDIA_ERR_ABORTED=1
    // e_.MEDIA_ERR_NETWORK=2
    // e_.MEDIA_ERR_DECODE=3
    // e_.MEDIA_ERR_SRC_NOT_SUPPORTED=4
    // e_.MEDIA_ERR_ENCRYPTED=5
    pass_to(new Error('Failed to load video file from ' + src + ' with error code: ' +
                      err.currentTarget.error.code));
  };
}

module.exports = Video;

},{"../conf.js":8,"../constants.js":9,"../log.js":23,"../resource_manager.js":30,"engine":35}],26:[function(require,module,exports){
// Modules
// -----------------------------------------------------------------------------
var modules = {};

modules.register = function(alias, conf) {
  if (modules[alias]) throw new Error('Module ' + alias + ' is already registered!');
  modules[alias] = conf;
};

modules.get = function(alias) {
  return modules[alias];
};

modules.isAccessible = function(alias) {
  return typeof modules[alias] !== 'undefined';
};

module.exports = modules;

},{}],27:[function(require,module,exports){
/*
 * Copyright (c) 2011-@COPYRIGHT_YEAR by Animatron.
 * All rights are reserved.
 *
 * Animatron Player is licensed under the MIT License, see LICENSE.
 *
 * @VERSION
 */
// Player Core
// =============================================================================

// This file contains only the Animatron Player core source code, without any _modules_
// included. The player is written with as minimum publicily-visible classes as possible, but
// its internal structure hides more things, of course. Code in the file goes in
// natural order, mostly from general things to internal ones. However, to make
// code work properly it is not always possible to keep this principle.
//
// Module Definition
// -----------------------------------------------------------------------------

var C = require('./constants.js');

var utils = require('./utils.js'),
    is = utils.is,
    global_opts = require('./global_opts.js'),
    conf = require('./conf.js'),
    log = require('./log.js'),
    events = require('./events.js'),
    provideEvents = events.provideEvents;

var loc = require('./loc.js'),
    Strings = loc.Strings,
    Errors = loc.Errors,
    errors = require('./errors.js'),
    PlayerError = errors.PlayerError,
    SystemError = errors.SystemError;

var engine = require('engine'),
    resourceManager = require('./resource_manager.js'),
    playerManager = require('./player_manager.js');

var Loader = require('./loader.js'),
    Controls = require('./ui/controls.js');

var Animation = require('./animation/animation.js'),
    Element = require('./animation/element.js'),
    Render = require('./render.js'),
    Sheet = require('./graphics/sheet.js');


// Player
// -----------------------------------------------------------------------------

/**
 * @class anm.Player
 *
 * The Player is the one who rules them all.
 *
 * The easiest way to create a Player class instance (among dozens of ways to
 * init the Player without any JS code) is to call `var player = new Player();
 * player.init(...)`. If you want to initialize a player in one step, call
 * `anm.createPlayer(...)` instead.
 *
 * If you have an URL to Animatron-compatible JSON snapshot, you may load a Player
 * without any JS, with:
 *
 * `<div id="my-precious-player" anm-src="http://example.com/animation.json" anm-width="100" anm-height="200"/></div>`
 *
 * It is recommended to always specify both width and height of a Player, if you know
 * them before. If animation is loaded synchronously and it has some size specified in
 * any way, this doesn't changes a lot, since Player takes its size from these values.
 * But if animation is loaded asynhronously, a noticable value of time is spent on request,
 * so it's better to resize Player before the loading will start, so no creepy resize effect
 * will appear.
 *
 * For details on loading, see {@link anm.Player#load} method. For the list
 * of possible attribute options and other ways to initialize, see
 * {@link anm.Player#init} method.
 *
 * To load some remote Animatron snapshot in one step, use {@link anm.Player#forSnapshot}.
 *
 * Playing control:
 *
 * * {@link anm.Player#play}
 * * {@link anm.Player#stop}
 * * {@link anm.Player#pause}
 * * {@link anm.Player#drawAt}
 *
 * To set thumbnail to show while animation loads or wasn't started, use {@link anm.Player#thumbnail}.
 *
 * @constructor
 */

function Player() {
    this.id = '';
    this.state = null;
    this.anim = null;
    this.canvas = null;
    this.ctx = null;
    this.controls = null;
    this.__canvasPrepared = false;
    this.__instanceNum = ++Player.__instances;
    this.__makeSafe(Player._SAFE_METHODS);
    this.muted = false;
}
Player.__instances = 0;

Player.PREVIEW_POS = 0; // was 1/3
Player.PEFF = 0; // seconds to play more when reached end of movie
Player.NO_TIME = -1;

Player.DEFAULT_CONFIGURATION = { 'debug': false,
                                 'repeat': false,
                                 'autoPlay': false,
                                 'mode': C.M_VIDEO,
                                 'zoom': 1.0,
                                 'speed': 1.0,
                                 'width': undefined,
                                 'height': undefined,
                                 //'fps': undefined,
                                 'infiniteDuration': undefined, // undefined means 'auto'
                                 'drawStill': undefined, // undefined means 'auto',
                                 'audioEnabled': true,
                                 'audioGlobalVolume': 1.0,
                                 'imagesEnabled': true,
                                 'videoEnabled': true,
                                 'shadowsEnabled': true,
                                 'handleEvents': undefined, // undefined means 'auto'
                                 'controlsEnabled': undefined, // undefined means 'auto'
                                 'infoEnabled': undefined, // undefined means 'auto'
                                 'loadingMode': C.LM_DEFAULT, // undefined means 'auto'
                                 'thumbnail': undefined,
                                 'bgColor': undefined,
                                 'ribbonsColor': undefined,
                                 'forceAnimationSize': false,
                                 'muteErrors': false
                               };

Player.EMPTY_BG = 'rgba(0,0,0,.05)';
Player.EMPTY_STROKE = 'rgba(50,158,192,.5)';
Player.EMPTY_STROKE_WIDTH = 3;

// ### Playing Control API
/* ----------------------- */

/**
  * @private @static @property
  *
  * Methods listed below are directly wrapped with try/catch to check
  * which way of handling/suppressing errors is current one for this player
  * and act with caught errors basing on this way
  */
Player._SAFE_METHODS = [ 'init', 'load', 'play', 'stop', 'pause', 'drawAt' ];

/* TODO: add load/play/pause/stop events */

/**
 * @method init
 * @chainable
 *
 * Initializes player.
 *
 * @param {HTMLElement|String} elm DOM Element or ID of existing DOM Element to init from.
 *
 * This one shouldn't be a `canvas` element, but rather a block element like
 * `div`, since Player will put its own structure of one or more canvases inside it.
 *
 * @param {Object} [opts] Initialization options.
 *
 * Options format:
 *
 *     { debug: false,
 *       autoPlay: false,
 *       repeat: false,
 *       mode: C.M_VIDEO,
 *       zoom: 1.0,
 *       speed: 1.0,
 *       width: undefined,
 *       height: undefined,
 *       bgColor: undefined,
 *       ribbonsColor: undefined,
 *       audioEnabled: true,
 *       inifiniteDuration: false,
 *       drawStill: false,
 *       controlsEnabled: undefined, // undefined means 'auto'
 *       infoEnabled: undefined, // undefined means 'auto'
 *       handleEvents: undefined, // undefined means 'auto'
 *       loadingMode: undefined, // undefined means 'auto'
 *       thumbnail: undefined,
 *       forceAnimationSize: false,
 *       muteErrors: false
 *     }
 *
 * First, Player initializes itself with default options. Then it scans the given `elm`
 * DOM Element for the attributes named with `anm-` prefix and applies them over the
 * default values. Then, it applies the `opts` you passed here, so they have the highest
 * priority.
 *
 * `anm`-attributes have the same names as in the given example, with camel-casing changed
 * to dashing, i.e.:
 *
 * `<div id="player" anm-width="200" anm-height="100" anm-auto-play="true" anm-ribbons-color="#f00" />`
 *
 * @param {Boolean} [opts.debug=false] Enables showing FPS and shapes paths, at least
 * @param {Boolean} [opts.autoPlay=false] If Player automatically starts playing just after the
 *                                        {@link anm.Animation Animation} was loaded inside.
 * @param {Boolean} [opts.repeat=false] If Player automatically starts playing the Animation again
 *                                      when it's finished the time before. A.K.A. "Infinite Loop".
 * @param {Mixed} [opts.mode=C.M_VIDEO]
 *
 * The Player mode, which actually just specifies a combination of other options:
 *
 * * `C.M_PREVIEW` — `controlsEnabled=false` + `infoEnabled=false` + `handleEvents=false`
 *    + `drawStill=false` + `infiniteDuration=false` — used for Editor Preview by F10;
 * * `C.M_DYNAMIC` — `controlsEnabled=false` + `infoEnabled=false` + `handleEvents=true`
 *    + `drawStill=false` + `infiniteDuration=true` — used for games or interactive animations, mostly;
 * * `C.M_VIDEO` — `controlsEnabled=true` + `infoEnabled=false` (temporarily) + `handleEvents=false`
 *    + `drawStill=true` + `infiniteDuration=false` — used for non-interactive animations;
 * * `C.M_SANDBOX` — `controlsEnabled=false` + `infoEnabled=false` `handleEvents=false`
 *    + `drawStill=false` + `infiniteDuration=false` — used in Sandbox;
 *
 * @param {Number} [opts.zoom=1.0] Force scene zoom. Player will not resize itself, though, but will act
 *                                 as a magnifying/minifying glass for all values except `1.0`.
 * @param {Number} [opts.speed=1.0] Increase/decrease playing speed.
 * @param {Number} [opts.bgColor='transparent'] The color to use as a background.
 *
 * // TODO
 */

Player.prototype.init = function(elm, opts) {
    if (this.canvas || this.wrapper) throw new PlayerError(Errors.P.INIT_TWICE);
    if (this.anim) throw new PlayerError(Errors.P.INIT_AFTER_LOAD);
    this._initHandlers(); /* TODO: make automatic */
    this._prepare(elm);
    this._addOpts(Player.DEFAULT_CONFIGURATION);
    this._addOpts(engine.extractUserOptions(this.canvas));
    this._addOpts(engine.extractUserOptions(this.wrapper));
    try {
        if (window && window.frameElement) {
            this._addOpts(engine.extractUserOptions(window.frameElement));
        }
    } catch(e) {}
    this._addOpts(opts || {});
    this._postInit();
    this._checkOpts();
    /* TODO: if (this.canvas.hasAttribute('data-url')) */

    playerManager.fire(C.S_NEW_PLAYER, this);
    return this;
};

/**
 * @method load
 * @chainable
 *
 * This method may be called in several ways:
 *
 * * `load(animation)`;
 * * `load(animation, callback)`;
 * * `load(animation, importer)`;
 * * `load(animation, duration)`;
 * * `load(animation, importer, callback)`;
 * * `load(animation, duration, callback)`;
 * * `load(animation, duration, importer, callback)`;
 *
 * TODO
 *
 * @param {anm.Animation|Object} animation
 * @param {Number} [duration]
 * @param {anm.Importer} [importer]
 * @param {Function} [callback]
 * @param {anm.Animation} callback.animation The resulting {@link anm.Animation animation}, was it adapted with {@link anm.Importer importer} or not
 */
Player.prototype.load = function(arg1, arg2, arg3, arg4) {

    var player = this,
        state = player.state;

    if ((state.happens === C.PLAYING) ||
        (state.happens === C.PAUSED)) {
        throw new PlayerError(Errors.P.COULD_NOT_LOAD_WHILE_PLAYING);
    }

    /* object */
    /* object, callback */
    /* object, importer */
    /* object, duration */
    /* object, importer, callback */
    /* object, duration, callback */
    /* object, duration, importer, callback */

    var object = arg1,
        duration, importer, callback;

    if (object && object.id && player.anim && (player.anim.id == object.id)) {
        log.info('Animation with ID=' + object.id + ' is already loaded in player, skipping the call');
        return;
    }

    var durationPassed = false;

    // FIXME: it is possible that importer constructor function will be passed
    //        as importer (it will have IMPORTER_ID property as a marker),
    //        since `anm.getImporter` name is not obvious;
    //        we can't let ourselves create an importer instance manually here,
    //        so it's considered a problem of naming.
    if ((arg2 && arg2.IMPORTER_ID) || (arg3 && arg3.IMPORTER_ID)) {
        throw new PlayerError(Errors.P.IMPORTER_CONSTRUCTOR_PASSED);
    }

    if (is.fun(arg2)) { callback = arg2; } /* object, callback */
    else if (is.num(arg2) || !arg2) { /* object, duration[, ...] */
        if (is.num(arg2)) {
          duration = arg2;
          durationPassed = true;
        }
        if (is.obj(arg3)) { /* object, duration, importer[, callback] */
          importer = arg3; callback = arg4;
        } else if (is.fun(arg3)) { /* object, duration, callback */
          callback = arg3;
        }
    } else if (is.obj(arg2)) { /* object, importer[, ...] */
        importer = arg2;
        callback = arg3;
    }

    if ((player.loadingMode == C.LM_ONPLAY) &&
        !player._playLock) { // if play lock is set, we should just load an animation normally, since
                             // it was requested after the call to 'play', or else it was called by user
                             // FIXME: may be playLock was set by player and user calls this method
                             //        while some animation is already loading
        if (player._postponedLoad) throw new PlayerError(Errors.P.LOAD_WAS_ALREADY_POSTPONED);
        player._lastReceivedAnimationId = null;
        // this kind of postponed call is different from the ones below (_clearPostpones and _postpone),
        // since this one is related to loading mode, rather than calling later some methods which
        // were called during the process of loading (and were required to be called when it was finished).
        player._postponedLoad = [ object, duration, importer, callback ];
        player.stop();
        return;
    }

    // if player was loading resources already when .load() was called, inside the ._reset() method
    // postpones will be cleared and loaders cancelled

    if (!object) {
        player.anim = null;
        player._reset();
        player.stop();
        throw new PlayerError(Errors.P.NO_ANIMATION_PASSED);
    }

    if (!player.__canvasPrepared) throw new PlayerError(Errors.P.CANVAS_NOT_PREPARED);

    player._reset();

    state.happens = C.LOADING;
    player.fire(C.S_CHANGE_STATE, C.LOADING);

    var whenDone = function(result) {
        var anim = player.anim;
        if (player.handleEvents) {
            // checks inside if was already subscribed before, skips if so
            player.__subscribeDynamicEvents(anim);
        }
        var remotes = anim._collectRemoteResources(player);
        if (!remotes.length) {
            player.fire(C.S_LOAD, result);
            if (!player.handleEvents) player.stop();
            if (callback) callback.call(player, result);
            // player may appear already playing something if autoPlay or a similar time-jump
            // flag was set from some different source of options (async, for example),
            // then the rule (for the moment) is: last one wins
            if (player.autoPlay) {
                if (player.state.happens === C.PLAYING) player.stop();
                player.play();
            }
        } else {
            state.happens = C.RES_LOADING;
            player.fire(C.S_CHANGE_STATE, C.RES_LOADING);
            player.fire(C.S_RES_LOAD, remotes);
            // subscribe to wait until remote resources will be ready or failed
            resourceManager.subscribe(player.id, remotes, [ player.__defAsyncSafe(
                function(res_results, err_count) {
                    //if (err_count) throw new AnimErr(Errors.A.RESOURCES_FAILED_TO_LOAD);
                    if (player.anim === result) { // avoid race condition when there were two requests
                        // to load different animations and first one finished loading
                        // after the second one
                        player.state.happens = C.LOADING;
                        player.fire(C.S_CHANGE_STATE, C.LOADING);
                        player.fire(C.S_LOAD, result);
                        if (!player.handleEvents) player.stop();
                        player._callPostpones();
                        if (callback) callback.call(player, result);
                        // player may appear already playing something if autoPlay or a similar time-jump
                        // flag was set from some different source of options (async, for example),
                        // then the rule (for the moment) is: last one wins
                        if (player.autoPlay) {
                            if (player.state.happens === C.PLAYING) player.stop();
                            player.play();
                        }
                    }
                }
            ) ], (player.controlsEnabled && player.controls) ? function(url, factor, progress, errors) {
                player.controls.loadingProgress = progress;
                player.controls.loadingErrors = errors;
            } : null);
            // actually start loading remote resources
            anim._loadRemoteResources(player);
        }

    };
    whenDone = player.__defAsyncSafe(whenDone);

    /* TODO: configure canvas using clips bounds? */

    if (player.anim) {
        player.__unsubscribeDynamicEvents(player.anim);
        player.anim.traverse(function(elm) {
            elm.removeMaskCanvases();
        });
    }

    if (object) {

        if (object instanceof Animation) { // Animation instance
            player._loadTarget = C.LT_ANIMATION;
            Loader.loadAnimation(player, object, whenDone);
        } else if (is.arr(object) || (object instanceof Element)) { // array of elements
            player._loadTarget = C.LT_ELEMENTS;
            Loader.loadElements(player, object, whenDone);
        } else if (is.str(object)) { // URL
            var controls = player.controls;
            player._loadTarget = C.LT_URL;
            player._loadSrc = object;
            Loader.loadFromUrl(player, object, importer, whenDone);
        } else { // any object with importer
            player._loadTarget = C.LT_IMPORT;
            Loader.loadFromObj(player, object, importer, whenDone);
        }

    } else {
        player._loadTarget = C.LT_ANIMATION;
        player.anim = new Animation();
        whenDone(player.anim);
    }

    if (durationPassed) { // FIXME: move to whenDone?
        player.anim.duration = duration;
    }

    return player;
}

var __nextFrame = engine.getRequestFrameFunc(),
    __stopAnim  = engine.getCancelFrameFunc();
/**
 * @method play
 * @chainable
 *
 * Start playing current {@link anm.Animation animation} from the very start, or, if specified, some given time.
 *
 * @param {Number} [from]
 * @param {Number} [speed]
 * @param {Number} [stopAfter]
 *
 **/
Player.prototype.play = function(from, speed, stopAfter) {

    var player = this;

    player._ensureHasState();

    var state = player.state;

    if (state.happens === C.PLAYING) {
        if (player.infiniteDuration) return; // it's ok to skip this call if it's some dynamic animation (FIXME?)
        else throw new PlayerError(Errors.P.ALREADY_PLAYING);
    }

    if ((player.loadingMode === C.LM_ONPLAY) && !player._lastReceivedAnimationId) {
        if (player._playLock) return; // we already loading something
        // use _postponedLoad with _playLock flag set
        // call play when loading was finished
        player._playLock = true;
        var loadArgs = player._postponedLoad,
            playArgs = arguments;
        if (!loadArgs) throw new PlayerError(Errors.P.NO_LOAD_CALL_BEFORE_PLAY);
        var loadCallback = loadArgs[3];
        var afterLoad = function() {
            if (loadCallback) loadCallback.call(player, arguments);
            player._postponedLoad = null;
            player._playLock = false;
            player._lastReceivedAnimationId = player.anim.id;
            Player.prototype.play.apply(player, playArgs);
        };
        loadArgs[3] = afterLoad; // substitute callback with our variant which calls the previous one
        Player.prototype.load.apply(player, loadArgs);
        return;
    }

    if ((player.loadingMode === C.LM_ONREQUEST) &&
        (state.happens === C.RES_LOADING)) { player._postpone('play', arguments);
                                             return; } // if player loads remote resources just now,
                                                       // postpone this task and exit. postponed tasks
                                                       // will be called when all remote resources were
                                                       // finished loading

    // reassigns var to ensure proper function is used
    //__nextFrame = engine.getRequestFrameFunc();
    //__stopAnim = engine.getCancelFrameFunc();

    player._ensureHasAnim();

    var anim = player.anim;
    anim.reset();

    // used to resume playing in some special cases
    state.__lastPlayConf = [ from, speed, stopAfter ];

    state.from = from || 0;
    state.time = Player.NO_TIME;
    state.speed = (speed || 1) * (player.speed || 1) * (anim.speed || 1);
    state.stop = (typeof stopAfter !== 'undefined') ? stopAfter : state.stop;
    state.duration = player.inifiniteDuration ? Infinity
                     : (anim.duration || (anim.isEmpty() ? 0
                                                           : Animation.DEFAULT_DURATION));

    if (state.duration === undefined) throw new PlayerError(Errors.P.DURATION_IS_NOT_KNOWN);

    state.__startTime = Date.now();
    state.__redraws = 0;
    state.__rsec = 0;
    state.__prevt = 0;

    // this flags actually stops the animation,
    // __stopAnim is called just for safety reasons :)
    state.__supressFrames = false;

    if (state.happens === C.STOPPED && !player.repeating) {
        player.reportStats();
    }

    var ctx_props = engine.getAnmProps(player.ctx);
    ctx_props.factor = this.factor();

    state.happens = C.PLAYING;

    // FIXME: W3C says to call stopAnim (cancelAnimationFrame) with ID
    //        of the last call of nextFrame (requestAnimationFrame),
    //        not the first one, but some Mozilla / HTML5tutorials examples use ID
    //        of the first call. Anyway, __supressFrames stops our animation in fact,
    //        __stopAnim is called "to ensure", may be it's not a good way to ensure,
    //       though...
    state.__firstReq = Render.loop(player.ctx,
                                   player, anim,
                                   player.__beforeFrame(anim),
                                   player.__afterFrame(anim),
                                   player.__userBeforeRender,
                                   player.__userAfterRender);

    player.fire(C.S_CHANGE_STATE, C.PLAYING);
    player.fire(C.S_PLAY, state.from);

    return player;
};

/**
 * @method stop
 * @chainable
 *
 * Stop playing an {@link anm.Animation animation}.
 */
Player.prototype.stop = function() {
    /* if (state.happens === C.STOPPED) return; */

    var player = this;

    player._ensureHasState();

    var state = player.state;

    // if player loads remote resources just now,
    // postpone this task and exit. postponed tasks
    // will be called when all remote resources were
    // finished loading
    if ((state.happens === C.RES_LOADING) &&
        (player.loadingMode === C.LM_ONREQUEST)) {
        player._postpone('stop', arguments);
        return;
    }

    if ((state.happens === C.PLAYING) ||
        (state.happens === C.PAUSED)) {
        // this flags actually stops the animation,
        // __stopAnim is called just for safety reasons :)
        state.__supressFrames = true;
        __stopAnim(state.__firstReq);
    }

    state.time = Player.NO_TIME;
    state.from = 0;
    state.stop = Player.NO_TIME;

    var anim = player.anim;

    if (anim || ((player.loadingMode == C.LM_ONPLAY) &&
                   player._postponedLoad)) {
        state.happens = C.STOPPED;
        player._drawStill();
        player.fire(C.S_CHANGE_STATE, C.STOPPED);
    } else if (state.happens !== C.ERROR) {
        state.happens = C.NOTHING;
        if (!player.controls) player._drawSplash();
        player.fire(C.S_CHANGE_STATE, C.NOTHING);
    }

    player.fire(C.S_STOP);

    if (anim) anim.reset();

    return player;
};

/**
 * @method pause
 * @chainable
 *
 * Pause the {@link anm.Animation animation}, if playing.
 */
Player.prototype.pause = function() {
    var player = this;

    // if player loads remote resources just now,
    // postpone this task and exit. postponed tasks
    // will be called when all remote resources were
    // finished loading
    if ((player.state.happens === C.RES_LOADING) &&
        (player.loadingMode === C.LM_ONREQUEST)) {
        player._postpone('pause', arguments);
        return;
    }

    player._ensureHasState();
    player._ensureHasAnim();

    var state = player.state;
    if (state.happens === C.STOPPED) {
        throw new PlayerError(Errors.P.PAUSING_WHEN_STOPPED);
    }

    if (state.happens === C.PLAYING) {
        // this flags actually stops the animation,
        // __stopAnim is called just for safety reasons :)
        state.__supressFrames = true;
        __stopAnim(state.__firstReq);
    }

    if (state.time > state.duration) {
        state.time = state.duration;
    }

    state.from = state.time;
    state.happens = C.PAUSED;

    player.drawAt(state.time);

    player.fire(C.S_CHANGE_STATE, C.PAUSED);
    player.fire(C.S_PAUSE, state.time);

    return player;
};

/**
 * @method onerror
 *
 * Set a callback to be called on every error happened
 *
 * @param {Function} callback
 * @param {Error} callback.error
 */
Player.prototype.onerror = function(callback) {
    this.__err_handler = callback;

    return this;
};

// ### Inititalization
/* ------------------- */

provideEvents(Player, [ C.S_IMPORT, C.S_CHANGE_STATE, C.S_LOAD, C.S_RES_LOAD,
                        C.S_PLAY, C.S_PAUSE, C.S_STOP, C.S_COMPLETE, C.S_REPEAT,
                        C.S_ERROR ]);
Player.prototype._prepare = function(elm) {
    if (!elm) throw new PlayerError(Errors.P.NO_WRAPPER_PASSED);
    var wrapper_id, wrapper;
    if (is.str(elm)) {
        wrapper_id = elm;
        wrapper = engine.getElementById(wrapper_id);
        if (!wrapper_id) throw new PlayerError(utils.strf(Errors.P.NO_WRAPPER_WITH_ID, [wrapper_id]));
    } else {
        if (!elm.id) elm.id = ('anm-player-' + Player.__instances);
        wrapper_id = elm.id;
        wrapper = elm;
    }
    var assign_data = engine.assignPlayerToWrapper(wrapper, this, 'anm-player-' + Player.__instances);
    this.id = assign_data.id;
    this.wrapper = assign_data.wrapper;
    this.canvas = assign_data.canvas;
    if (!engine.checkPlayerCanvas(this.canvas)) throw new PlayerError(Errors.P.CANVAS_NOT_VERIFIED);
    this.ctx = engine.getContext(this.canvas, '2d');
    this.state = Player.createState(this);
    this.fire(C.S_CHANGE_STATE, C.NOTHING);

    this.subscribeEvents(this.canvas);

    this.__canvasPrepared = true;
};

Player.prototype._addOpts = function(opts) {
    this.debug =    is.defined(opts.debug)    ? opts.debug    : this.debug;
    this.repeat =   is.defined(opts.repeat)   ? opts.repeat   : this.repeat;
    this.autoPlay = is.defined(opts.autoPlay) ? opts.autoPlay : this.autoPlay;

    this.zoom =    opts.zoom || this.zoom;
    this.speed =   opts.speed || this.speed;
    this.bgColor = opts.bgColor || this.bgColor;
    this.width = opts.width || this.width;
    this.height = opts.height || this.height;

    this.ribbonsColor =
                   opts.ribbonsColor || this.ribbonsColor;
    this.thumbnailSrc = opts.thumbnail || this.thumbnailSrc;

    this.loadingMode = is.defined(opts.loadingMode) ?
                        opts.loadingMode : this.loadingMode;
    this.audioEnabled = is.defined(opts.audioEnabled) ?
                        opts.audioEnabled : this.audioEnabled;
    this.globalAudioVolume = is.defined(opts.globalAudioVolume) ?
                        opts.globalAudioVolume : this.globalAudioVolume;
    this.imagesEnabled = is.defined(opts.imagesEnabled) ?
                        opts.imagesEnabled : this.imagesEnabled;
    this.videoEnabled = is.defined(opts.videoEnabled) ?
                        opts.videoEnabled : this.videoEnabled;
    this.shadowsEnabled = is.defined(opts.shadowsEnabled) ?
                        opts.shadowsEnabled : this.shadowsEnabled;
    this.controlsEnabled = is.defined(opts.controlsEnabled) ?
                        opts.controlsEnabled : this.controlsEnabled;
    this.infoEnabled = is.defined(opts.infoEnabled) ?
                        opts.infoEnabled : this.infoEnabled;
    this.handleEvents = is.defined(opts.handleEvents) ?
                        opts.handleEvents : this.handleEvents;
    this.drawStill = is.defined(opts.drawStill) ?
                        opts.drawStill : this.drawStill;
    this.infiniteDuration = is.defined(opts.infiniteDuration) ?
                        opts.infiniteDuration : this.infiniteDuration;
    this.forceAnimationSize = is.defined(opts.forceAnimationSize) ?
                        opts.forceAnimationSize : this.forceAnimationSize;
    this.muteErrors = is.defined(opts.muteErrors) ?
                        opts.muteErrors : this.muteErrors;

    if (is.defined(opts.mode)) { this.mode(opts.mode); }
}
Player.prototype._checkOpts = function() {
    if (!this.canvas) return;

    if (!this.width || !this.height) {
        var cvs_size = engine.getCanvasSize(this.canvas);
        this.width = cvs_size[0];
        this.height = cvs_size[1];
    }

    this._resize(this.width, this.height);

    if (this.bgColor) engine.setCanvasBackground(this.canvas, this.bgColor);

    if (this.anim && this.handleEvents) {
        // checks inside if was already subscribed before, skips if so
        this.__subscribeDynamicEvents(this.anim);
    }

    if (this.controlsEnabled && !this.controls) {
        this._enableControls();
        if (this.infoEnabled) { // FIXME: allow using info without controls
            this._enableInfo();
        } else {
            this._disableInfo();
        }
    } else if (!this.controlsEnabled && this.controls) {
        this._disableInfo();
        this._disableControls();
    }

    if (this.ctx) {
        var props = engine.getAnmProps(this.ctx);
        props.skip_shadows = !this.shadowsEnabled;
    }

    if (this.thumbnailSrc) this.thumbnail(this.thumbnailSrc);
};

// initial state of the player, called from constuctor
Player.prototype._postInit = function() {
    this.stop();
    /* TODO: load some default information into player */
    var to_load = engine.hasUrlToLoad(this.wrapper);
    if (!to_load.url) to_load = engine.hasUrlToLoad(this.canvas);
    if (to_load.url) {
        var importer = null;
        if (to_load.importer_id && anm.importers.isAccessible(to_load.importer_id)) {
            importer = anm.importers.create(to_load.importer_id);
        }
        this.load(to_load.url, importer);
    }
};

/**
 * @method mode
 * @chainable
 *
 * Set player mode. Since it splits mode to separate properties, this method doesn't work
 * as getter.
 *
 * @param {Number} val `C.M_*` constant
 */
Player.prototype.mode = function(val) {
    if (!is.defined(val)) { throw new PlayerError("Please define a mode to set"); }
    this.infiniteDuration = (val & C.M_INFINITE_DURATION) || undefined;
    this.handleEvents = (val & C.M_HANDLE_EVENTS) || undefined;
    this.controlsEnabled = (val & C.M_CONTROLS_ENABLED) || undefined;
    this.infoEnabled = (val & C.M_INFO_ENABLED) || undefined;
    this.drawStill = (val & C.M_DRAW_STILL) || undefined;
    return this;
};

/**
 * @method rect
 * @chainable
 *
 * Get or change the rectangle Player owns at a page.
 *
 * @param {Object} [rect]
 * @param {Number} rect.x
 * @param {Number} rect.y
 * @param {Number} rect.width
 * @param {Number} rect.height
 *
 * @return {Object|anm.Player}
 */
Player.prototype.rect = function(rect) {
    if (!rect) return { x: this.x, y: this.y,
                        width: this.width, height: this.height };
    this.x = rect.x; this.y = rect.y;
    this.width = rect.width; this.height = rect.height;
    this._moveTo(rect.x, rect.y);
    this._resize(rect.width, rect.height);
    return this;
};

/* Player.prototype._rectChanged = function(rect) {
    var cur_w = this.state.width,
        cur_h = this.state.height;
    return (cur_w != rect.width) || (cur_w != rect.height) ||
           (cur.x != rect.x) || (cur.y != rect.y);
} */
/**
 * @method forceRedraw
 *
 * Force player to redraw controls and visuals according to current state
 */
Player.prototype.forceRedraw = function() {
    switch (this.state.happens) {
        case C.STOPPED: this.stop(); break;
        case C.PAUSED: if (this.anim) this.drawAt(this.state.time); break;
        case C.PLAYING: if (this.anim) { this._stopAndContinue(); } break;
        case C.NOTHING: if (!this.controls) this._drawSplash(); break;
        //case C.LOADING: case C.RES_LOADING: this._drawSplash(); break;
        //case C.ERROR: this._drawErrorSplash(); break;
    }
};

/**
 * @method drawAt
 *
 * Draw current {@link anm.Animation animation} at specified time
 *
 * @param {Number} time
 */
Player.prototype.drawAt = function(time) {
    if (time === Player.NO_TIME) throw new PlayerError(Errors.P.PASSED_TIME_VALUE_IS_NO_TIME);
    if ((this.state.happens === C.RES_LOADING) &&
        (this.loadingMode === C.LM_ONREQUEST)) { this._postpone('drawAt', arguments);
                                                   return; } // if player loads remote resources just now,
                                                             // postpone this task and exit. postponed tasks
                                                             // will be called when all remote resources were
                                                             // finished loading
    if ((time < 0) || (time > this.anim.duration)) {
        throw new PlayerError(utils.strf(Errors.P.PASSED_TIME_NOT_IN_RANGE, [time]));
    }
    var anim = this.anim,
        u_before = this.__userBeforeRender,
        u_after = this.__userAfterRender/*,
        after = function(gtime, ctx) {  // not used
            anim.reset();
            anim.__informEnabled = true;
            u_after(gtime, ctx);
        }*/;

    anim.reset();

    var ctx_props = engine.getAnmProps(this.ctx);
    ctx_props.factor = this.factor();

    anim.__informEnabled = false;
    Render.at(time, 0, this.ctx, this.anim, this.width, this.height, this.zoom, this.ribbonsColor, u_before, u_after);
    return this;
};

/**
 * @method size
 * @chainable
 *
 * Get or set and override Player width and height manually
 *
 * @param {Number} [width]
 * @param {Number} [height]
 *
 * @return {anm.Element|Array} width / height or the Element
 **/
Player.prototype.size = function(width, height) {
    if (!is.defined(width)) return [ this.width, this.height ];
    this.__userSize = [ width, height ];
    this._resize();
    return this;
};

/**
 * @method factor
 *
 * Returns the difference factor between player size and animation size,
 * using fit by largest side. _Does not_ count scene zoom, since it does not
 * affect player size. Also, _does not_ count screen pixel ratio.
 *
 * @return {Number} factor factor in range `0..1` or `undefined` if animation is not initialized
 */
Player.prototype.factor = function() {
    if (!this.anim) return undefined;
    if ((this.anim.width === this.width) &&
        (this.anim.height === this.height)) {
            return 1; // this.zoom ?
    } else {
        return Math.min(this.width / this.anim.width,
                        this.height / this.anim.height);
    }
}
/**
 * @method factorData
 *
 * Returns the data about how player will be resize due to difference between
 * player size and animation size.
 *
 * @return {Object} factor data or `undefined` if animation is not initialized
 * @return {Number} return.factor factor in range `0..1`
 * @return {Array} return.anim_rect coordinates of the rect where animation will be rendered
 * @return {Array} return.ribbon_one coordinates of the rect where first ribbon will be places, or null if factor=1
 * @return {Array} return.ribbon_two coordinates of the rect where second ribbon will be places, or null if factor=1
 */
Player.prototype.factorData = function() {
    if (!this.anim) return undefined;
    var result = utils.fit_rects(this.width, this.height,
                                 this.anim.width, this.anim.height);
    return {
        factor: result[0],
        anim_rect: result[1],
        ribbon_one: result[2] || null,
        ribbon_two: result[3] || null
    }
}
/**
 * @method thumbnail
 *
 * Allows to set thumbnail for a player, so player will show this image during the process of
 * loading an animation and when there's no animation was loaded inside.
 *
 * ...It's optional to specify `target_width`/`target_height`, especially if aspect ratio
 * of animation(s) that will be loaded into player matches to aspect ratio of player itself.
 * If not, `target_width` and `target_height`, if specified, are recommended to be equal
 * to a size of an animation(s) that will be loaded into player with this thumbnail;
 * so, since animation will be received later, and if aspect ratios of animation and player
 * does not match, both thumbnail and the animation will be drawn at a same position
 * with same black ribbons applied;
 *
 * If size will not be specified, player will try to match aspect ratio of an image to
 * show it without stretches, so if thumbnail image size matches to animation size has
 * the same aspect ratio as an animation, it is also ok to omit the size data here
 *
 * @param {String} url
 * @param {Number} [target_width]
 * @param {Number} [target_height]
 */
Player.prototype.thumbnail = function(url, target_width, target_height) {
    if (!url) return this.thumbnailSrc;
    var player = this;
    if (player.__thumb &&
        player.__thumb.src == url) return;
    if (player.ctx) { // FIXME: make this a function
      var ratio = engine.PX_RATIO,
          ctx = player.ctx;
      ctx.save();
      ctx.clearRect(0, 0, player.width * ratio, player.height * ratio);
      player._drawEmpty();
      ctx.restore();
    }
    var thumb = new Sheet(url);
    player.__thumbLoading = true;
    thumb.load(player.id, function() {
        player.__thumbLoading = false;
        player.__thumb = thumb;
        if (target_width || target_height) {
            player.__thumbSize = [ target_width, target_height ];
        }
        if ((player.state.happens !== C.PLAYING) &&
            (player.state.happens !== C.PAUSED)) {
            player._drawStill();
        }
    });
};

/**
 * @method detach
 *
 * Detach Player from the DOM — removes all the elements were create for
 * this Player instance.
 */
Player.prototype.detach = function() {
    if (!engine.playerAttachedTo(this.wrapper, this)) return; // throw error?
    this.stop();
    if (this.controls) this.controls.detach(this.wrapper);
    engine.detachPlayer(this);
    if (this.ctx) {
        engine.clearAnmProps(this.ctx);
    }
    this._reset();
    playerManager.fire(C.S_PLAYER_DETACH, this);
};

/**
 * @method attachedTo
 *
 * Check if this player was attached to a given element.
 *
 * @param {HTMLElement} canvas_or_wrapper
 */
Player.prototype.attachedTo = function(canvas_or_wrapper) {
    return engine.playerAttachedTo(canvas_or_wrapper, this);
};

/**
 * @method isAttached
 *
 * Check if player was attached to a DOM
 */
Player.prototype.isAttached = function() {
    return engine.playerAttachedTo(this.wrapper, this);
};

/**
 * @static @method attachedTo
 *
 * Check if this player was attached to a given element.
 *
 * @param {HTMLElement} canvas_or_wrapper
 * @param {anm.Player} player
 */
Player.attachedTo = function(canvas_or_wrapper, player) {
    return engine.playerAttachedTo(canvas_or_wrapper, player);
};

/**
 * @method invalidate
 *
 * Invalidates Player position in document
 */
Player.prototype.invalidate = function() {
    // TODO: probably, there's more to invalidate
    if (this.controls) this.controls.update(this.canvas);
};

Player.__invalidate = function(player) {
    return function(evt) {
        player.invalidate();
    };
};

/**
 * @method beforeFrame
 *
 * Call given function before rendering every frame during playing (when context was already modified for this frame)
 *
 * @param {Function} callback
 * @param {Number} callback.time
 * @param {Boolean} callback.return
 */
// TODO: change to before/after for events?
Player.prototype.beforeFrame = function(callback) {
    if (this.state.happens === C.PLAYING) throw new PlayerError(Errors.P.BEFOREFRAME_BEFORE_PLAY);
    this.__userBeforeFrame = callback;
};

/**
 * @method afterFrame
 *
 * Call given function after rendering every frame during playing (when context is still modified for this frame)
 *
 * @param {Function} callback
 * @param {Number} callback.time
 * @param {Boolean} callback.return
 */
Player.prototype.afterFrame = function(callback) {
    if (this.state.happens === C.PLAYING) throw new PlayerError(Errors.P.AFTERFRAME_BEFORE_PLAY);
    this.__userAfterFrame = callback;
};

/**
 * @method beforeRender
 *
 * Call given function before rendering every frame during playing (when context is not yet modified for this frame)
 *
 * @param {Function} callback
 * @param {Number} callback.time
 * @param {Canvas2DContext} callback.ctx
 */
Player.prototype.beforeRender = function(callback) {
    if (this.state.happens === C.PLAYING) throw new PlayerError(Errors.P.BEFORENDER_BEFORE_PLAY);
    this.__userBeforeRender = callback;
};

/**
 * @method afterRender
 *
 * Call given function after rendering every frame during playing (when context modications are rolled back)
 *
 * @param {Function} callback
 * @param {Number} callback.time
 * @param {Canvas2DContext} callback.ctx
 */
Player.prototype.afterRender = function(callback) {
    if (this.state.happens === C.PLAYING) throw new PlayerError(Errors.P.AFTERRENDER_BEFORE_PLAY);
    this.__userAfterRender = callback;
};

/**
 * @method subscribeEvents
 * @private
 *
 * Subscribe all the required events for given canvas.
 *
 * @param {Canvas} canvas
 */
Player.prototype.subscribeEvents = function(canvas) {
    var doRedraw = Player.__invalidate(this);
    engine.subscribeWindowEvents({
        load: doRedraw
    });
    engine.subscribeCanvasEvents(canvas, {
        mouseover: (function(player) {
                        return function(evt) {
                            if (global_opts.autoFocus &&
                                (player.handleEvents) &&
                                player.canvas) {
                                player.canvas.focus();
                            }
                            return true;
                        };
                    })(this),
        mouseout:   (function(player) {
                        return function(evt) {
                            if (global_opts.autoFocus &&
                                (player.handleEvents) &&
                                player.canvas) {
                                player.canvas.blur();
                            }
                            return true;
                        };
                    })(this)
    });
};

/**
 * @method toggleMute
 *
 * Disable or enable sound
 */
Player.prototype.toggleMute = function() {
    this.muted = !this.muted;
    if (!this.anim) {
        return;
    }
    this.anim.traverse(function(el) {
        if(el.$audio) {
            el.$audio.toggleMute();
        }
    });
};

Player.prototype._drawEmpty = function() {
    var ctx = this.ctx,
        w = this.width,
        h = this.height;

    ctx.save();

    var ratio = engine.PX_RATIO;
    // FIXME: somehow scaling context by ratio here makes all look bad

    // background
    ctx.fillStyle = Player.EMPTY_BG;
    ctx.fillRect(0, 0, w * ratio, h * ratio);
    ctx.strokeStyle = Player.EMPTY_STROKE;
    ctx.lineWidth = Player.EMPTY_STROKE_WIDTH;
    ctx.strokeRect(0, 0, w * ratio, h * ratio);

    ctx.restore();
};

// _drawStill decides if current player condition matches either to draw
// thumbnail image or a still frame at some time point
Player.prototype._drawStill = function() {
    // drawStill is a flag, while _drawStill is a method
    // since we have no hungarian notation is't treated as ok (for now)
    var player = this,
        state = player.state,
        anim = player.anim;
    if (player.drawStill) { // it's a flag!
        if (player.__thumb) {
            player._drawThumbnail();
        } else if (anim) {
            if (!player.infiniteDuration && is.finite(anim.duration)) {
                player.drawAt(anim.duration * Player.PREVIEW_POS);
            } else {
                player.drawAt(state.from);
            }
        }
    } else {
        player._drawEmpty();
    }
};

// _drawThumbnail draws a prepared thumbnail image, which is set by user
Player.prototype._drawThumbnail = function() {
    var thumb_bounds  = this.__thumbSize || this.__thumb.bounds(),
        thumb_width   = thumb_bounds.width,
        thumb_height  = thumb_bounds.height,
        player_width  = this.width,
        player_height = this.height,
        px_ratio      = engine.PX_RATIO;
    var ctx = this.ctx;
    ctx.save();
    if (px_ratio != 1) ctx.scale(px_ratio, px_ratio);
    if ((thumb_width  == player_width) &&
        (thumb_height == player_height)) {
        this.__thumb.apply(ctx);
    } else {
        var f_rects    = utils.fit_rects(player_width, player_height,
                                         thumb_width,  thumb_height),
            factor     = f_rects[0],
            thumb_rect = f_rects[1],
            rect1      = f_rects[2],
            rect2      = f_rects[3];
        if (rect1 || rect2) {
            ctx.fillStyle = this.ribbonsColor || '#000';
            if (rect1) ctx.fillRect(rect1[0], rect1[1],
                                    rect1[2], rect1[3]);
            if (rect2) ctx.fillRect(rect2[0], rect2[1],
                                    rect2[2], rect2[3]);
        }
        if (thumb_rect) {
            ctx.beginPath();
            ctx.rect(thumb_rect[0], thumb_rect[1],
                     thumb_rect[2], thumb_rect[3]);
            ctx.clip();
            ctx.translate(thumb_rect[0], thumb_rect[1]);
        }
        if (factor != 1) ctx.scale(factor, factor);
        this.__thumb.apply(ctx);
    }
    ctx.restore();
};

// _drawSplash draws splash screen if there is no animation loaded in the player
// or the animation is inaccessible; if there is a preloaded thumbnail accessible,
// it applies the thumbnail instead
Player.prototype._drawSplash = function() {
    if (this.controls) return;

    if (this.__thumbLoading) return;

    if (this.__thumb && this.drawStill) {
        this._drawThumbnail();
        return;
    }
};

Player.prototype._drawLoadingSplash = function(text) {
    if (this.controls) return;
    this._drawSplash();
    var ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#006';
    ctx.font = '12px sans-serif';
    ctx.fillText(text || Strings.LOADING, 20, 25);
    ctx.restore();
};

Player.prototype._drawLoadingProgress = function() {
    // Temporarily, do nothing.
    // Later we will show a line at the top, may be

    /* if (this.controls) return;
    var theme = Controls.THEME;
    Controls._runLoadingAnimation(this.ctx, function(ctx) {
        var w = ctx.canvas.clientWidth,
            h = ctx.canvas.clientHeight;
        // FIXME: render only changed circles
        ctx.clearRect(0, 0, w, h);
        //Controls._drawBack(ctx, theme, w, h);
        Controls._drawLoadingProgress(ctx, w, h,
                                      (((Date.now() / 100) % 60) / 60),
                                      theme.radius.loader,
                                      theme.colors.progress.left, theme.colors.progress.passed);
    }); */
};

Player.prototype._stopDrawingLoadingCircles = function() {
    if (this.controls) return;
    this._drawEmpty();
};

Player.prototype._drawErrorSplash = function(e) {
    if (!this.canvas || !this.ctx) return;
    if (this.controls) {
        return;
    }
    this._drawSplash();
    var ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#006';
    ctx.font = '14px sans-serif';
    ctx.fillText(Strings.ERROR +
                 (e ? ': ' + (e.message || (typeof Error))
                    : '') + '.', 20, 25);
    ctx.restore();
};

/**
 * @method toString
 *
 * @return a nice string
 */
Player.prototype.toString = function() {
    return "[ Player '" + this.id + "' ]"; // "' m-" + this.mode + " ]";
};

// reset player to initial state, called before loading any animation
Player.prototype._reset = function() {
    var state = this.state;
    // clear postponed tasks if player started to load remote resources,
    // they are not required since new animation is loading in the player now
    // or it is being detached
    if ((this.loadingMode === C.LM_ONREQUEST) &&
        (state.happens === C.RES_LOADING)) {
        this._clearPostpones();
        resourceManager.cancel(this.id);
    }
    state.happens = C.NOTHING;
    state.from = 0;
    state.time = Player.NO_TIME;
    state.duration = undefined;
    this.fire(C.S_CHANGE_STATE, C.NOTHING);
    if (this.controls) this.controls.reset();
    this.ctx.clearRect(0, 0, this.width * engine.PX_RATIO,
                             this.height * engine.PX_RATIO);
    /*this.stop();*/
};

Player.prototype._stopAndContinue = function() {
    //state.__lastPlayConf = [ from, speed, stopAfter ];
    var state = this.state,
        last_conf = state.__lastPlayConf;
    var stoppedAt = state.time;
    this.stop();
    this.play(stoppedAt, last_conf[1], last_conf[2]);
};

// FIXME: moveTo is not moving anything for the moment
Player.prototype._moveTo = function(x, y) {
    engine.setCanvasPosition(this.canvas, x, y);
};

Player.prototype._resize = function(width, height) {
    var cvs = this.canvas,
        new_size = this.__userSize || [ width, height ],
        cur_size = engine.getCanvasParameters(cvs);
    if (cur_size && (cur_size[0] === new_size[0]) && (cur_size[1] === new_size[1])) return;
    if (!new_size[0] || !new_size[1]) {
        new_size = cur_size;
    };
    engine.setCanvasSize(cvs, new_size[0], new_size[1]);
    this.width = new_size[0];
    this.height = new_size[1];
    engine.updateCanvasOverlays(cvs);
    if (this.ctx) {
        var ctx_props = engine.getAnmProps(this.ctx);
        ctx_props.factor = this.factor();
    }
    if (this.controls) this.controls.handleAreaChange();
    this.forceRedraw();
    return new_size;
};

Player.prototype._restyle = function(bg) {
    engine.setCanvasBackground(this.canvas, bg);
    this.forceRedraw();
};

// FIXME: methods below may be removed, but they are required for tests
Player.prototype._enableControls = function() {
    if (!this.controls) this.controls = new Controls(this);
    // if (this.state.happens === C.NOTHING) { this._drawSplash(); }
    // if ((this.state.happens === C.LOADING) ||
    //     (this.state.happens === C.RES_LOADING)) { this._drawLoadingSplash(); }
    this.controls.enable();
};

Player.prototype._disableControls = function() {
    if (!this.controls) return;
    this.controls.disable();
    this.controls = null;
};

Player.prototype._enableInfo = function() {
    if (!this.controls) return;
    this.controls.enableInfo();
};

Player.prototype._disableInfo = function() {
    if (!this.controls) return;
    this.controls.disableInfo();
};

Player.prototype.__subscribeDynamicEvents = function(anim) {
    if (global_opts.setTabindex) {
        engine.setTabIndex(this.canvas, this.__instanceNum);
    }
    if (anim) {
        var subscribed = false;
        if (!this.__boundTo) {
            this.__boundTo = [];
        } else {
            for (var i = 0, ix = this.__boundTo, il = ix.length; i < il; i++) {
                if ((anim.id === ix[i][0]) &&
                    (this.canvas === ix[i][1])) {
                    subscribed = true;
                }
            }
        }
        if (!subscribed) {
            this.__boundTo.push([ anim.id, this.canvas ]);
            anim.subscribeEvents(this.canvas);
        }
    }
};

Player.prototype.__unsubscribeDynamicEvents = function(anim) {
    if (global_opts.setTabindex) {
        engine.setTabIndex(this.canvas, undefined);
    }
    if (anim) {
        if (!this.__boundTo) return;
        var toRemove = -1;
        for (var i = 0, ix = this.__boundTo, il = ix.length; i < il; i++) {
            if (anim.id === ix[i][0]) {
                toRemove = i;
                anim.unsubscribeEvents(ix[i][1]);
            }
        }
        if (toRemove >= 0) {
            this.__boundTo.splice(toRemove, 1);
        }
    }
};

Player.prototype._ensureHasState = function() {
    if (!this.state) throw new PlayerError(Errors.P.NO_STATE);
};

Player.prototype._ensureHasAnim = function() {
    if (!this.anim) throw new PlayerError(Errors.P.NO_ANIMATION);
};

Player.prototype.__beforeFrame = function(anim) {
    return (function(player, state, anim, callback) {
        return function(time) {
            anim.clearAllLaters();
            if (state.happens !== C.PLAYING) return false;
            if (((state.stop !== Player.NO_TIME) &&
                 (time >= (state.from + state.stop))) ||
                 (is.finite(state.duration) &&
                    (time > (state.duration + Player.PEFF)))) {
                player.fire(C.S_COMPLETE);
                state.time = 0;
                anim.reset();
                player.stop();
                if (player.repeat || anim.repeat) {
                   player.repeating = true;
                   player.play();
                   player.fire(C.S_REPEAT);
               } else if (!player.infiniteDuration &&
                       is.finite(state.duration)) {
                   player.drawAt(state.duration);
                }
                return false;
            }
            if (callback) callback(time, player.ctx);
            return true;
        };
    })(this, this.state, anim, this.__userBeforeFrame);
};

Player.prototype.__afterFrame = function(anim) {
    return (function(player, state, anim, callback) {
        return function(time) {
            if (callback) callback(time);

            anim.invokeAllLaters();
            return true;
        };
    })(this, this.state, anim, this.__userAfterFrame);
};

// Called when any error happens during player initialization or animation
// Player should mute all non-system errors by default, and if it got a system error, it may show
// this error over itself
Player.prototype.__onerror = function(err) {
  var player = this;
  var doMute = player.muteErrors;
      doMute = doMute && !(err instanceof SystemError);

  try {
      if (player.state) player.state.happens = C.ERROR;
      player.__lastError = err;
      player.fire(C.S_CHANGE_STATE, C.ERROR);
      player.fire(C.S_ERROR, err);

      player.anim = null;
      // was here: /*if (player.state)*/ player.__unsafe_stop();
  } catch(e) { throw new SystemError(utils.strf(Errors.S.ERROR_HANDLING_FAILED, [err.message || err])); }

  try {
      if (player.state &&
          ((player.state.happens != C.NOTHING) ||
           (player.state.happens != C.STOPPED))) {
          player.__unsafe_stop();
      }
  } catch(e) { /* skip this error, it's ok just to fail to stop */ }

  doMute = (this.__err_handler && this.__err_handler(err)) || doMute;

  if (!doMute) {
      try { this._drawErrorSplash(err); } catch(e) { /* skip errors in splash */ }
      throw err;
  }
};

Player.prototype.__callSafe = function(f) {
  try {
    return f.call(this);
  } catch(err) {
    this.__onerror(err);
  }
};

// safe call generator for player method (synchronous calls)
Player.prototype.__defSafe = function(method_f) {
  var player = this;
  return function() {
    var args = arguments;
    if (!this.__safe_ctx) { // already in safe context
      this.__safe_ctx = true;
      try {
        var ret_val = player.__callSafe(function() {
          return method_f.apply(player, args);
        });
        this.__safe_ctx = false;
        return ret_val;
      } catch(err) {
        this.__safe_ctx = false;
        throw err;
      }
    } else {
      return method_f.apply(player, args);
    }
  };
};

// safe call generator for asycnhronous function
Player.prototype.__defAsyncSafe = function(func) {
  var player = this;
  return function() {
    var args = arguments;
    try {
      var ret_val = player.__callSafe(function() {
        return func.apply(player, args);
      });
      return ret_val;
    } catch(err) {
      throw err;
    }
  };
};

Player.prototype.__makeSafe = function(methods) {
  var player = this;
  for (var i = 0, il = methods.length; i < il; i++) {
    var method = methods[i];
    if (!player[method]) throw new SystemError(utils.strf(Errors.S.NO_METHOD_FOR_PLAYER, [method]));
    player['__unsafe_'+method] = player[method];
    player[method] = player.__defSafe(player[method]);
  }
};

Player.prototype.handle__x = function(type, evt) {
    if (this.anim) this.anim.fire(type, this);
    return true;
};

Player.prototype._clearPostpones = function() {
    this._queue = [];
};

Player.prototype._postpone = function(method, args) {
    if (!this._queue) this._queue = [];
    this._queue.push([ method, args ]);
};

Player.prototype._callPostpones = function() {
    if (this._queue && this._queue.length) {
        var q = this._queue, spec;
        for (var i = 0, il = q.length; i < il; i++) {
          spec = q[i]; this[spec[0]].apply(this, spec[1]);
        }
    }
    this._queue = [];
};

var prodHost = 'animatron.com',
    testHost = 'animatron-test.com',
    prodStatUrl = '//api.' + prodHost + '/stats/report/',
    testStatUrl = '//api.' + testHost + '/stats/report/';

Player.prototype.reportStats = function() {
    // currently, notifies only about playing start
    if (!this.anim || !this.anim.meta || !this.anim.meta._anm_id) return;
    if (!this.statImg) {
      this.statImg = engine.createStatImg();
    }
    var loadSrc = this._loadSrc,
        id = this.anim.meta._anm_id,
        locatedAtTest = false,
        locatedAtProd = false;

    if (loadSrc) {
        //if the player was loaded from a snapshot URL, we check the said url
        //to see if it is from our servers
        locatedAtTest = loadSrc.indexOf(testHost) !== -1;
        locatedAtProd = loadSrc.indexOf(prodHost) !== -1;
    } else if(window && window.location) {
        //otherwise, we check if we are on an Animatron's webpage
        var hostname = window.location.hostname;
        locatedAtTest = hostname.indexOf(testHost) !== -1;
        locatedAtProd = hostname.indexOf(prodHost) !== -1;
    }
    if (locatedAtTest) {
        this.statImg.src = testStatUrl + id + '?' + Math.random();
    } else if (locatedAtProd) {
        this.statImg.src = prodStatUrl + id + '?' + Math.random();
    }
};

/* Player.prototype.__originateErrors = function() {
    return (function(player) { return function(err) {
        return player._fireError(err);
    }})(this);
} */

/**
 * @deprecated
 * @static @private @method createState
 *
 * Create a state for current player instance.
 *
 * @return {Object} Player state
 */
Player.createState = function(player) {
    // Player state contains only things that actually change while playing an animation,
    // it's current time, time when player started to play or was stopped at,
    // happens reflects what player does now, `afps` is actual FPS.
    return {
        'happens': C.NOTHING,
        'time': Player.NO_TIME, 'from': 0, 'stop': Player.NO_TIME,
        'afps': 0, 'speed': 1,
        'duration': undefined,
        '__startTime': -1,
        '__redraws': 0, '__rsec': 0
        /*'__drawInterval': null*/
    };
};

/**
 * @static @method forSnapshot
 *
 * Load an {@link anm.Animation animation} from a JSON located at some remote URL.
 *
 * @param {HTMLElement|String} elm DOM Element ID or the DOM Element itself
 * @param {String} snapshot_url URL of a JSON
 * @param {anm.Importer} importer an importer which knows how to convert given JSON to an {@link anm.Animation animation} instance
 * @param {Function} [callback]
 * @param {anm.Animation} callback.animation
 * @param {Object} [opts] see {@link anm.Player#init} for the description of possible options
 */
Player.forSnapshot = function(elm_id, snapshot_url, importer, callback, alt_opts) {
    var player = new Player();
    player.init(elm_id, alt_opts);
    player.load(snapshot_url, importer, callback);
    return player;
};

Player.prototype._applyUrlParamsToAnimation = function(params) {
    // NB: this metod is intended to be called only after some animation was loaded completely
    //     into player, some URL parameters are loaded into player `options` object and applied
    //     before getting any animation, but it's done using `_optsFromUrlParams` method.

    // these values (t, from, p, still) may be 0 and it's a proper value,
    // so they require a check for undefined separately

    // player may appear already playing something if autoPlay or a similar time-jump
    // flag was set from some different source of options (async, for example),
    // then the rule (for the moment) is: last one wins

    if (is.defined(params.t)) {
        if (this.state.happens === C.PLAYING) this.stop();
        this.play(params.t / 100);
    } else if (is.defined(params.from)) {
        if (this.state.happens === C.PLAYING) this.stop();
        this.play(params.from / 100);
    } else if (is.defined(params.p)) {
        if (this.state.happens === C.PLAYING) this.stop();
        this.play(params.p / 100).pause();
    } else if (is.defined(params.at)) {
        if (this.state.happens === C.PLAYING) this.stop();
        this.play(params.at / 100).pause();
    }
};

module.exports = Player;

},{"./animation/animation.js":1,"./animation/element.js":4,"./conf.js":8,"./constants.js":9,"./errors.js":10,"./events.js":11,"./global_opts.js":12,"./graphics/sheet.js":18,"./loader.js":21,"./loc.js":22,"./log.js":23,"./player_manager.js":28,"./render.js":29,"./resource_manager.js":30,"./ui/controls.js":31,"./utils.js":34,"engine":35}],28:[function(require,module,exports){
// Player manager
// -----------------------------------------------------------------------------
var events = require('./events.js'),
    C = require('./constants.js'),
    engine = require('engine');

/**
 * @singleton @class anm.PlayerManager
 *
 * Manages all the player instances on a page.
 *
 * To subscribe to a new player creation event, use:
 *
 * `anm.PlayerManager.on(C.S_NEW_PLAYER, function(player) { ... })`
 *
 * To subsribe to a player removal event, use:
 *
 * `anm.PlayerManager.on(C.S_PLAYER_DETACH, function(player) { ... })`
 */
function PlayerManager() {
    this.hash = {};
    this.instances = [];
    this._initHandlers();
}

events.provideEvents(PlayerManager, [ C.S_NEW_PLAYER, C.S_PLAYER_DETACH ]);

PlayerManager.prototype.handle__x = function(evt, player) {
    if (evt == C.S_NEW_PLAYER) {
        this.hash[player.id] = player;
        this.instances.push(player);
    }
    return true;
};

/**
 * @method getPlayer
 *
 * Find a player on a page using an ID of its wrapper.
 *
 * @param {String} id ID of a player to find
 * @return {anm.Player}
 */
PlayerManager.prototype.getPlayer = function(cvs_id) {
    return this.hash[cvs_id];
};

/**
 * @method handleDocumentHiddenChange
 * @private
 *
 * Pause players when the browser tab becomes hidden and resume them otherwise
 *
 * @param {bool} whether the tab is hidden
 */
PlayerManager.prototype.handleDocumentHiddenChange = function(hidden) {
    var i, player;
    for(i=0;i<this.instances.length;i++) {
        player = this.instances[i];
        if (hidden && player.state.happens === C.PLAYING) {
            player._pausedViaHidden = true;
            player.pause();
        } else if (!hidden && player._pausedViaHidden) {
            player._pausedViaHidden = false;
            player.play(player.state.from);
        }
    }
};

var manager = new PlayerManager();
engine.onDocumentHiddenChange(function(hidden) {
    manager.handleDocumentHiddenChange(hidden);
});

module.exports = manager;

},{"./constants.js":9,"./events.js":11,"engine":35}],29:[function(require,module,exports){
var C = require('./constants.js');

var Painter = require('./animation/painter.js'),
    Modifier = require('./animation/modifier.js');

var Brush = require('./graphics/brush.js');

var engine = require('engine'),
    nextFrame = engine.getRequestFrameFunc();

var fit_rects = require('./utils.js').fit_rects;

// Rendering
// -----------------------------------------------------------------------------

var Render = {}; // means "Render", render loop + system modifiers & painters

// functions below, the ones named in a way like `__r_*` are the real functions
// acting under their aliases `Render.*`; it is done this way because probably
// the separate function which is not an object propertly, will be a bit faster to
// access during animation loop

// draws current state of animation on canvas and postpones to call itself for
// the next time period (so to start animation, you just need to call it once
// when the first time must occur and it will chain its own calls automatically)
function r_loop(ctx, player, anim, before, after, before_render, after_render) {

    var pl_state = player.state;

    if (pl_state.happens !== C.PLAYING) return;

    var msec = (Date.now() - pl_state.__startTime);
    var sec = msec / 1000;

    var time = (sec * pl_state.speed) + pl_state.from,
        dt = time - pl_state.__prevt;
    pl_state.time = time;
    pl_state.__dt = dt;
    pl_state.__prevt = time;

    if (before) {
        if (!before(time)) return;
    }

    if (pl_state.__rsec === 0) pl_state.__rsec = msec;
    if ((msec - pl_state.__rsec) >= 1000) {
        pl_state.afps = pl_state.__redraws;
        pl_state.__rsec = msec;
        pl_state.__redraws = 0;
    }
    pl_state.__redraws++;

    r_at(time, dt, ctx, anim,
           player.width, player.height, player.zoom, player.ribbonsColor,
           before_render, after_render);

    // show fps
    if (player.debug) {
        r_fps(ctx, pl_state.afps, time);
    }

    if (after) {
        if (!after(time)) return;
    }

    if (pl_state.__supressFrames) return;

    return nextFrame(function() {
        r_loop(ctx, player, anim, before, after, before_render, after_render);
    });
}

function r_at(time, dt, ctx, anim, width, height, zoom, rib_color, before, after) {
    ctx.save();
    var ratio = engine.PX_RATIO;
    if (ratio !== 1) ctx.scale(ratio, ratio);
    width = width | 0;
    height = height | 0;
    var size_differs = (width  != anim.width) ||
                       (height != anim.height);
    if (!size_differs) {
        try {
            ctx.clearRect(0, 0, anim.width,
                                anim.height);
            if (before) before(time, ctx);
            if (zoom != 1) ctx.scale(zoom, zoom);
            anim.render(ctx, time, dt);
            if (after) after(time, ctx);
        } finally { ctx.restore(); }
    } else {
        r_with_ribbons(ctx, width, height,
                            anim.width, anim.height,
                            rib_color,
            function(_scale) {
                try {
                  ctx.clearRect(0, 0, anim.width, anim.height);
                  if (before) before(time, ctx);
                  if (zoom != 1) ctx.scale(zoom, zoom);
                  anim.render(ctx, time, dt);
                  if (after) after(time, ctx);
                } finally { ctx.restore(); }
            });
    }
}

function r_with_ribbons(ctx, pw, ph, aw, ah, color, draw_f) {
    // pw == player width, ph == player height
    // aw == anim width,   ah == anim height
    var f_rects   = fit_rects(pw, ph, aw, ah),
        factor    = f_rects[0],
        anim_rect = f_rects[1],
        rect1     = f_rects[2],
        rect2     = f_rects[3];
    ctx.save();
    if (rect1 || rect2) {
        ctx.save();
        ctx.fillStyle = color || '#000';
        if (rect1) {
            ctx.clearRect(rect1[0], rect1[1],
                          rect1[2], rect1[3]);
            ctx.fillRect(rect1[0], rect1[1],
                         rect1[2], rect1[3]);
        }
        if (rect2) {
            ctx.clearRect(rect2[0], rect2[1],
                          rect2[2], rect2[3]);
            ctx.fillRect(rect2[0], rect2[1],
                         rect2[2], rect2[3]);
        }
        ctx.restore();
    }
    if (anim_rect) {
        ctx.beginPath();
        ctx.rect(anim_rect[0], anim_rect[1],
                 anim_rect[2], anim_rect[3]);
        ctx.clip();
        ctx.translate(anim_rect[0], anim_rect[1]);
    }
    if (factor != 1) ctx.scale(factor, factor);
    draw_f(factor);
    ctx.restore();
}

function r_fps(ctx, fps, time) {
    ctx.fillStyle = '#999';
    ctx.font = '20px sans-serif';
    ctx.fillText(Math.floor(fps), 8, 20);
    ctx.font = '10px sans-serif';
    ctx.fillText(Math.floor(time * 1000) / 1000, 8, 35);
}

Render.loop = r_loop;
Render.at = r_at;
Render.drawFPS = r_fps;

// SYSTEM PAINTERS

Render.p_drawVisuals = new Painter(function(ctx) { this.applyVisuals(ctx); }, C.PNT_SYSTEM);

Render.p_applyAComp = new Painter(function(ctx) { this.applyAComp(ctx); }, C.PNT_SYSTEM);

// DEBUG PAINTERS

// TODO: also move into Element class

Render.p_drawPivot = new Painter(function(ctx, pivot) {
    if (!(pivot = pivot || this.$pivot)) return;
    var my_bounds = this.myBounds();
    var stokeStyle = this.isEmpty() ? '#600' : '#f00';
    ctx.save();
    if (bounds) {
        ctx.translate(pivot[0] * my_bounds.width,
                      pivot[1] * my_bounds.height);
    }
    ctx.beginPath();
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = stokeStyle;
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 0);
    ctx.moveTo(3, 0);
    //ctx.moveTo(0, 5);
    ctx.arc(0,0,3,0,Math.PI*2,true);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}, C.PNT_DEBUG);

Render.p_drawReg = new Painter(function(ctx, reg) {
    if (!(reg = reg || this.$reg)) return;
    ctx.save();
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = '#00f';
    ctx.fillStyle = 'rgba(0,0,255,.3)';
    ctx.translate(reg[0], reg[1]);
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(4, -4);
    ctx.lineTo(4, 4);
    ctx.lineTo(-4, 4);
    ctx.lineTo(-4, -4);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 0);
    ctx.moveTo(3, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}, C.PNT_DEBUG);

Render.p_drawName = new Painter(function(ctx, name) {
    if (!(name = name || this.name)) return;
    ctx.save();
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.fillText(name, 0, 10);
    ctx.restore();
}, C.PNT_DEBUG);

Render.p_drawMPath = new Painter(function(ctx, mPath) {
    if (!(mPath = mPath || this.$mpath)) return;
    ctx.save();
    //var s = this.$.astate;
    //Render.p_usePivot.call(this.xdata, ctx);
    Brush.qstroke(ctx, '#600', 2.0);
    //ctx.translate(-s.x, -s.y);
    //ctx.rotate(-s.angle);
    ctx.beginPath();
    mPath.apply(ctx);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}, C.PNT_DEBUG);

Render.m_checkBand = new Modifier(function(time, duration, band) {
    if (band[0] > (duration * time)) return false; // exit
    if (band[1] < (duration * time)) return false; // exit
}, C.MOD_SYSTEM);

module.exports = Render;

},{"./animation/modifier.js":5,"./animation/painter.js":6,"./constants.js":9,"./graphics/brush.js":14,"./utils.js":34,"engine":35}],30:[function(require,module,exports){
// Resource manager
// -----------------------------------------------------------------------------

// .subscribe() allows to subscribe to any number of urls and to execute a callback (or few) when
//              there is a known status for each one of them (received or failed);
//              callback receives an array of results of length equal to the given urls array
//              and with null in place of urls which were failed to receive, and it receives total
//              failure count;
//
// .loadOrGet() should be called for every remote resource Resource Manager should be aware of;
//              it receives a loader function that actually should request for that resource in any way
//              it wants to (async or not), but should call provided success handler in case of success
//              or error handler in case of failure; `subject_id` should be the same as for corresponding
//              subscribe group (it's the only way we currently found to ensure to unsubscribe loaders
//              from single subject, instead of all, in case of cancel);
//
// .check() is the internal function that iterates through all subscriptions, checks the status
//          of the urls and calls the subscribed callbacks in case if their resources are ready;
//          it is called by Resource Manager itself in cases when there was a chance that some resource
//          changed status;
//
// .trigger() notifies Resource Manager about the fact that resource located at given URL was successfully
//            received and provides it the received value; may be called from outside; forces .check() call;
//
// .error() notifies Resource Manager about the fact that resource expected to be located at some URL
//          was failed to be received and provides it the error object as a cause of the failure;
//          may be called from outside; forces .check() call;
//
// .has() checks if the resource with given URL is stored in Resource Manager's cache (was received before);
//
// .clear() clears all the subscriptions from this subject;

// The system designed with intention (but not restricted to it) that any player will first subscribe (using its ID)
// to all remote resources from current animation, then trigger them to load with multiple .loadOrGet() calls (with passing
// the same ID). In .loadOrGet() it should call .trigger() or .error() for a resource in appropriate case.
// If player needs to stop loading remote resources (i.e. if animation was accidentally changed when it
// already started but nor finished loading them, or if it was required to be detached at some point in-between),
// it should call .cancel() with its ID.
// NB: Notice, that no check is performed just after subscription! Because if new player instance will request resource
//     which is in cache thanks to previous instance, its own loader (.loadOrGet()) will not be called!

// FIXME: loader in .loadOrGet() should call trigger() and error() instead of notifiers
// FIXME: get rid of subject_id in .loadOrGet(), it requires to pass player or animation everywhere inside
//        (may be in favor of subscriptions groups and generating ID automatically inside)
//        the main pitfall here is that sheet.load or audio.load requires player as an argument

var conf = require('./conf.js'),
    log = require('./log.js'),
    is = require('./utils.js').is;

function rmLog(str) {
  if (conf.logResMan) {
    log.debug(str);
  }
}

/**
 * @singleton @class anm.ResourceManager
 */
function ResourceManager() {
    this._cache = {};
    this._errors = {};
    this._waiting = {};
    this._subscriptions = {};
    this._onprogress = {}; // optional loading progress listeners
    this._url_to_subjects = {};
}

ResourceManager.prototype.subscribe = function(subject_id, urls, callbacks, onprogress) {
    if (!subject_id) throw new Error('Subject ID is empty');
    if (this._subscriptions[subject_id]) throw new Error('This subject (\'' + subject_id + '\') is already subscribed to ' +
                                                         'a bunch of resources, please group them in one.');

    var filteredUrls = [];
    rmLog('subscribing ' + callbacks.length + ' to ' + urls.length + ' urls: ' + urls);
    var test = {}; // FIXME: a very dirty way to test if urls duplicate, needs to be optimized
    for (var i = 0; i < urls.length; i++){
        // there should be no empty urls and duplicates
        if (urls[i] && !test[urls[i]]) {
            test[urls[i]] = true;
            filteredUrls.push(urls[i]);
            if (!this._url_to_subjects[urls[i]]) {
                this._url_to_subjects[urls[i]] = [];
            }
            this._url_to_subjects[urls[i]].push(subject_id);
        }
    }
    rmLog('filtered from ' + urls.length + ' to ' + filteredUrls.length);
    this._subscriptions[subject_id] = [ filteredUrls,
                                        is.arr(callbacks) ? callbacks : [ callbacks ] ];
    if (onprogress) {
        this._onprogress[subject_id] = (function(f_urls) {
            var summary = {};
            var count = f_urls.length,
                per_url = 1 / count;
            var sum = 0,
                err = 0;
            return function(url, factor) {
                // incoming factor value should be in range 0..1 for this particular url,
                // where 0 is not-even-started to load, and 1 is complete loading
                var prev = summary[url] || 0;
                if (factor !== -1) { // -1 means error
                    sum += (factor - prev) * per_url;
                    summary[url] = factor;
                } else {
                    sum -= prev;
                    err += prev;
                }
                onprogress(url, factor, sum, err);
            };
        })(filteredUrls);
    }
};

ResourceManager.prototype.loadOrGet = function(subject_id, url, loader, onComplete, onError) {
    var me = this;
    if (!subject_id) throw new Error('Subject ID is empty');
    if (!url) throw new Error('Given URL is empty');
    var progress_f = me._onprogress[subject_id];
    rmLog('request to load ' + url);
    if (me._cache[url]) {
        rmLog('> already received, trigerring success');
        var result = me._cache[url];
        if (onComplete) onComplete(result);
        me.trigger(url, result); // TODO: is it needed?
        if (progress_f) progress_f(url, 1);
    } else if (me._errors[url]) {
        rmLog('> failed to load before, notifying with error');
        if (onError) onError(me._errors[url]);
        if (progress_f) progress_f(url, -1);
    } else if (!me._waiting[subject_id] ||
               !(me._waiting[subject_id] && me._waiting[subject_id][url])) {
        rmLog('> not cached, requesting');
        if (!me._waiting[subject_id]) me._waiting[subject_id] = {};
        me._waiting[subject_id][url] = loader;
        loader(function(result) {
            result = result || true; //so that the loader isn't obliged to return something
            rmLog('file at ' + url + ' succeeded to load, triggering success');
            me.trigger(url, result);
            if (onComplete) onComplete(result);
            if (progress_f) progress_f(url, 1);
            me.check();
        }, function(err) {
            rmLog('file at ' + url + ' failed to load, triggering error');
            me.error(url, err);
            if (onError) onError(err);
            if (progress_f) progress_f(url, -1);
            me.check();
        }, progress_f ? function(factor) {
            progress_f(url, factor);
        } : function() {});
    } else /*if (me._waiting[subject_id] && me._waiting[subject_id][url])*/ { // already waiting
        rmLog('> someone is already waiting for it, subscribing');
        var new_id = subject_id + (new Date()).getTime() + Math.random();
        me._onprogress[new_id] = me._onprogress[subject_id];
        me.subscribe(new_id, [ url ], function(res) {
            if (res[0]) { onComplete(res[0]); if (progress_f) progress_f(url, 1); }
            else { onError(res[0]); if (progress_f) progress_f(url, -1);}
        });

    }
};

ResourceManager.prototype.trigger = function(url, value) {
    if (this._cache[url] || this._errors[url]) { this.check(); return; }
    rmLog('triggering success for url ' + url);
    var subjects = this._url_to_subjects[url];
    if (subjects) { for (var i = 0, il = subjects.length; i < il; i++) {
        if (this._waiting[subjects[i]]) {
            delete this._waiting[subjects[i]][url];
        }
    } }
    this._cache[url] = value;
    //this.check(); FIXME: .loadOrGet() calls .check() itself in this case, after the onError
};

ResourceManager.prototype.error = function(url, err) {
    if (this._cache[url] || this._errors[url]) { this.check(); return; }
    rmLog('triggering error for url ' + url);
    var subjects = this._url_to_subjects[url];
    if (subjects) { for (var i = 0, il = subjects.length; i < il; i++) {
        if (this._waiting[subjects[i]]) {
            delete this._waiting[subjects[i]][url];
        }
    } }
    this._errors[url] = err;
    //this.check(); FIXME: .loadOrGet() calls .check() itself in this case, after the onError
};

ResourceManager.prototype.has = function(url) {
    return (typeof this._cache[url] !== 'undefined');
};

// call this only if you are sure you want to force this check —
// this method is called automatically when every new incoming url is triggered
// as complete or failed
ResourceManager.prototype.check = function() {
    rmLog('checking subscriptions');
    var subscriptions = this._subscriptions,
        cache = this._cache,
        errors = this._errors,
        to_remove = null;
    for (var subject_id in subscriptions) {
        rmLog('subscription group \'' + subject_id + '\'');
        var urls = subscriptions[subject_id][0],
            callbacks = subscriptions[subject_id][1],
            error_count = 0,
            success_count = 0, u;
        for (u = 0, ul = urls.length; u < ul; u++) {
            if (errors[urls[u]]) error_count++;
            if (cache[urls[u]]) success_count++;
        }
        rmLog('success: ' + success_count + ', errors: ' + error_count +
            ', ready: ' + ((success_count + error_count) === urls.length));
        if ((success_count + error_count) === urls.length) {
            var ready = [];
            for (u = 0, ul = urls.length; u < ul; u++) {
                ready.push(cache[urls[u]] || errors[urls[u]]);
            }
            rmLog('notifying subscribers that ' + urls + ' are all ready');
            for (var k = 0, kl = callbacks.length; k < kl; k++) {
                //callbacks[k].call(subscriber, ready, error_count);
                callbacks[k](ready, error_count);
            }
            if (!to_remove) to_remove = [];
            to_remove.push(subject_id);
        }
    }
    if (to_remove) { for (var i = 0, il = to_remove.length; i < il; i++) {
        rmLog('removing notified subscribers for subject \'' +
            to_remove[i] + '\' from queue');
        delete subscriptions[to_remove[i]];
    } }
};

ResourceManager.prototype.cancel = function(subject_id) {
    if (!subject_id) throw new Error('Subject ID is empty');
    if (this._waiting[subject_id]) {
        var urls = this._subscriptions[subject_id][0];
        if (urls) { for (var u = 0, ul = urls.length; u < ul; u++) {
            delete this._waiting[subject_id][urls[u]];
        } }
    }
    // clear _url_to_subjects ?
    delete this._subscriptions[subject_id];
};

ResourceManager.prototype.clear = function() {
    this._cache = {};
    this._errors = {};
    this._waiting = {};
    this._loaders = {};
    this._subscriptions = {};
};

module.exports = new ResourceManager();

},{"./conf.js":8,"./log.js":23,"./utils.js":34}],31:[function(require,module,exports){
var provideEvents = require('../events.js').provideEvents,
    C = require('../constants.js'),
    engine = require('engine'),
    InfoBlock = require('./infoblock.js'),
    Strings = require('../loc.js').Strings,
    utils = require('../utils.js'),
    is = utils.is;

//fade modes
var FADE_NONE = 0,
    FADE_IN = 1,
    FADE_OUT = 2;

// Controls
// -----------------------------------------------------------------------------

/**
 * @class anm.Controls
 */
function Controls(player) {
    this.player = player;
    this.canvas = null;
    this.ctx = null;
    this.bounds = [];
    this.theme = null;
    this.info = null;
    this._initHandlers(); /* TODO: make automatic */
    this.state = {
        happens: C.NOTHING,
        mpos: {x: 0, y: 0},
        alpha: 1,
        click: false,
        changed: true,
        time: 0,
        gtime: 0,
        fadeTimer: 0,
        fadeMode: FADE_NONE,
        mouseInteractedAt: 0
    };
}

var theme = Controls.DEFAULT_THEME = require('./controls_theme.json');
Controls.THEME = Controls.DEFAULT_THEME;

Controls.LAST_ID = 0;
provideEvents(Controls, [C.X_DRAW]);
Controls.prototype.update = function(parent) {
    var cvs = this.canvas;
    if (!cvs) {
        cvs = engine.addCanvasOverlay('ctrls-' + Controls.LAST_ID, parent,
                 [ 0, 0, 1, 1 ],
                 function(cvs) {
                    engine.registerAsControlsElement(cvs, parent);
                 });
        Controls.LAST_ID++;
        this.id = cvs.id;
        this.canvas = cvs;
        this.ctx = engine.getContext(cvs, '2d');
        this.subscribeEvents(cvs);
        this.changeTheme(Controls.THEME);
        this.setupRenderLoop();
    } else {
        engine.updateOverlay(parent, cvs);
    }
    this.handleAreaChange();
    if (this.info) this.info.update(parent);
    BACK_GRAD = null; // invalidate back gradient
};

Controls.prototype.subscribeEvents = function() {
    var me=this;

    me.player.on(C.S_STATE_CHANGE, function(state) {
        me.state.happens = state;
        me.state.changed = true;
    });

    engine.subscribeCanvasEvents(me.canvas, {
        mouseenter: function(e) { me.handleMouseEnter(e);},
        mousemove: function(e) { me.handleMouseMove(e);},
        mouseleave: function(e) { me.handleMouseLeave(); },
        mousedown: function(e) { me.handleClick(); engine.preventDefault(e);},
        click: engine.preventDefault,
        dblclick: engine.preventDefault
    });
};

//check and update the time when the mouse was last moved or clicked.
//fade out the controls if the mouse has been inactive for `fadeTimes.idle` ms.
Controls.prototype.checkMouseTimeout = function(gtime) {
    if (this.state.mouseInteracted) {
        this.state.mouseInteractedAt = gtime;
        this.state.mouseInteracted = false;
        this.state.autoHidden = false;
        this.show();
    } else if(!this.state.autoHidden){
        var idleTime = gtime - this.state.mouseInteractedAt;
        if (idleTime > this.theme.fadeTimes.idle &&
            //if we're in a state where controls should autohide
            (this.state.happens === C.PLAYING || this.state.happens === C.PAUSED) &&
            //and the mouse is not busy somewhere on the bottom area
            !Controls.isInProgressArea(this.state.mpos, this.bounds[2], this.bounds[3])
        ) {
            this.hide();
            this.state.autoHidden = true;
        }
    }
};

//check if controls are being faded in/out, update alpha accordingly
//return true if a fade is in progress
Controls.prototype.checkFade = function(dt) {
    var state = this.state,
        fadeMode = state.fadeMode,
        fadeModifier = false,
        alpha = state.alpha;
    if (fadeMode !== FADE_NONE) {
        fadeModifier = true;
        state.fadeTimer -= dt;
        if (fadeMode === FADE_IN) {
            alpha = Math.min(1, 1-state.fadeTimer/theme.fadeTimes.fadein);
        } else { // FADE_OUT
            alpha = Math.max(0, state.fadeTimer/theme.fadeTimes.fadeout);
        }
        state.alpha = alpha;

        if (state.fadeTimer <= 0) {
            state.fadeTimer = 0;
            state.fadeMode = FADE_NONE;

        }
    }
    return fadeModifier;
};

Controls.prototype.render = function(gtime) {
    this.checkMouseTimeout(gtime);

    var dt = gtime-this.state.gtime;
    var prevGtime = this.state.gtime;
    this.state.gtime = gtime;

    if (!this.bounds || !this.state.changed) {
        // no reason to render nothing or the same image again
        return;
    }

    this.rendering = true;

    var fadeModifier = this.checkFade(dt);

    var state = this.state,
        player = this.player,
        s = state.happens,
        coords = state.mpos,
        time = state.time = player.state.time;

    var ctx = this.ctx,
        theme = this.theme,
        duration = this.player.state.duration,
        progress = time / ((duration !== 0) ? duration : 1);

    var w = this.bounds[2],
        h = this.bounds[3],
        ratio = engine.PX_RATIO;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (ratio != 1) ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = state.alpha;

    if (s === C.PLAYING) {
        if (duration) {
            drawProgress(ctx, theme, w, h, progress);
            drawTinyPause(ctx, w, h);
            drawTime(ctx, theme, w, h, time, duration, progress, coords);
            drawVolumeBtn(ctx, w, h, player.muted);
        }
    } else if (s === C.STOPPED) {
        drawBack(ctx, theme, w, h);
        drawPlay(ctx, theme, w, h, this.focused);
        state.changed = false;
    } else if (s === C.PAUSED) {
        drawBack(ctx, theme, w, h);
        drawPlay(ctx, theme, w, h, this.focused);
        if (duration) {
            drawProgress(ctx, theme, w, h, progress);
            drawTinyPlay(ctx, w, h);
            drawTime(ctx, theme, w, h, time, duration, progress, coords);
            drawVolumeBtn(ctx, w, h, player.muted);
        }
        state.changed = false;
    } else if (s === C.NOTHING) {
        drawNoAnimation(ctx, theme, w, h, this.focused);
        state.changed = false;
    } else if ((s === C.LOADING) || (s === C.RES_LOADING)) {
        drawBack(ctx, theme, w, h);
        drawLoadingProgress(ctx, w, h, ((gtime / 100  % 60) / 60),
                            this.loadingProgress, this.loadingErrors);
    } else if (s === C.ERROR) {
        drawBack(ctx, theme, w, h);
        drawError(ctx, theme, w, h, player.__lastError, this.focused);
        state.changed = false;
    }

    ctx.restore();
    this.fire(C.X_DRAW);

    if (this.info) {
      if (s !== C.NOTHING) { this._infoShown = true; this.info.render(); }
      else { this._infoShown = false; }
    }
    //we might have a non-changing state like STOPPED, but it will still
    //need to be redrawn when fading in/out, so we apply our fade modifier
    //if applicable at this point
    state.changed |= fadeModifier;

    this.rendering = false;
};

//react to a click on the controls
Controls.prototype.react = function() {
    if (this.hidden) return;

    var p = this.player,
        s = this.state.happens,
        btnWidth = theme.progress.buttonWidth,
        bottomHeight = theme.bottomControls.height;
    if ((s === C.NOTHING) || (s === C.LOADING) || (s === C.ERROR)) return;
    var coords = this.state.mpos,
        w = this.bounds[2], h = this.bounds[3];

    //handle clicks in the bottom area, where the playhead
    //and mute buttons reside
    if (Controls.isInProgressArea(coords, w, h)) {
        if (coords.x > btnWidth && coords.x < w-btnWidth) {
            time = utils.roundTo(p.state.duration*(coords.x-btnWidth)/(w-2*btnWidth), 1);
            if (time > p.anim.duration) {
                //when the animation is something like 3.8 seconds long,
                //the rounding will exceed the duration, which is not
                //a good idea.
                time = p.anim.duration;
            }
            if (s === C.PLAYING) {
              p.pause()
               .play(time);
            } else {
              p.play(time).pause();
            }
            this.state.time = time;
            return;
        } else if(coords.x > w-btnWidth) { //mute button?
            p.toggleMute();
            return;
        }
    }
    if (s === C.STOPPED) {
        p.play(0);
        return;
    }
    if (s === C.PAUSED) {
        p.play(this.state.time);
        return;
    }
    if (s === C.PLAYING) {
        p.pause();
        return;
    }
};

Controls.prototype.handleAreaChange = function() {
    if (!this.player || !this.player.canvas) return;
    this.bounds = engine.getCanvasBounds(this.canvas);
};

Controls.prototype.handleMouseMove = function(evt) {
    this.state.mouseInteracted = true;
    var pos = engine.getEventPosition(evt, this.canvas);
    this.state.mpos.x = pos[0];
    this.state.mpos.y = pos[1];
    if (this.state.happens === C.PLAYING || this.state.happens === C.PAUSED) {
        //if we are in the state where the playhead is accessible,
        //let's check if the mouse was there.
        if (Controls.isInProgressArea(this.state.mpos, this.bounds[2], this.bounds[3])) {
            this.state.changed = true;
            this.state.mouseInProgressArea = true;
        } else {
            // if the mouse left the progress area, we need to redraw the
            // controls to possibly update the time marker position
            if (this.state.mouseInProgressArea) {
                this.state.changed = true;
            }
            this.state.mouseInProgressArea = false;
        }
    }
};


Controls.prototype.handleClick = function() {
    this.state.changed = true;
    this.state.mouseInteracted = true;
    this.show();
    this.react();
};

Controls.prototype.handleMouseEnter = function() {
    this.show();
    this.forceNextRedraw();
};

Controls.prototype.handleMouseLeave = function() {
    if (this.state.happens === C.PLAYING || this.state.happens === C.PAUSED) {
        this.hide();
    }
};


Controls.prototype.hide = function() {
    if (this.state.alpha === 0 || this.state.fadeMode === FADE_OUT) {
        //already hidden/hiding
        return;
    }
    this.state.fadeMode = FADE_OUT;
    //we substract the current fadeTimer value so that if the controls only
    //showed halfway, they will fade out from the exact alpha they were in
    this.state.fadeTimer = theme.fadeTimes.fadeout - this.state.fadeTimer;
    this.state.changed = true;
};


Controls.prototype.show = function() {
    if (this.state.alpha === 1 || this.state.fadeMode === FADE_IN) {
        //already shown/showing
        return;
    }
    this.state.fadeMode = FADE_IN;
    this.state.fadeTimer = theme.fadeTimes.fadein - this.state.fadeTimer;
    this.state.changed = true;
};

Controls.prototype.reset = function() {
    if (this.info) this.info.reset();
};

Controls.prototype.detach = function(parent) {
    this.stopRenderLoop();
    engine.detachElement(parent, this.canvas);
    if (this.info) this.info.detach(parent);
    if (this.ctx) engine.clearAnmProps(this.ctx);
};

Controls.prototype.changeTheme = function(to) {
    this.theme = to;
    this.state.changed = true;
};

Controls.prototype.forceNextRedraw = function() {
    this.state.changed = true;
};

Controls.prototype.enable = function() {
    this.update(this.player.canvas);
};

Controls.prototype.disable = function() {
    this.hide();
    // FIXME: unsubscribe events!
    this.detach(this.player.wrapper);
};

Controls.prototype.enableInfo = function() {
};

Controls.prototype.disableInfo = function() {
};

var nextFrame = engine.getRequestFrameFunc(),
    stopAnim = engine.getCancelFrameFunc();

var getRenderFunc = function(controls) {
    var renderFunc = function(t) {
        controls.render.call(controls, t);
        nextFrame(renderFunc);
    };

    return renderFunc;
};

Controls.prototype.setupRenderLoop = function() {
    this.renderFunc = getRenderFunc(this);
    nextFrame(this.renderFunc);
};

Controls.prototype.stopRenderLoop = function() {
    stopAnim(this.renderFunc);
};

//check whether the mpos coordinates are within the bottom area
Controls.isInProgressArea = function(mpos, w, h) {
    return(mpos.y <= h && mpos.y >= (h - theme.bottomControls.height));
};

//draw the play/pause button background
var drawBack = function(ctx, theme, w, h, bgcolor) {
    ctx.save();
    var cx = w / 2,
        cy = h / 2;
    ctx.beginPath();
    ctx.fillStyle = theme.circle.color;
    ctx.arc(cx,cy,theme.circle.radius,0,2*Math.PI);
    ctx.fill();
    ctx.restore();
};

//draw the progress area, complete with the progress bar
var drawProgress = function(ctx, theme, w, h, progress) {
    ctx.save();
    var btnWidth = theme.progress.buttonWidth,
        bottomHeight = theme.bottomControls.height;
    ctx.fillStyle = theme.progress.backColor;
    ctx.fillRect(0, h-bottomHeight, w, bottomHeight);
    ctx.fillStyle = theme.progress.inactiveColor;
    ctx.fillRect(btnWidth, h-10, w-2*btnWidth, 5);
    var progressWidth = Math.round(progress*(w-2*btnWidth));
    ctx.fillStyle = theme.progress.activeColor;
    ctx.fillRect(btnWidth, h-10, progressWidth, 5);
    ctx.restore();
};

//draw the pause button
var drawPause = function(ctx, theme, w, h, focused) {
    ctx.save();
    var cx = w / 2,
        cy = h / 2;
    ctx.fillStyle = theme.button.color;
    ctx.fillRect(cx - 12, cy - 17, 8, 34);
    ctx.fillRect(cx + 4, cy - 17, 8, 34);
    ctx.restore();
};

//draw the play button
var drawPlay = function(ctx, theme, w, h, focused) {
    ctx.save();
    var cx = w / 2,
        cy = h / 2;
    ctx.strokeStyle = 'transparent';
    ctx.fillStyle = theme.button.color;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 20);
    ctx.lineTo(cx - 12, cy + 20);
    ctx.lineTo(cx + 18, cy);
    ctx.lineTo(cx - 12, cy - 20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
};

//draw the small pause/play buttons in the bottom area
var drawTinyPause = function(ctx, w, h) {
    ctx.save();

    var cx = 0,
        cy = h-theme.bottomControls.height;

    ctx.fillStyle = theme.button.color;
    ctx.fillRect(cx+9, cy+3, 3, 9);
    ctx.fillRect(cx+15, cy+3, 3, 9);

    ctx.restore();
};

var drawTinyPlay = function(ctx, w, h) {
    ctx.save();

    var cx = 0,
        cy = h-theme.bottomControls.height;

    ctx.strokeStyle = 'transparent';
    ctx.fillStyle = theme.button.color;
    ctx.beginPath();
    ctx.moveTo(cx + 9, cy + 3);
    ctx.lineTo(cx + 18, cy + 7);
    ctx.lineTo(cx + 9, cy + 11);
    ctx.lineTo(cx + 9, cy + 3);
    ctx.closePath();
    ctx.fill();


    ctx.restore();
};

// draw the sound on/off button
var drawVolumeBtn = function(ctx, w, h, muted) {
    ctx.save();

    var cx = w-theme.progress.buttonWidth,
        cy = h-theme.bottomControls.height;

    ctx.strokeStyle = 'transparent';
    ctx.lineWidth = 1;
    ctx.fillStyle = theme.button.color;
    ctx.beginPath();
    ctx.translate(cx,cy);
    ctx.moveTo(3,6);
    ctx.lineTo(6,6);
    ctx.lineTo(12,3);
    ctx.lineTo(12,12);
    ctx.lineTo(6,9);
    ctx.lineTo(3,9);
    ctx.lineTo(3,6);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.button.color;

    ctx.beginPath();
    if (muted) {
        ctx.moveTo(15,5);
        ctx.lineTo(21,10);
        ctx.moveTo(15,10);
        ctx.lineTo(21,5);
        ctx.stroke();
    } else {
        // )))
        for (var i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(15+i*3,3);
            ctx.bezierCurveTo(18+i*3,7, 18+i*3,8, 15+i*3, 12);
            ctx.stroke();
        }
    }
    ctx.restore();
};

//draw the loader
var drawLoadingProgress = function(ctx, w, h, hilite_pos, factor, errorFactor) {
    var cx = w / 2,
        cy = h / 2,
        segment = Math.ceil(90 * hilite_pos),
        twoPi = 2 * Math.PI,
        segmentPos = twoPi/90*segment;
        segmentAngle = twoPi/8;

    ctx.translate(cx, cy);
    ctx.strokeStyle = theme.loading.inactiveColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, twoPi);
    ctx.stroke();
    ctx.closePath();
    ctx.beginPath();
    ctx.strokeStyle = theme.loading.activeColor;
    ctx.arc(0,0,36,segmentPos, segmentPos + segmentAngle);
    ctx.stroke();
    ctx.closePath();

    // draw loading progress at the bottom
    if (factor || errorFactor) {
        ctx.translate(-cx, cy - theme.loading.factorLineWidth); // bottom right corner - 2px
        ctx.strokeStyle = theme.loading.factorBackColor;
        ctx.lineWidth = theme.loading.factorLineWidth;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w, 0);
        ctx.stroke();
        ctx.strokeStyle = theme.loading.factorDoneColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w * factor, 0);
        ctx.stroke();
        if (errorFactor) {
            ctx.strokeStyle = theme.loading.factorErrorColor;
            ctx.moveTo(w * factor, 0);
            ctx.lineTo(w * errorFactor, 0);
            ctx.stroke();
        }
    }
};

var drawNoAnimation = function(ctx, theme, w, h, focused) {
  //drawAnimatronGuy(ctx,w,h);
};

var drawError = function(ctx, theme, w, h, error, focused) {
    ctx.save();

    var cx = w / 2,
        cy = h / 2;

    ctx.translate(cx, cy);
    ctx.rotate(Math.PI/4);
    ctx.strokeStyle = 'transparent';
    ctx.fillStyle = theme.button.color;
    ctx.fillRect(-25, -3, 50, 6);
    ctx.fillRect(-3, -25, 6, 50);

    ctx.restore();

    drawText(ctx, theme,
                   w / 2, ((h / 2) * (1 + theme.circle.radius)),
                   theme.font.statussize * 1.2,
                   (error && error.message) ? utils.ell_text(error.message, theme.error.statuslimit)
                                            : error, theme.error.color);
};

//draw either the current time or the time under the mouse position
var drawTime = function(ctx, theme, w, h, time, duration, progress, coords) {
    var btnWidth = theme.progress.buttonWidth,
        inArea = Controls.isInProgressArea(coords, w, h) && coords.x > btnWidth && coords.x < w-btnWidth;
    if (inArea) {
      //calculate time at mouse position
      progress = (coords.x-btnWidth)/(w-2*btnWidth);
      time = Math.round(duration*progress);
    }
    var progressPos = btnWidth + Math.round(progress*(w-2*btnWidth));
    ctx.beginPath();
    ctx.fillStyle = theme.progress.backColor;
    ctx.strokeStyle = 'transparent';
    ctx.clearRect(0, h-40, w, 20);
    var x = Math.min(Math.max(1, progressPos-17), w-35), r=3, y=h-40, rw=34, rh=20;
    drawRoundedRect(ctx,x,y,rw,rh,r);
    ctx.moveTo(x+rw/2-3, y+rh);
    ctx.lineTo(x+rw/2, y+rh+3);
    ctx.lineTo(x+rw/2+3, y+rh);
    ctx.closePath();
    ctx.fill();
    drawText(ctx, theme, x+17, (h-30), 8, utils.fmt_time(time));
};

var drawText = function(ctx, theme, x, y, size, text, color, align) {
    ctx.save();
    ctx.font = theme.font.weight + ' ' + Math.floor(size || 15) + 'pt ' + theme.font.face;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color || theme.font.color;
    ctx.fillText(text, x, y);
    ctx.restore();
};

var drawRoundedRect = function(ctx, x, y, w, h, radius)
{
  var r = x + w;
  var b = y + h;
  ctx.moveTo(x+radius, y);
  ctx.lineTo(r-radius, y);
  ctx.quadraticCurveTo(r, y, r, y+radius);
  ctx.lineTo(r, y+h-radius);
  ctx.quadraticCurveTo(r, b, r-radius, b);
  ctx.lineTo(x+radius, b);
  ctx.quadraticCurveTo(x, b, x, b-radius);
  ctx.lineTo(x, y+radius);
  ctx.quadraticCurveTo(x, y, x+radius, y);
};

module.exports = Controls;

},{"../constants.js":9,"../events.js":11,"../loc.js":22,"../utils.js":34,"./controls_theme.json":32,"./infoblock.js":33,"engine":35}],32:[function(require,module,exports){
module.exports={
    "font": {
        "face": "Arial, sans-serif",
        "weight": "bold",
        "timesize": 13.5,
        "statussize": 8.5,
        "infosize_a": 10,
        "infosize_b": 8,
        "color": "white"
    },
    "circle": {
      "radius": 40,
      "color": "rgba(0,0,0,0.7)"
    },
    "bottomControls": {
        "height": 15
    },
    "progress": {
        "backColor": "rgba(0,0,0,0.7)",
        "activeColor": "white",
        "inactiveColor": "rgba(255,255,255,0.5)",
        "buttonWidth": 27
    },
    "button": {
      "color": "white"
    },
    "loading": {
      "activeColor": "white",
      "inactiveColor": "rgba(255,255,255,0.5)",
      "factorBackColor": "rgba(100,100,100,1)",
      "factorDoneColor": "rgba(255,255,255,1)",
      "factorErrorColor": "rgba(255,0,0,0.8)",
      "factorLineWidth": 4
    },
    "fadeTimes": {
        "fadein": 300,
        "fadeout": 300,
        "idle": 2500
    },
    "error": {
        "statusLimit": 40,
        "color": "darkred"
    }
}

},{}],33:[function(require,module,exports){
// Info Block
// -----------------------------------------------------------------------------
//TODO: Info block should be rendered via DOM, not canvas.

/**
 * @class anm.InfoBlock
 * @deprectated
 */
function InfoBlock(player, theme) {

}


module.exports = InfoBlock;

},{}],34:[function(require,module,exports){
(function (global){
var C = require('./constants.js'),
    SystemError = require('./errors.js').SystemError;

var is = {};

// FIXME: rename all to full-names
is.defined = function(v) {
  return !((typeof v === 'undefined') ||
    (v === null) ||
    (v === undefined));
};
is.finite = global.isFinite;
is.nan = global.isNaN;
is.arr = Array.isArray;
is.int = function(n) {
    return is.num(n) && Math.floor(n) == n;
};
is.num = function(n) {
    n = global.parseFloat(n);
    return !is.nan(n) && is.finite(n);
};
is.fun = function(f) {
    return typeof f === 'function';
};
is.obj = function(o) {
    return typeof o === 'object';
};
is.str = function(s) {
    return typeof s === 'string';
};
is.not_empty = function(obj) {
    if (Object.keys) return (Object.keys(obj).length > 0);
    else return (Object.getOwnPropertyNames(obj).length > 0);
};

is.modifier = function(f) {
    return f.hasOwnProperty(C.MARKERS.MODIFIER_MARKER);
};
is.painter = function(f) {
    return f.hasOwnProperty(C.MARKERS.PAINTER_MARKER);
};
is.tween = function(f) {
    return f.is_tween && is.modifier(f);
};

is.equal = function(x, y) {
    if (x === y) return true;
    // if both x and y are null or undefined and exactly the same

    if (!(x instanceof Object) || !(y instanceof Object)) return false;
    // if they are not strictly equal, they both need to be Objects

    if (x.constructor !== y.constructor) return false;
    // they must have the exact same prototype chain, the closest we can do is
    // test their constructor.

    for (var p in x) {
        if (!x.hasOwnProperty(p)) continue;
        // other properties were tested using x.constructor === y.constructor

        if (!y.hasOwnProperty(p)) return false;
        // allows to compare x[p] and y[p] when set to undefined

        if (x[p] === y[p]) continue;
        // if they have the same strict value or identity then they are equal

        if (typeof( x[p]) !== "object") return false;
        // Numbers, Strings, Functions, Booleans must be strictly equal

        if (!is.equal( x[p],  y[p])) return false;
        // Objects and Arrays must be tested recursively
    }

    for (p in y) {
        if ( y.hasOwnProperty(p) && ! x.hasOwnProperty(p)) return false;
        // allows x[p] to be set to undefined
    }
    return true;
};

// Iterator
// -----------------------------------------------------------------------------

function StopIteration() {}
function iter(a) {
    if (a.__iter) {
        a.__iter.reset();
        return a.__iter;
    }
    var pos = 0,
        len = a.length;
    return (a.__iter = {
        next: function() {
                  if (pos < len) return a[pos++];
                  pos = 0;
                  throw new StopIteration();
              },
        hasNext: function() { return (pos < len); },
        remove: function() { len--; return a.splice(--pos, 1); },
        reset: function() { pos = 0; len = a.length; },
        get: function() { return a[pos]; },
        each: function(f, rf) {
                  this.reset();
                  while (this.hasNext()) {
                    if (f(this.next()) === false) {
                        if (rf) rf(this.remove()); else this.remove();
                    }
                  }
              }
    });
}


function fmt_time(time) {
    if (!is.finite(time)) return '∞';
    var absTime = Math.abs(time),
        h = Math.floor(absTime / 3600),
        m = Math.floor((absTime - (h * 3600)) / 60),
        s = Math.floor(absTime - (h * 3600) - (m * 60));

    return ((time < 0) ? '-' : '') +
            ((h > 0)  ? (((h < 10) ? ('0' + h) : h) + ':') : '') +
            ((m < 10) ? ('0' + m) : m) + ':' +
            ((s < 10) ? ('0' + s) : s)
}

function ell_text(text, max_len) {
    if (!text) return '';
    var len = text.length;
    if (len <= max_len) return text;
    var semilen = Math.floor(len / 2) - 2;
    return text.slice(0, semilen) + '...' +
         text.slice(len - semilen);
}

// ### Internal Helpers
/* -------------------- */

// #### mathematics

function compareFloat(n1, n2, precision) {
    if (precision !== 0) {
        precision = precision || 2;
    }
    var multiplier = Math.pow(10, precision);
    return Math.round(n1 * multiplier) ==
           Math.round(n2 * multiplier);
}

function roundTo(n, precision) {
    if (!precision) return Math.round(n);
    //return n.toPrecision(precision);
    var multiplier = Math.pow(10, precision);
    return Math.round(n * multiplier) / multiplier;
}

function interpolateFloat(a, b, t) {
    return a*(1-t)+b*t;
}

// #### other

function paramsToObj(pstr) {
    var o = {}, ps = pstr.split('&'), i = ps.length, pair;
    while (i--) { pair = ps[i].split('='); o[pair[0]] = pair[1]; }
    return o;
}

// for one-level objects, so no hasOwnProperty check
function obj_clone(what) {
    var dest = {};
    for (var prop in what) {
        dest[prop] = what[prop];
    }
    return dest;
}

function mrg_obj(src, backup, trg) {
    if (!backup) return src;
    var res = trg || {};
    for (var prop in backup) {
        res[prop] = is.defined(src[prop]) ? src[prop] : backup[prop]; };
    return res;
}

function strf(str, subst) {
    var args = subst;
    return str.replace(/{(\d+)}/g, function(match, number) {
      return is.defined(args[number]) ?
        args[number] : match;
    });
}

// collects all characters from string
// before specified char, starting from start
function collect_to(str, start, ch) {
    var result = '';
    for (var i = start; str[i] !== ch; i++) {
        if (i === str.length) throw new SystemError('Reached end of string');
        result += str[i];
    }
    return result;
}


function guid() {
   return Math.random().toString(36).substring(2, 10) +
          Math.random().toString(36).substring(2, 10);
}

function fit_rects(pw, ph, aw, ah) {
    // pw == player width, ph == player height
    // aw == anim width,   ah == anim height
    var xw = pw / aw,
        xh = ph / ah;
    var factor = Math.min(xw, xh);
    var hcoord = Math.ceil((pw - aw * factor) / 2),
        vcoord = Math.ceil((ph - ah * factor) / 2),
        awf = Math.floor(aw * factor),
        ahf = Math.floor(ah * factor);
    if ((xw != 1) || (xh != 1)) {
        var anim_rect = [ hcoord, vcoord, awf, ahf ];
        if (hcoord !== 0) {
            return [ factor,
                     anim_rect,
                     [ 0, 0, hcoord, ph ],
                     [ hcoord + awf, 0, hcoord, ph ] ];
        } else if (vcoord !== 0) {
            return [ factor,
                     anim_rect,
                     [ 0, 0, aw, vcoord ],
                     [ 0, vcoord + awf, aw, vcoord ] ];
        } else return [ factor, anim_rect ];
    } else return [ 1, [ 0, 0, aw, ah ] ];
}

function removeElement(obj, element) {
    if (is.arr(obj)) {
        var index = array.indexOf(element);
        if (index > -1) {
            array.splice(index, 1);
        }
    } else {
        obj[element] = null;
    }
}

// TODO: add array cloning

module.exports = {
    fmt_time: fmt_time,
    ell_text: ell_text,
    compareFloat: compareFloat,
    roundTo: roundTo,
    interpolateFloat: interpolateFloat,
    paramsToObj: paramsToObj,
    obj_clone: obj_clone,
    mrg_obj: mrg_obj,
    strf: strf,
    collect_to: collect_to,
    guid: guid,
    fit_rects: fit_rects,
    is: is,
    iter: iter,
    removeElement: removeElement
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./constants.js":9,"./errors.js":10}],35:[function(require,module,exports){
(function (global){
/*
 * Copyright (c) 2011-@COPYRIGHT_YEAR by Animatron.
 * All rights are reserved.
 *
 * Animatron Player is licensed under the MIT License, see LICENSE.
 *
 * @VERSION
 */

// DOM Engine
// -----------------------------------------------------------------------------

var $doc = window.document;
    // DomEngine constants

var MARKER_ATTR = 'anm-player', // marks player existence on canvas element
    AUTO_MARKER_ATTR = 'anm-player-target', // marks that this element is a target for a player
    URL_ATTR = 'anm-url',
    SNAPSHOT_URL_ATTR = 'anm-src',
    IMPORTER_ATTR = 'anm-importer';

var $DE = {};

// FIXME: here are truly a lot of methods, try to
//        reduce their number as much as possible

// PX_RATIO

// require(what, func)
// define(id?, what, func)

// getRequestFrameFunc() -> function(callback)
// getCancelFrameFunc() -> function(id)

// ajax(url, callback?, errback?, method?, headers?) -> none
// getCookie(name) -> String
// onDocReady(callback) -> none

// ensureGlobalStylesInjected() -> none
// injectElementStyles(elm, general_class, instance_class) -> [ general_rule, instance_rule ];

// createTextMeasurer() -> function(text) -> [ width, height ]

// getElementById(id) -> Element
// findElementPosition(element) -> [ x, y ]
// findScrollAwarePosition(eelementlm) -> [ x, y ]
// // getElementBounds(element) -> [ x, y, width, height, ratio ]
// moveElementTo(element, x, y) -> none
// disposeElement(element) -> none
// detachElement(parent | null, child) -> none
// showElement(element) -> none
// hideElement(element) -> none
// clearChildren(element) -> none

// assignPlayerToWrapper(wrapper, player, backup_id) -> { wrapper, canvas, id }
// hasUrlToLoad(element) -> { url, importer_id }
// extractUserOptions(element) -> options: object | {}
// registerAsControlsElement(element, player) -> none
// registerAsInfoElement(element, player) -> none
// detachPlayer(player) -> none
// playerAttachedTo(element, player) -> true | false
// findPotentialPlayers() -> [ element ]

// hasAnmProps(element) -> object | null
// getAnmProps(element) -> object
// clearAnmProps(element) -> none

// createCanvas(width, height, bg?, ratio?) -> canvas
// getContext(canvas, type) -> context
// checkPlayerCanvas(canvas) -> true | false
// setTabIndex(canvas) -> none
// getCanvasSize(canvas) -> [ width, height ]
// getCanvasPosition(canvas) -> [ x, y ]
// getCanvasParameters(canvas) -> [ width, height, ratio ]
// getCanvasBounds(canvas) -> [ x, y, width, height, ratio ]
// setCanvasSize(canvas, width, height, ratio?) -> none
// setCanvasPosisition(canvas, x, y) -> none
// setCanvasBackground(canvas, value) -> none
// addCanvasOverlay(id, parent: canvas, conf: [x, y, w, h], callback: function(canvas)) -> canvas
// updateCanvasOverlays(canvas) -> none
// updateOverlay(parent, overlay, props?) -> none

// getEventPosition(event, element?) -> [ x, y ]
// subscribeWindowEvents(handlers: object) -> none
// subscribeCanvasEvents(canvas, handlers: object) -> none
// unsubscribeCanvasEvents(canvas, handlers: object) -> none
// subscribeAnimationToEvents(canvas, anim, map) -> none
// unsubscribeAnimationFromEvents(canvas, anim) -> none
// subscribeWrapperToStateChanges(wrapper, player) -> none

// keyEvent(evt) -> Event
// mouseEvent(evt, canvas) -> Event//
// preventDefault(evt) -> none

// createStyle() -> Element
// createStatImg() -> Image

// canvasSupported -> bool

// Framing
// shim adopted from https://gist.github.com/paulirish/1579671
var requestAnimationFrame = global.requestAnimationFrame,
    cancelAnimationFrame = global.cancelAnimationFrame;
var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !global.requestAnimationFrame; ++x) {
        requestAnimationFrame = global[vendors[x]+'RequestAnimationFrame'];
        cancelAnimationFrame = global[vendors[x]+'CancelAnimationFrame'] ||
                                   global[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!requestAnimationFrame) {
        requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
    if (!cancelAnimationFrame) {
        cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }

$DE.getRequestFrameFunc = function(){ return requestAnimationFrame; };
$DE.getCancelFrameFunc = function(){ return cancelAnimationFrame; };

// Global things

$DE.PX_RATIO = window.devicePixelRatio || 1;

$DE.ajax = function(url, callback, errback, method, headers) {
    var req;
    if (isIE9) {
        req = new window.XDomainRequest();
    } else {
        req = new window.XMLHttpRequest();
    }

    if (!req) {
      throw new Error('Failed to create XMLHttp instance'); // SysErr
    }

    var whenDone = function() {
        if (req.readyState == 4) {
            if (req.status == 200) {
                if (callback) callback(req);
            } else {
                var error = new Error('AJAX request for ' + url + // SysErr
                                 ' returned ' + req.status +
                                 ' instead of 200');
                if (errback) { errback(error, req); }
                else { throw error; }
            }
        }
    };

    req.onreadystatechange = whenDone;
    if (isIE9) {
        req.onload = function(){ callback(req); };
        req.onerror = function() {
            if(errback) errback(new Error('XDomainRequest Error'), req);
        };
    }
    req.open(method || 'GET', url, true);

    if (headers && !isIE9) {
        for (var header in headers) {
            req.setRequestHeader(header, headers[header]);
        }
    }

    req.send(null);
};

$DE.getCookie = function(name) {
    // from http://www.codelib.net/javascript/cookies.html
    var s = $doc.cookie, i;
    if (s)
    for (i=0, s=s.split('; '); i<s.length; i++) {
    s[i] = s[i].split('=', 2);
    if (unescape(s[i][0]) == name)
    return unescape(s[i][1]);
    }
    return null;
    /*var val=RegExp("(\\b|;)"+name+"[^;\\b]+").exec($doc.cookie);
    return val ? unescape(val[0].replace(/^[^=]+./,"")) : null;*/
};

$DE.onDocReady = function(callback) {
    //check if the document isn't already ready (sorry for the wording)
    if ($doc.readyState === 'complete') {
      callback();
      return;
    }
    var listener;
    if ($doc.addEventListener) {
        listener = $doc.addEventListener('DOMContentLoaded', function() {
            $doc.removeEventListener('DOMContentLoaded', listener, false);
            callback();
        }, false);
    } else if ($doc.attachEvent) {
        listener = function() {
            if ($doc.readyState === 'complete') {
                $doc.detachEvent('onreadystatechange', listener);
                callback();
            }
        };
        $doc.attachEvent('onreadystatechange', listener);
    }
};


$DE.__stylesTag = null;
// FIXME: move these constants to anm.js
$DE.WRAPPER_CLASS = 'anm-wrapper';
$DE.WRAPPER_INSTANCE_CLASS_PREFIX = 'anm-wrapper-';
$DE.PLAYER_CLASS = 'anm-player';
$DE.PLAYER_INSTANCE_CLASS_PREFIX = 'anm-player-';
$DE.CONTROLS_CLASS = 'anm-controls';
$DE.CONTROLS_INSTANCE_CLASS_PREFIX = 'anm-controls-';
$DE.INFO_CLASS = 'anm-controls';
$DE.INFO_INSTANCE_CLASS_PREFIX = 'anm-controls-';

$DE.styling = {
    wrapperGeneral: function(rule) {
        rule.style.position = 'relative';
    },
    wrapperInstance: function(rule) { },
    playerGeneral: function(rule) { },
    playerInstance: function(rule, desc) { },
    controlsGeneral: function(rule) {
        rule.style.position = 'absolute';
        rule.style.left = 0;
        rule.style.top = 0;
        rule.style.verticalAlign = 'top';
        rule.style.zIndex = 100;
        rule.style.cursor = 'pointer';
        rule.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    },
    controlsInstance: function(rule, desc) { },
    infoGeneral: function(rule) {
        rule.style.position = 'relative';
        rule.style.verticalAlign = 'top';
        rule.style.zIndex = 110;
        rule.style.cursor = 'pointer';
        rule.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        rule.style.opacity = 1;
    },
    infoInstance: function(rule, desc) { }
};

$DE.ensureGlobalStylesInjected = function() {
    if ($DE.__stylesTag) return;
    //if (!($doc.readyState === "complete")) return;
    var stylesTag = $DE.createStyle();

    // TODO: inject as first element?
    var head = $doc.getElementsByTagName("head")[0];
    if (!head) throw new Error('anm.Player requires <head> tag to exist in the document to inject CSS there');
    head.appendChild(stylesTag);
    // TODO: inject as first element?
    // var head = $doc.getElementsByTagName("head")[0];
    // head.insertBefore(stylesTag, head.firstChild);

    $DE.__stylesTag = stylesTag;
};

$DE.injectElementStyles = function(elm, general_class, instance_class) {
    var styles = $DE.__stylesTag.sheet,
        rules = styles.cssRules || styles.rules;
    if (elm.classList) {
        elm.classList.add(general_class);
        elm.classList.add(instance_class);
    } else if (elm.className){
        elm.className += general_class + ' ' + instance_class;
    } else {
        elm.className = general_class + ' ' + instance_class;
    }
    var props = $DE.getAnmProps(elm);
    props.gen_class  = general_class;
    props.inst_class = instance_class;
    var general_rule_idx  = (styles.insertRule || styles.addRule).call(styles, '.' +general_class + '{}', rules.length),
        instance_rule_idx = (styles.insertRule || styles.addRule).call(styles, '.' +instance_class + '{}', rules.length);
    var elm_rules = [ rules[general_rule_idx],
                      rules[instance_rule_idx] ];
    props.gen_rule  = elm_rules[0];
    props.inst_rule = elm_rules[1];
    return elm_rules;
};

$DE.__textBuf = null;
$DE.createTextMeasurer = function() {
    var buff = $DE.__textBuf;
    if (!buff) {
        /* FIXME: dispose buffer when text is removed from animation */
        $DE.onDocReady(function(){
          var div = $doc.createElement('div');
          var span = $doc.createElement('span');
          div.style.visibility = 'hidden';
          div.style.position = 'absolute';
          div.style.top = -10000 + 'px';
          div.style.left = -10000 + 'px';
          div.appendChild(span);
          $doc.body.appendChild(div);
          $DE.__textBuf = span;
          buff = $DE.__textBuf;
        });

    }
    return function(text, lines_arg) {
        var has_arg = (typeof lines_arg !== 'undefined');
        var lines = has_arg ? lines_arg : text.lines;
        buff.style.font = text.$font;
        //buff.style.textAlign = text.align;
        //buff.style.verticalAlign = text.baseline || 'bottom';
        buff.style.whiteSpace = 'pre';
        if (Array.isArray(text.lines)) { // FIXME: replace with anm.is.arr()
            var maxWidth = 0, height = 0;
            for (var i = 0, ilen = lines.length; i < ilen; i++) {
                buff.textContent = lines[i] || " ";
                maxWidth = Math.max(buff.offsetWidth, maxWidth);
                height += buff.offsetHeight;
            }
            return [ maxWidth, height ];
        } else {
            buff.textContent = text.lines.toString() || "";
            return [ buff.offsetWidth,
                     buff.offsetHeight ];
        }
        // TODO: test if lines were changed, and if not,
        //       use cached value

    };
};

// Elements

$DE.getElementById = function(id) {
    return $doc.getElementById(id);
};
/* FIXME: replace with elm.getBoundingClientRect();
   see http://stackoverflow.com/questions/8070639/find-elements-position-in-browser-scroll */
// returns position on a screen, _including_ scroll
$DE.findElementPosition = function(elm) {
    if (elm.getBoundingClientRect) {
       var rect = elm.getBoundingClientRect();
       return [ rect.left, rect.top ];
    }
    var curleft = 0,
        curtop = 0;
    do {
        curleft += elm.offsetLeft;
        curtop += elm.offsetTop;
    } while ((elm = elm.offsetParent));
    return [ curleft, curtop ];
};

$DE.findScrollAwarePosition = function(elm) {
    var curleft = 0,
        curtop = 0;

    if (elm.getBoundingClientRect) {
        var rect = elm.getBoundingClientRect();
        do {
            curleft += ((elm !== $doc.body) ?
                        elm.scrollLeft
                        : $doc.documentElement.scrollLeft);
            curtop += ((elm !== $doc.body) ?
                        elm.scrollTop
                        : $doc.documentElement.scrollTop);
        } while ((elm = elm.offsetParent));
        return [ rect.left - curleft, rect.top - curtop ];
    }
    //var bound = elm.getBoundingClientRect();
    //return [ bound.left, bound.top ];
    do {
        curleft += elm.offsetLeft - ((elm !== $doc.body) ?
                                     elm.scrollLeft
                                     : $doc.documentElement.scrollLeft);
        curtop += elm.offsetTop - ((elm !== $doc.body) ?
                                     elm.scrollTop
                                     : $doc.documentElement.scrollTop);
    } while ((elm = elm.offsetParent));
    return [ curleft, curtop ];
};
/*$DE.getElementBounds = function(elm) {
    var rect = elm.getBoundingClientRect();
    return [ rect.left, rect.top, rect.width, rect.height, $DE.PX_RATIO ];
}*/
$DE.moveElementTo = function(elm, x, y) {
    var props = $DE.hasAnmProps(elm);
    ((props && props.inst_rule) || elm).style.left = (x === 0) ? '0' : (x + 'px');
    ((props && props.inst_rule) || elm).style.top  = (y === 0) ? '0' : (y + 'px');
};

$DE.__trashBin = null;
$DE.disposeElement = function(elm) {
    var trashBin = $DE.__trashBin;
    if (!trashBin) {
        trashBin = $doc.createElement('div');
        trashBin.id = 'trash-bin';
        trashBin.style.display = 'none';
        $doc.body.appendChild(trashBin);
        $DE.__trashBin = trashBin;
    }
    trashBin.appendChild(elm);
    trashBin.innerHTML = '';
};

$DE.detachElement = function(parent, child) {
    (parent || child.parentNode).removeChild(child);
};

$DE.showElement = function(elm) {
    var props = $DE.hasAnmProps(elm);
    ((props && props.inst_rule) || elm).style.visibility = 'visible';
};

$DE.hideElement = function(elm) {
    var props = $DE.hasAnmProps(elm);
    ((props && props.inst_rule) || elm).style.visibility = 'hidden';
};

$DE.clearChildren = function(elm) {
    // much faster than innerHTML = '';
    while (elm.firstChild) { elm.removeChild(elm.firstChild); }
};

// Creating & Modifying Canvas

$DE.createCanvas = function(width, height, bg, ratio) {
    var cvs = $doc.createElement('canvas');
    $DE.setCanvasSize(cvs, width, height, ratio);
    if (bg) $DE.setCanvasBackground(cvs, bg);
    return cvs;
};

$DE.assignPlayerToWrapper = function(wrapper, player, backup_id) {
    if (!wrapper) throw new Error('Element passed to anm.Player initializer does not exists.');

    if (anm.utils.is.str(wrapper)) {
        wrapper = $doc.getElementById(wrapper);
    }

    var canvasWasPassed = (wrapper.tagName == 'canvas') || (wrapper.tagName == 'CANVAS');
    if (canvasWasPassed && window.console) {
        console.warn('NB: A <canvas> tag was passed to the anm.Player as an element to attach to. This is ' +
                     'not a recommended way since version 1.2; this <canvas> will be moved inside ' +
                     'a <div>-wrapper because of it, so it may break document flow and/or CSS styles. ' +
                     'Please pass any container such as <div> to a Player instead of <canvas> to fix it.');
    }

    var state_before = wrapper.cloneNode(false);

    var canvas = canvasWasPassed ? wrapper : $doc.createElement('canvas');
    wrapper = canvasWasPassed ? $doc.createElement('div') : wrapper;

    if (wrapper.getAttribute(MARKER_ATTR)) throw new Error('Player is already attached to element \'' + (wrapper.id || canvas.id) + '\'.');
    wrapper.setAttribute(MARKER_ATTR, true);
    if (wrapper.hasAttribute(AUTO_MARKER_ATTR)) wrapper.removeAttribute(AUTO_MARKER_ATTR);
    if (canvas.hasAttribute(AUTO_MARKER_ATTR))  canvas.removeAttribute(AUTO_MARKER_ATTR);

    var prev_cvs_id = canvas.id;
    canvas.id = ''; // to ensure no elements will have the same ID in DOM after the execution of next line
    if (!wrapper.id) wrapper.id = prev_cvs_id;
    canvas.id = wrapper.id + '-cvs';
    var props = $DE.getAnmProps(canvas);
    props.wrapper = wrapper;
    props.was_before = state_before;

    var id = wrapper.id; // the "main" id

    props.id = id;

    if (canvasWasPassed) {
        var parent = canvas.parentNode || $doc.body;
        if (parent) {
            parent.replaceChild(wrapper, canvas);
            wrapper.appendChild(canvas);
        } else throw new Error('Provided canvas tag has no parent');
    } else {
        wrapper.appendChild(canvas);
    }

    $DE.ensureGlobalStylesInjected();

    var wrapper_rules = $DE.injectElementStyles(wrapper,
                                                $DE.WRAPPER_CLASS,
                                                $DE.WRAPPER_INSTANCE_CLASS_PREFIX + (id || 'no-id'));
    var cvs_rules = $DE.injectElementStyles(canvas,
                                            $DE.PLAYER_CLASS,
                                            $DE.PLAYER_INSTANCE_CLASS_PREFIX + (id || 'no-id'));

    $DE.styling.playerGeneral(cvs_rules[0]);
    $DE.styling.playerInstance(cvs_rules[1]);
    $DE.styling.wrapperGeneral(wrapper_rules[0]);
    $DE.styling.wrapperInstance(wrapper_rules[1]);

    $DE.subscribeWrapperToStateChanges(wrapper, player);

    return { wrapper: wrapper,
             canvas: canvas,
             id: id };
};

$DE.playerAttachedTo = function(elm, player) {
    if ($DE.hasAnmProps(elm)) {
        var props = $DE.getAnmProps(elm);
        if (props.wrapper) return props.wrapper.hasAttribute(MARKER_ATTR);
    }
    return elm.hasAttribute(MARKER_ATTR);
};

$DE.findPotentialPlayers = function() {
    return $doc.querySelectorAll('[' + AUTO_MARKER_ATTR + ']');
};

$DE.hasAnmProps = function(elm) {
    return elm.__anm;
};

$DE.getAnmProps = function(elm) {
    if (!elm.__anm) elm.__anm = {};
    return elm.__anm;
};

$DE.clearAnmProps = function(elm) {
    if (!elm || !elm.__anm) return;
    var __anm = elm.__anm;
    if (__anm.gen_class && __anm.inst_class) {
        var styles = $DE.__stylesTag.sheet,
            rules = styles.cssRules || styles.rules;
        var to_remove = [];
        for (var i = 0, il = rules.length; i < il; i++) {
            if ((rules[i].selectorText == '.' + __anm.gen_class) ||
                (rules[i].selectorText == '.' + __anm.inst_class)) {
                to_remove.push(i); // not to conflict while iterating
            }
        }
        while (to_remove.length) { // remove from the end for safety
            (styles.deleteRule || styles.removeRule).call(styles, to_remove.pop());
        }
    }
    if (__anm.gen_class  && elm.classList) elm.classList.remove(__anm.gen_class);
    if (__anm.inst_class && elm.classList) elm.classList.remove(__anm.inst_class);
    delete elm.__anm;
};

$DE.detachPlayer = function(player) {
    var canvas = player.canvas,
        wrapper = player.wrapper;
    if (wrapper) wrapper.removeAttribute(MARKER_ATTR);
    var parent_node = wrapper.parentNode || $doc.body,
        next_node = wrapper.nextSibling;
    var props = $DE.getAnmProps(canvas);
    $DE.clearChildren(wrapper);
    if (props.was_before) {
        parent_node.removeChild(wrapper);
        parent_node.insertBefore(props.was_before, next_node);
    }
    $DE.clearAnmProps(wrapper);
    $DE.clearAnmProps(canvas);
    if (player.controls) {
        $DE.clearAnmProps(player.controls.canvas);
        if (player.controls.info) $DE.clearAnmProps(player.controls.info.canvas);
    }

    if (player.statImg) {
      $DE.detachElement(null, player.statImg);
    }
    //FIXME: should remove stylesTag when last player was deleted from page
    //$DE.detachElement(null, $DE.__stylesTag);
    //$DE.__stylesTag = null;
};

$DE.getContext = function(cvs, type) {
    return cvs.getContext(type);
};

$DE.extractUserOptions = function(elm) {

    function __boolAttr(val) {
        //if (val === undefined) return undefined;
        if (typeof val === 'undefined') return undefined;
        if (val === null) return null;
        if (val == '0') return false;
        if (val == '1') return true;
        if (val == 'false') return false;
        if (val == 'true') return true;
        if (val == 'off') return false;
        if (val == 'on') return true;
        if (val == 'no') return false;
        if (val == 'yes') return true;
    }

    var ratio = $DE.PX_RATIO;
    var width = elm.getAttribute('anm-width');
    if (!width) {
        width = elm.hasAttribute('width') ? (elm.getAttribute('width') / ratio)
                                          : undefined;
    }
    var height = elm.getAttribute('anm-height');
    if (!height) {
        height = elm.hasAttribute('height') ? (elm.getAttribute('height') / ratio)
                                            : undefined;
    }
    return { 'debug': __boolAttr(elm.getAttribute('anm-debug')),
             'mode': elm.getAttribute('anm-mode'),
             'repeat': __boolAttr(elm.getAttribute('anm-repeat')),
             'zoom': elm.getAttribute('anm-zoom'),
             'speed': elm.getAttribute('anm-speed'),
             'width': width,
             'height': height,
             'autoPlay': __boolAttr(elm.getAttribute('anm-autoplay') || elm.getAttribute('anm-auto-play')),
             'bgColor': elm.getAttribute('anm-bgcolor') || elm.getAttribute('anm-bg-color'),
             'ribbonsColor': elm.getAttribute('anm-ribbons') || elm.getAttribute('anm-ribcolor') || elm.getAttribute('anm-rib-color'),
             'drawStill': __boolAttr(elm.getAttribute('anm-draw-still') ||
                              elm.getAttribute('anm-draw-thumbnail') ||
                              elm.getAttribute('anm-draw-thumb')),
             'imagesEnabled': __boolAttr(elm.getAttribute('anm-images') || elm.getAttribute('anm-images-enabled')),
             'shadowsEnabled': __boolAttr(elm.getAttribute('anm-shadows') || elm.getAttribute('anm-shadows-enabled')),
             'audioEnabled': __boolAttr(elm.getAttribute('anm-audio') || elm.getAttribute('anm-audio-enabled')),
             'controlsEnabled': __boolAttr(elm.getAttribute('anm-controls') || elm.getAttribute('anm-controls-enabled')),
             'infoEnabled': __boolAttr(elm.getAttribute('anm-info') || elm.getAttribute('anm-info-enabled')),
             'handleEvents': __boolAttr(elm.getAttribute('anm-events') || elm.getAttribute('anm-handle-events')),
             'infiniteDuration': __boolAttr(elm.getAttribute('anm-infinite') || elm.getAttribute('anm-infinite-duration')),
             'forceSceneSize': __boolAttr(elm.getAttribute('anm-scene-size') || elm.getAttribute('anm-force-scene-size')),
             'inParent': undefined, // TODO: check if we're in tag?
             'muteErrors': __boolAttr(elm.getAttribute('anm-mute-errors')),
             'loadingMode': elm.getAttribute('anm-loading-mode'),
             'thumbnail': elm.getAttribute('anm-thumbnail')
           };
};

$DE.checkPlayerCanvas = function(cvs) {
    return true;
};

$DE.hasUrlToLoad = function(elm) {
    return {
        url: elm.getAttribute(URL_ATTR) || elm.getAttribute(SNAPSHOT_URL_ATTR),
        importer_id: elm.getAttribute(IMPORTER_ATTR)
    };
};

$DE.setTabIndex = function(cvs, idx) {
    cvs.setAttribute('tabindex', idx);
};

$DE.getCanvasParameters = function(cvs) {
    // if canvas size was not initialized by player, will return null
    if (!$DE.hasAnmProps(cvs)) return null;
    var props = $DE.getAnmProps(cvs);
    if (!props.width || !props.height) return null;
    return [ props.width, props.height, $DE.PX_RATIO ];
};

$DE.getCanvasSize = function(cvs) {
    if (cvs.getBoundingClientRect) {
       var rect = cvs.getBoundingClientRect();
       return [ rect.width, rect.height ];
    }
    return [ /* cvs.getAttribute('offsetWidth') || cvs.offsetWidth || */
             cvs.getAttribute('clientWidth') || cvs.clientWidth,
             /* cvs.getAttribute('offsetHeight') || cvs.offsetHeight || */
             cvs.getAttribute('clientHeight') || cvs.clientHeight ];
};

$DE.getCanvasPosition = function(cvs) {
    return $DE.findScrollAwarePosition(cvs);
};

$DE.getCanvasBounds = function(cvs/*, parent*/) {
    //var parent = parent || cvs.parentNode;
    var params = $DE.getCanvasParameters(cvs);
    if (!params) return null;
    var pos = $DE.getCanvasPosition(cvs);
    // bounds are: left, top, width, height, ratio.
    // I am not sure if I am correct in providing width/height instead of
    // left+width/top+height, but I think it's better to return values
    // not required to sum up/subtract in this case.
    return [ pos[0], pos[1], params[0], params[1], params[2] ];
};

$DE.setCanvasSize = function(cvs, width, height, ratio) {
    //$log.debug('request to resize canvas ' + (cvs.id || cvs) + ' to ' + width + ' ' + height);
    ratio = ratio || $DE.PX_RATIO;
    var _w = width | 0, // to int
        _h = height | 0; // to int
    //$log.debug('resizing ' + (cvs.id || cvs) + ' to ' + _w + ' ' + _h);
    var props = $DE.getAnmProps(cvs);
    props.ratio = ratio;
    props.width = _w;
    props.height = _h;
    if (!cvs.style.width) { (props.inst_rule || cvs).style.width  = _w + 'px'; }
    if (!cvs.style.height) { (props.inst_rule || cvs).style.height = _h + 'px'; }
    cvs.setAttribute('width', _w * (ratio || 1));
    cvs.setAttribute('height', _h * (ratio || 1));
    $DE._saveCanvasPos(cvs);
    return [ _w, _h ];
};

$DE.setCanvasPosition = function(cvs, x, y) {
    var props = $DE.getAnmProps(cvs);
    props.usr_x = x;
    props.usr_y = y;
    // TODO: actually move canvas
    $DE._saveCanvasPos(cvs);
};

$DE.setCanvasBackground = function(cvs, bg) {
    ($DE.getAnmProps(cvs).inst_rule || cvs).style.backgroundColor = bg;
};

$DE._saveCanvasPos = function(cvs) {
    // FIXME: use getBoundingClientRect?
    var gcs = ($doc.defaultView &&
               $doc.defaultView.getComputedStyle); // last is assigned

    // computed padding-left
    var cpl = gcs ?
          (parseInt(gcs(cvs, null).paddingLeft, 10) || 0) : 0,
    // computed padding-top
        cpt = gcs ?
          (parseInt(gcs(cvs, null).paddingTop, 10) || 0) : 0,
    // computed border-left
        cbl = gcs ?
          (parseInt(gcs(cvs, null).borderLeftWidth,  10) || 0) : 0,
    // computed border-top
        cbt = gcs ?
          (parseInt(gcs(cvs, null).borderTopWidth,  10) || 0) : 0;

    var html = $doc.body.parentNode,
        htol = html.offsetLeft,
        htot = html.offsetTop;

    var elm = cvs,
        ol = cpl + cbl + htol,
        ot = cpt + cbt + htot;

    if (elm.offsetParent !== undefined) {
        do {
            ol += elm.offsetLeft;
            ot += elm.offsetTop;
        } while ((elm = elm.offsetParent));
    }

    ol += cpl + cbl + htol;
    ot += cpt + cbt + htot;

    /* FIXME: find a method with no injection of custom properties
              (data-xxx attributes are stored as strings and may work
               a bit slower for events) */
    // FIXME: NOT USED ANYMORE
    var props = $DE.getAnmProps(cvs);
    props.offset_left = ol || props.usr_x;
    props.offset_top  = ot || props.usr_y;
};

$DE.addCanvasOverlay = function(id, player_cvs, conf, callback) {
    // conf should be: [ x, y, w, h ], all in percentage relative to parent
    // style may contain _class attr
    // if (!parent) throw new Error();
    var p_props = $DE.getAnmProps(player_cvs);
    var holder = p_props.wrapper || player_cvs.parentNode || $doc.body;
    var x = conf[0], y = conf[1],
        w = conf[2], h = conf[3];
    var pconf = $DE.getCanvasSize(player_cvs),
        pw = pconf[0], ph = pconf[1];
    var p_style = window.getComputedStyle ? window.getComputedStyle(player_cvs) : player_cvs.currentStyle;
    var x_shift = parseFloat(p_style.getPropertyValue('border-left-width')),
        y_shift = parseFloat(p_style.getPropertyValue('border-top-width'));
    var new_w = (w * pw),
        new_h = (h * ph);
    var cvs = $doc.createElement('canvas');
    cvs.id = (p_props.id) ? ('__' + p_props.id + '_' + id) : ('__anm_' + id);
    var props = $DE.getAnmProps(cvs);
    if (callback) callback(cvs, player_cvs);
    $DE.setCanvasSize(cvs, new_w, new_h);
    var new_x = (x * new_w) + x_shift,
        new_y = (y * new_h) - y_shift;
    $DE.moveElementTo(cvs, new_x, new_y);
    // .insertBefore() in combination with .nextSibling works as .insertAfter() simulation
    (holder || $doc.body).insertBefore(cvs, player_cvs.nextSibling);
    props.ref_canvas = player_cvs;
    if (!p_props.overlays) p_props.overlays = [];
    p_props.overlays.push(cvs);
    return cvs;
};

$DE.updateCanvasOverlays = function(player_cvs) {
    var p_props = $DE.getAnmProps(player_cvs);
    var overlays = p_props.overlays;
    if (overlays) { for (var i = 0, il = overlays.length; i < il; i++) {
        $DE.updateOverlay(player_cvs, overlays[i], p_props);
    } }
};

$DE.updateOverlay = function(player_cvs, overlay, p_props) {
    p_props = p_props || $DE.getAnmProps(player_cvs);
    $DE.setCanvasSize(overlay, p_props.width, p_props.height);
};

// Controls & Info

$DE.registerAsControlsElement = function(elm, player) {
    var rules = $DE.injectElementStyles(elm,
                                $DE.CONTROLS_CLASS,
                                $DE.CONTROLS_INSTANCE_CLASS_PREFIX + (player.id || 'no-id'));
    $DE.styling.controlsGeneral(rules[0]);
    $DE.styling.controlsInstance(rules[1]);
};

$DE.registerAsInfoElement = function(elm, player) {
    var rules = $DE.injectElementStyles(elm,
                                $DE.INFO_CLASS,
                                $DE.INFO_INSTANCE_CLASS_PREFIX + (player.id || 'no-id'));
    $DE.styling.infoGeneral(rules[0]);
    $DE.styling.infoInstance(rules[1]);
};

// Events

$DE.getEventPosition = function(evt, elm) {
    if (elm) {
        var shift = $DE.findElementPosition(elm); // $DE.findScrollAwarePosition(elm);
        return [ evt.clientX - shift[0], evt.clientY - shift[1] ];
    } else return [ evt.x, evt.y ];
};

$DE.subscribeElementEvents = function(elm, handlers) {
    for (var type in handlers) {
        elm.addEventListener(type, handlers[type], false);
    }
}

$DE.unsubscribeElementEvents = function(elm, handlers) {
    for (var type in handlers) {
        elm.removeEventListener(type, handlers[type], false);
    }
}

$DE.subscribeWindowEvents = function(handlers) {
    $DE.subscribeElementEvents(window, handlers);
};

$DE.subscribeCanvasEvents = $DE.subscribeElementEvents;
$DE.unsubscribeCanvasEvents = $DE.unsubscribeElementEvents;

$DE.keyEvent = function(e) {
    return { key: ((e.keyCode !== null) ? e.keyCode : e.which),
             ch: e.charCode };
};

$DE.mouseEvent = function(e, cvs) {
    return { pos: $DE.getEventPosition(e, cvs) };
};

$DE.preventDefault = function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
};

var _kevt = $DE.keyEvent,
    _mevt = $DE.mouseEvent;
$DE.subscribeAnimationToEvents = function(cvs, anim, map) {
    if (cvs.__anm.subscribed &&
        cvs.__anm.subscribed[anim.id]) {
        return;
    }
    //cvs.__anm_subscription_id = guid();
    if (!cvs.__anm.handlers)   cvs.__anm.handlers = {};
    if (!cvs.__anm.subscribed) cvs.__anm.subscribed = {};
    var handlers = cvs.__anm.subscribed[anim.id] || {
      mouseup:   function(evt) { anim.fire(map.mouseup,   _mevt(evt, cvs)); },
      mousedown: function(evt) { anim.fire(map.mousedown, _mevt(evt, cvs)); },
      mousemove: function(evt) { anim.fire(map.mousemove, _mevt(evt, cvs)); },
      mouseover: function(evt) { anim.fire(map.mouseover, _mevt(evt, cvs)); },
      mouseout:  function(evt) { anim.fire(map.mouseout,  _mevt(evt, cvs)); },
      click:     function(evt) { anim.fire(map.click,     _mevt(evt, cvs)); },
      dblclick:  function(evt) { anim.fire(map.dblclick,  _mevt(evt, cvs)); },
      keyup:     function(evt) { anim.fire(map.keyup,     _kevt(evt)); },
      keydown:   function(evt) { anim.fire(map.keydown,   _kevt(evt)); },
      keypress:  function(evt) { anim.fire(map.keypress,  _kevt(evt)); }
    };
    cvs.__anm.handlers[anim.id] = handlers;
    cvs.__anm.subscribed[anim.id] = true;
    $DE.subscribeCanvasEvents(cvs, handlers);
};

$DE.unsubscribeAnimationFromEvents = function(cvs, anim) {
    if (!cvs.__anm.handlers   ||
        !cvs.__anm.subscribed ||
        !cvs.__anm.subscribed[anim.id]) return;
    var handlers = cvs.__anm.handlers[anim.id];
    if (!handlers) return;
    $DE.unsubscribeCanvasEvents(cvs, handlers);
};

$DE.subscribeWrapperToStateChanges = function(wrapper, player) {
    if (!wrapper.classList) return;
    var C = anm.constants;
    player.on(C.S_CHANGE_STATE, function(new_state) {
        var css_classes = [];
        switch (new_state) {
            case C.NOTHING: css_classes = ['anm-state-nothing']; break;
            case C.STOPPED: css_classes = ['anm-state-stopped']; break;
            case C.PLAYING: css_classes = ['anm-state-playing']; break;
            case C.PAUSED:  css_classes = ['anm-state-paused']; break;
            case C.LOADING: css_classes = ['anm-state-loading']; break;
            case C.RES_LOADING: css_classes = ['anm-state-loading', 'anm-state-resources-loading']; break;
            case C.ERROR:   css_classes = ['anm-state-error']; break;
        }
        if (css_classes.length) {
            var classList = wrapper.classList, i, il;
            if (player.__prev_classes && player.__prev_classes.length) {
                var prev_classes = player.__prev_classes;
                for (i = 0, il = prev_classes.length; i < il; i++) {
                    classList.remove(prev_classes[i]);
                }
            } else {
                if (classList.contains('anm-state-nothing')) {
                    classList.remove('anm-state-nothing');
                }
            }
            for (i = 0, il = css_classes.length; i < il; i++) {
                classList.add(css_classes[i]);
            }
            player.__prev_classes = css_classes;
        }
    });
};

$DE.createStatImg = function() {
    var img = $doc.createElement('img');
    img.style.position = 'absolute';
    img.style.top = '-9999px';
    img.style.left = '-9999px';
    img.style.visibility = 'hidden';

    $doc.body.appendChild(img);

    return img;
};

$DE.createStyle = function() {
    var style = document.createElement('style');
    style.type = 'text/css';
    return style;
};

$DE.createAudio = function() {
    return document.createElement('audio');
};

$DE.createVideo = function() {
    return document.createElement('video');
};

$DE.createSource = function() {
    return document.createElement('source');
};

$DE.appendToBody = function(element) {
    document.body.appendChild(element);
};

var testCanvas = document.createElement('canvas');
$DE.canvasSupported = !!(testCanvas.getContext && testCanvas.getContext('2d'));

var https = window.location && window.location.protocol === 'https:';
$DE.isHttps = https;

var local = window.location && window.location.protocol === 'file:';
$DE.isLocal = local;

var isIE9 = navigator.userAgent.indexOf('MSIE 9.0') !== -1;
$DE.isIE9 = isIE9;

var hidden, visibilityChange;
if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
  hidden = "hidden";
  visibilityChange = "visibilitychange";
} else if (typeof document.mozHidden !== "undefined") {
  hidden = "mozHidden";
  visibilityChange = "mozvisibilitychange";
} else if (typeof document.msHidden !== "undefined") {
  hidden = "msHidden";
  visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
  hidden = "webkitHidden";
  visibilityChange = "webkitvisibilitychange";
}

if (typeof document[hidden] !== 'undefined' ||
    typeof document.addEventListener !== 'undefined') {
        document.addEventListener(visibilityChange,
            function() {
                if (onDocumentHiddenChange) {
                    onDocumentHiddenChange(document[hidden]);
                }
            }, false);
}
var onDocumentHiddenChange = null;
$DE.onDocumentHiddenChange = function(cb){
    onDocumentHiddenChange = cb;
};

module.exports = $DE;
return $DE;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],36:[function(require,module,exports){
(function (global){
/*
* Copyright (c) 2011-@COPYRIGHT_YEAR by Animatron.
* All rights are reserved.
*
* Animatron Player is licensed under the MIT License, see LICENSE.
*
* @VERSION
*/

// HERE GOES THE INITIALISATION OF ANM NAMESPACE, GLOBALS AND GLOBAL HELPERS

var PUBLIC_NAMESPACE = 'anm';

var constants = require('./anm/constants.js'),
    engine = require('engine'),
    Player = require('./anm/player.js');

function findAndInitPotentialPlayers() {
    var matches = engine.findPotentialPlayers();
    for (var i = 0, il = matches.length; i < il; i++) {
        anm.createPlayer(matches[i]);
    }
}

engine.onDocReady(findAndInitPotentialPlayers);

var Element = require('./anm/animation/element.js'),
    Sheet = require('./anm/graphics/sheet.js'),
    segments = require('./anm/graphics/segments.js');

// Public Namespace
// -----------------------------------------------------------------------------
var anm = {
    global: global,
    constants: constants,
    C: constants, // for backwards compatibility
    modules: require('./anm/modules.js'),
    importers: require('./anm/importers.js'),
    conf: require('./anm/conf.js'),
    log: require('./anm/log.js'),
    engine: engine,
    events: require('./anm/events.js'),
    resource_manager: require('./anm/resource_manager.js'),
    player_manager: require('./anm/player_manager.js'),
    loc: require('./anm/loc.js'),
    errors: require('./anm/errors.js'),
    utils: require('./anm/utils.js'),

    Player: Player,
    Animation: require('./anm/animation/animation.js'),
    Element: Element,
    Clip: Element,
    Path: require('./anm/graphics/path.js'),
    Text: require('./anm/graphics/text.js'),
    Sheet: Sheet,
    Image: Sheet,
    Modifier: require('./anm/animation/modifier.js'),
    Painter: require('./anm/animation/painter.js'),
    Brush: require('./anm/graphics/brush.js'),
    Color: require('./anm/graphics/color.js'),
    Tween: require('./anm/animation/tween.js'),
    Audio: require('./anm/media/audio.js'),
    Video: require('./anm/media/video.js'),
    MSeg: segments.MSeg,
    LSeg: segments.LSeg,
    CSeg: segments.CSeg,

    createPlayer: function(elm, opts) {
        if (!engine.canvasSupported) {
          document.getElementById(elm).innerHTML = anm.loc.Errors.S.SAD_SMILEY_HTML;
          return null;
        }
        var p = new Player();
        p.init(elm, opts);
        return p;
    },

    createImporter: function(importer) {
      if(window.console) console.warn('anm.createImporter is deprecated and will be removed soon.' +
        ' Please use anm.importers.create instead');
      return anm.importers.create(importer);
    }
};

// Export
// -----------------------------------------------------------------------------
global[PUBLIC_NAMESPACE] = anm;
module.exports = anm;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./anm/animation/animation.js":1,"./anm/animation/element.js":4,"./anm/animation/modifier.js":5,"./anm/animation/painter.js":6,"./anm/animation/tween.js":7,"./anm/conf.js":8,"./anm/constants.js":9,"./anm/errors.js":10,"./anm/events.js":11,"./anm/graphics/brush.js":14,"./anm/graphics/color.js":15,"./anm/graphics/path.js":16,"./anm/graphics/segments.js":17,"./anm/graphics/sheet.js":18,"./anm/graphics/text.js":19,"./anm/importers.js":20,"./anm/loc.js":22,"./anm/log.js":23,"./anm/media/audio.js":24,"./anm/media/video.js":25,"./anm/modules.js":26,"./anm/player.js":27,"./anm/player_manager.js":28,"./anm/resource_manager.js":30,"./anm/utils.js":34,"engine":35}],37:[function(require,module,exports){
/**
 * @private @class FontDetector
 *
 * JavaScript code to detect available availability of a
 * particular font in a browser using JavaScript and CSS.
 *
 * Author : Lalit Patel
 * Website: http://www.lalit.org/lab/javascript-css-font-detect/
 * License: Apache Software License 2.0
 *          http://www.apache.org/licenses/LICENSE-2.0
 * Version: 0.15 (21 Sep 2009)
 *          Changed comparision font to default from sans-default-default,
 *          as in FF3.0 font of child element didn't fallback
 *          to parent element if the font is missing.
 * Version: 0.2 (04 Mar 2012)
 *          Comparing font against all the 3 generic font families ie,
 *          'monospace', 'sans-serif' and 'sans'. If it doesn't match all 3
 *          then that font is 100% not available in the system
 * Version: 0.3 (24 Mar 2012)
 *          Replaced sans with serif in the list of baseFonts
 *
 * ----
 *
 * Usage:
 *
 * `d = new FontDetector();`
 *
 * `d.detect('font name');`
 *
 */
var FontDetector = function() {
    // a font will be compared against all the three default fonts.
    // and if it doesn't match all 3 then that font is not available.
    var baseFonts = ['monospace', 'sans-serif', 'serif'];

    //we use m or w because these two characters take up the maximum width.
    // And we use a LLi so that the same matching fonts can get separated
    var testString = "mmmmmmmmmmlli";

    //we test using 72px font size, we may use any size. I guess larger the better.
    var testSize = '72px';

    var h = document.getElementsByTagName("body")[0];

    // create a SPAN in the document to get the width of the text we use to test
    var s = document.createElement("span");
    s.style.fontSize = testSize;
    s.style.position = 'absolute';
    s.style.top = '-9999px';
    s.style.left = '-9999px';
    s.innerHTML = testString;
    var defaultWidth = {};
    var defaultHeight = {};
    for (var index in baseFonts) {
        //get the default width for the three base fonts
        s.style.fontFamily = baseFonts[index];
        h.appendChild(s);
        defaultWidth[baseFonts[index]] = s.offsetWidth; //width for the default font
        defaultHeight[baseFonts[index]] = s.offsetHeight; //height for the defualt font
        h.removeChild(s);
    }

    function detect(font) {
        var detected = false;
        for (var index in baseFonts) {
            s.style.fontFamily = font + ',' + baseFonts[index]; // name of the font along with the base font for fallback.
            h.appendChild(s);
            var matched = (s.offsetWidth != defaultWidth[baseFonts[index]] || s.offsetHeight != defaultHeight[baseFonts[index]]);
            h.removeChild(s);
            detected = detected || matched;
        }
        return detected;
    }

    this.detect = detect;
};


if (typeof module !== 'undefined') {
  module.exports = FontDetector;
}

},{}],38:[function(require,module,exports){
/*
 * Storing Transform Matrix
 * ===========================================
 * Last updated September 2011 by Simon Sarris
 * www.simonsarris.com
 * sarris@acm.org
 *
 * Free to use and distribute at will
 * So long as you are nice to people, etc
 *
 * (slightly modified by shaman.sir@gmail.com) */

// Simple class for keeping track of the current transformation matrix

// For instance:
//    var t = new Transform();
//    t.rotate(5);
//    t.apply(ctx);

// Is equivalent to:
//    ctx.rotate(5);

// But now you can retrieve it :)

// Remember that this does not account for any CSS transforms applied to the canvas

// TODO: use somewhat closer to AfineTransform from

function Transform() {
  this.m = [1,0,0,1,0,0];
}

Transform.prototype.reset = function() {
  this.m = [1,0,0,1,0,0];
};

Transform.prototype.multiply = function(matrix) {
  var m11 = this.m[0] * matrix.m[0] + this.m[2] * matrix.m[1];
  var m12 = this.m[1] * matrix.m[0] + this.m[3] * matrix.m[1];

  var m21 = this.m[0] * matrix.m[2] + this.m[2] * matrix.m[3];
  var m22 = this.m[1] * matrix.m[2] + this.m[3] * matrix.m[3];

  var dx = this.m[0] * matrix.m[4] + this.m[2] * matrix.m[5] + this.m[4];
  var dy = this.m[1] * matrix.m[4] + this.m[3] * matrix.m[5] + this.m[5];

  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
  this.m[4] = dx;
  this.m[5] = dy;
};

Transform.prototype.invert = function() {
  var d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]);
  var m0 = this.m[3] * d;
  var m1 = -this.m[1] * d;
  var m2 = -this.m[2] * d;
  var m3 = this.m[0] * d;
  var m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]);
  var m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
  this.m[0] = m0;
  this.m[1] = m1;
  this.m[2] = m2;
  this.m[3] = m3;
  this.m[4] = m4;
  this.m[5] = m5;
};

Transform.prototype.rotate = function(rad) {
  var c = Math.cos(rad);
  var s = Math.sin(rad);
  var m11 = this.m[0] * c + this.m[2] * s;
  var m12 = this.m[1] * c + this.m[3] * s;
  var m21 = this.m[0] * -s + this.m[2] * c;
  var m22 = this.m[1] * -s + this.m[3] * c;
  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
};

Transform.prototype.rotateDegrees = function(angle) {
  var rad = angle * Math.PI / 180;
  var c = Math.cos(rad);
  var s = Math.sin(rad);
  var m11 = this.m[0] * c + this.m[2] * s;
  var m12 = this.m[1] * c + this.m[3] * s;
  var m21 = this.m[0] * -s + this.m[2] * c;
  var m22 = this.m[1] * -s + this.m[3] * c;
  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
};

Transform.prototype.translate = function(x, y) {
  this.m[4] += this.m[0] * x + this.m[2] * y;
  this.m[5] += this.m[1] * x + this.m[3] * y;
};

Transform.prototype.scale = function(sx, sy) {
  this.m[0] *= sx;
  this.m[1] *= sx;
  this.m[2] *= sy;
  this.m[3] *= sy;
};

Transform.prototype.transformPoint = function(x, y) {
  return { x: (x * this.m[0] + y * this.m[2] + this.m[4]),
           y: (x * this.m[1] + y * this.m[3] + this.m[5]) };
};

// customized methods

Transform.prototype.shear = function(hx, hy) {
  var m11 = this.m[0] + this.m[2] * hy;
  var m12 = this.m[1] + this.m[3] * hy;
  var m21 = this.m[0] * hx + this.m[2];
  var m22 = this.m[1] * hx + this.m[3];
  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
};

Transform.prototype.apply = function(ctx) {
  var m = this.m;
  ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
};

Transform.prototype.clone = function() {
  var cl = new Transform();
  cl.m[0] = this.m[0];
  cl.m[1] = this.m[1];
  cl.m[2] = this.m[2];
  cl.m[3] = this.m[3];
  cl.m[4] = this.m[4];
  cl.m[5] = this.m[5];
  return cl;
};

Transform.prototype.inverted = function() {
  var clone = this.clone();
  clone.invert();
  return clone;
};

/* TODO:?
Transform.prototype.extract = function() {

} */

if (typeof module !== 'undefined') module.exports = Transform;

},{}]},{},[36]);
/*
 * Copyright (c) 2011-@COPYRIGHT_YEAR by Animatron.
 * All rights are reserved.
 *
 * Animatron Player is licensed under the MIT License, see LICENSE.
 *
 * @VERSION
 */

// see ./animatron-project-@VERSION.orderly for a readable scheme of accepted project

// This importer imports only the compact format of animations (where all elements are arrays
// of arrays)

/**
 * @class anm.AnimatronImporter
 */
var AnimatronImporter = (function() {

var IMPORTER_ID = 'ANM'; // FIXME: change to 'animatron', same name as registered

var C = anm.constants,
    Animation = anm.Animation,
    Element = anm.Element,
    Path = anm.Path,
    Text = anm.Text,
    Brush = anm.Brush,
    Bands = anm.Bands,
    Tween = anm.Tween,
    MSeg = anm.MSeg,
    LSeg = anm.LSeg,
    CSeg = anm.CSeg,
    Audio = anm.Audio,
    Video = anm.Video,
    is = anm.utils.is,
    $log = anm.log;
    //test = anm._valcheck

function _reportError(e) {
    $log.error(e);
    // throw e; // skip errors if they do not affect playing ability
}

var Import = {};

var cur_import_id;

// -> Array[?]
Import._find = function(idx, src) {
    var res = src[idx];
    if (!res) _reportError('Element with index ' + idx + ' was not found' +
                            (src ? ' among ' + src.length + ' elements.' : '.') );
    return src[idx];
};

// -> Integer
Import._type = function(src) {
    return src[0];
};

/** project **/
/*
 * object {
 *     object *meta*;     // meta info about the project (the same as for full format)
 *     object *anim*;     // animation info
 * } *project*;
 */
// -> Animation
Import.project = function(prj) {
    //if (window && console && window.__anm_conf && window.__anm_conf.logImport) $log.debug(prj);
    if (anm.conf.logImport) $log.debug(prj);
    cur_import_id = anm.utils.guid();
    anm.lastImportedProject = prj;
    anm.lastImportId = cur_import_id;
    var scenes_ids = prj.anim.scenes;
    if (!scenes_ids.length) _reportError('No scenes found in given project');
    var root = new Animation(),
        elems = prj.anim.elements,
        last_scene_band = [ 0, 0 ];
    root.__import_id = cur_import_id;

    root.meta = Import.meta(prj);
    root.fonts = Import.fonts(prj);
    Import.root = root;
    Import.anim(prj, root); // will inject all required properties directly in scene object
    if (prj.meta.duration) root.duration = prj.meta.duration;

    var _a = prj.anim;

    Import._paths = prj.anim.paths;
    Import._path_cache = new ValueCache();

    var node_res;
    var traverseFunc = function(elm) {
        var e_gband_before = elm.gband;
        elm.gband = [ last_scene_band[1] + e_gband_before[0],
        last_scene_band[1] + e_gband_before[1] ];
    };

    for (var i = 0, il = scenes_ids.length; i < il; i++) {
        var node_src = Import._find(scenes_ids[i], elems);
        if (Import._type(node_src) != TYPE_SCENE) _reportError('Given Scene ID ' + scenes_ids[i] + ' points to something else');
        node_res = Import.node(node_src, elems, null, root);
        //ignore empty scenes - if the band start/stop equals, the scene is of duration = 0
        if (node_res.gband[0] == node_res.gband[1]) {
            continue;
        }

        if (i > 0) { // start from second scene, if there is one
            // FIXME: smells like a hack
            // correct the band of the next scene to follow the previous scene
            // gband[1] contains the duration of the scene there, while gband[0] contains 0
            // (see SCENE type handling in Import.node)
            // TODO: fix it with proper native scenes when they will be supported in player
            var gband_before = node_res.gband;
            node_res.gband = [ last_scene_band[1] + gband_before[0],
                               last_scene_band[1] + gband_before[1] ];
            // local band is equal to global band on top level
            node_res.lband = node_res.gband;
            node_res.traverse(traverseFunc);
        }
        last_scene_band = node_res.gband;
        root.add(node_res);
    }

    if (scenes_ids.length > 0) {
        node_res.gband = [last_scene_band[0], Infinity];
        node_res.lband = node_res.gband;
    }

    Import._paths = undefined; // clear
    Import._path_cache = undefined;

    return root;
};
/** meta **/
// -> Object
Import.meta = function(prj) {
    var _m = prj.meta;
    return {
        'title': _m.name,
        'author': _m.author,
        'copyright': _m.copyright,
        'version': _m.version,
        'description': _m.description,
        'duration': _m.duration,
        'created': _m.created,
        'modified': _m.modified,
        '_anm_id': _m.id
    };
};

Import.fonts = function(prj) {
    return prj.anim.fonts;
};
/** anim **/
/*
 * object {
 *     array { number; number; } dimension;
 *     *fill* background;             // project background
 *     array [ *element* ] elements;  // array of all elements including scenes - top level elements
 *     array [ number; ] scenes;      // array of indices into elements array
 * } *anim*;
 */
// -> Object
Import.anim = function(prj, trg) {
    var _a = prj.anim;
    trg.fps = _a.framerate;
    trg.width = _a.dimension ? Math.floor(_a.dimension[0]) : undefined;
    trg.height = _a.dimension ? Math.floor(_a.dimension[1]): undefined;
    trg.bgfill = _a.background ? Import.fill(_a.background) : undefined;
    trg.zoom = _a.zoom || 1.0;
    trg.speed = _a.speed || 1.0;
    if (_a.loop && ((_a.loop === true) || (_a.loop === 'true'))) trg.repeat = true;
};

var TYPE_UNKNOWN =  0,
    TYPE_CLIP    =  1,
    TYPE_SCENE   =  2,
    TYPE_PATH    =  3,
    TYPE_TEXT    =  4,
    TYPE_IMAGE   =  8,
    TYPE_GROUP   =  9,
    TYPE_AUDIO   = 14,
    TYPE_FONT    = 25,
    TYPE_VIDEO   = 26,
    TYPE_LAYER   = 255; // is it good?

function isPath(type) {
    return (type == TYPE_PATH);
}

/** node **/
/*
 * union {
 *     *shape_element*;
 *     *text_element*;
 *     *image_element*;
 *     *audio_element*;
 *     *clip_element*;
 * } *element*;
 */
// -> Element
Import.node = function(src, all, parent, anim) {
    var type = Import._type(src),
        trg = null;
    if ((type == TYPE_CLIP) ||
        (type == TYPE_SCENE) ||
        (type == TYPE_GROUP)) {
        trg = Import.branch(type, src, all, anim);
    } else if (type != TYPE_UNKNOWN) {
        trg = Import.leaf(type, src, parent, anim);
    }
    if (trg) {
        trg._anm_type = type;
        Import.callCustom(trg, src, type);
    }
    return trg;
};

var L_ROT_TO_PATH = 1,
    L_OPAQUE_TRANSFORM = 2;
    L_VISIBLE = 4;
/** branch (clip) **/
/*
 * array {
 *     number;                     // 0, type: 1 for clip, 9 for group
 *     string;                     // 1, name
 *     array [ *layer* ];          // 2, layers
 * } *group_element*, *clip_element*;
 *
 * array {
 *     2;                          // 0, type: scene
 *     string;                     // 1, name
 *     number;                     // 2, duration
 *     array [ *layer* ];          // 3, layers
 * } *group_element*;
 */
// -> Element
Import.branch = function(type, src, all, anim) {
    var trg = new Element();
    trg.name = src[1];
    var _layers = (type == TYPE_SCENE) ? src[3] : src[2],
        _layers_targets = [];
    if (type == TYPE_SCENE) {
        trg.gband = [ 0, src[2] ];
        trg.lband = [ 0, src[2] ];
    } else {
        trg.gband = [ 0, Infinity ];
        trg.lband = [ 0, Infinity ];
    }
    // in animatron layers are in reverse order
    for (var li = _layers.length; li--;) {
        /** layer **/
        /*
         * array {
         *     number;                     // 0, index of element in the elements array
         *     string;                     // 1, name
         *     *band*;                     // 2, band, default is absent, default is [0, infinity]
         *     number;                     // 3, if more than zero the number of masked layers under this one
         *     array { number; number; };  // 4, registration point, default is [0,0]
         *     *end-action*;               // 5, end action for this layer
         *     number;                     // 6, flags: 0x01 - rotate to path, 0x02 - opaque transform (TBD), 0x03 - visible
         *     array [ *tween* ];          // 7, array of tweens
         * } *layer*;
         */
        var lsrc = _layers[li];

        var nsrc = Import._find(lsrc[0], all);
        if (!nsrc) continue;

        // if there is a branch under the node, it will be a wrapper
        // if it is a leaf, it will be the element itself
        var ltrg = Import.node(nsrc, all, trg, anim);
        if (!ltrg.name) { ltrg.name = lsrc[1]; }

        // apply bands, pivot and registration point
        var flags = lsrc[6];
        ltrg.disabled = !(flags & L_VISIBLE);
        var b = Import.band(lsrc[2]);
        ltrg.lband = b;
        ltrg.gband = b;
        ltrg.$pivot = [ 0, 0 ];
        ltrg.$reg = lsrc[4] || [ 0, 0 ];

        // apply tweens
        if (lsrc[7]) {
            var translates;
            for (var tweens = lsrc[7], ti = 0, tl = tweens.length;
                 ti < tl; ti++) {
                var t = Import.tween(tweens[ti]);
                if (!t) continue;
                if (t.tween == C.T_TRANSLATE) {
                    if (!translates) translates = [];
                    translates.push(t);
                }
                ltrg.tween(t);
            }
            if (translates && (flags & L_ROT_TO_PATH)) {
                var rtp_tween;
                for (ti = 0, til = translates.length; ti < til; ti++) {
                    rtp_tween = new Tween(C.T_ROT_TO_PATH);
                    if (translates[ti].$band) rtp_tween.band(translates[ti].$band);
                    if (translates[ti].$easing) rtp_tween.easing(translates[ti].$easing);
                    ltrg.tween(rtp_tween);
                }
            }
            translates = [];
        }

        /** end-action **/
        /*
         * union {
         *    array { number; };          // end action without counter, currently just one: 0 for "once"
         *    array { number; number; };  // end action with counter. first number is type: 1-loop, 2-bounce, second number is counter: 0-infinite
         * } *end-action*;
         */
        // transfer repetition data
        if (lsrc[5]) {
            ltrg.mode = Import.mode(lsrc[5][0]);
            if (lsrc[5].length > 1) {
                ltrg.nrep = lsrc[5][1] || Infinity;
            }
        } else {
            ltrg.mode = Import.mode(null);
        }

        // Clips' end-actions like in Editor are not supported in Player,
        // but they may be adapted to Player's model (same as Group in Editor)
        if ((ltrg._anm_type == TYPE_CLIP) && (ltrg.mode != C.R_ONCE)) {
            ltrg.asClip([0, ltrg.lband[1] - ltrg.lband[0]], ltrg.mode, ltrg.nrep);
            ltrg.lband = [ ltrg.lband[0], Infinity ];
            ltrg.gband = [ ltrg.gband[0], Infinity ];
            ltrg.mode = C.R_STAY;
            ltrg.nrep = Infinity;
        }

        // if do not masks any layers, just add to target
        // if do masks, set it as a mask for them while not adding
        if (!lsrc[3]) { // !masked
            trg.add(ltrg);
            _layers_targets.push(ltrg);
        } else {
            // layer is a mask, apply it to the required number
            // of previously collected layers
            var mask = ltrg,
                togo = lsrc[3], // layers below to apply mask
                targets_n = _layers_targets.length;
            if (togo > targets_n) {
                _reportError('No layers collected to apply mask, expected ' +
                            togo + ', got ' + targets_n);
                togo = targets_n;
            }
            while (togo) {
                var masked = _layers_targets[targets_n-togo];
                masked.mask(mask);
                togo--;
            }
        }

        Import.callCustom(ltrg, lsrc, TYPE_LAYER);

        // TODO temporary implementation, use custom renderer for that!
        if (ltrg.$audio && ltrg.$audio.master) {
            ltrg.lband = [ltrg.lband[0], Infinity];
            ltrg.gband = [ltrg.gband[0], Infinity];
            trg.remove(ltrg);
            anim.add(ltrg);
        }
    }

    return trg;
};

/** leaf **/
// -> Element
Import.leaf = function(type, src, parent/*, anim*/) {
    var trg = new Element();
         if (type == TYPE_IMAGE) { trg.$image = Import.sheet(src); }
    else if (type == TYPE_TEXT)  { trg.$text  = Import.text(src);  }
    else if (type == TYPE_AUDIO) {
        trg.type = C.ET_AUDIO;
        trg.$audio = Import.audio(src);
        trg.$audio.connect(trg);
    }
    else if (type == TYPE_VIDEO) {
        trg.type = C.ET_VIDEO;
        trg.$video = Import.video(src);
        trg.$video.connect(trg);
    }
    else { trg.$path  = Import.path(src);  }
    if (trg.$path || trg.$text) {
        trg.$fill = Import.fill(src[1]);
        trg.$stroke = Import.stroke(src[2]);
        trg.$shadow = Import.shadow(src[3]);
    }
    // FIXME: fire an event instead (event should inform about type of the importer)
    return trg;
};


// call custom importers
Import.callCustom = function(trg, src, type) {
    // FIXME: this code should be in player code
    if (Element._customImporters && Element._customImporters.length) {
        var importers = Element._customImporters;
        for (var i = 0, il = importers.length; i < il; i++) {
            importers[i].call(trg, src, type, IMPORTER_ID, cur_import_id);
        }
    }
};

/** band **/
// -> Array[2, Float]
Import.band = function(src) {
    if (!src || !src.length) return [ 0, Infinity ];
    if (src.length == 1) return [ src[0], Infinity ];
    if (src.length == 2) return src;
    _reportError('Unknown format of band: ' + src);
};

/** path (shape) **/
/*
 * array {
 *     number;    // 0, any number which is not clip(1), scene(2), group(9), audio(14), image(8), text(4)
 *     *fill*;    // 1
 *     *stroke*;  // 2
 *     *shadow*;  // 3
 *     string;    // 4, svg encoded path (or new format)
 * } *shape_element*;
 */
// -> Path
Import.path = function(src) {
    var path = Import._pathDecode(src[4]);
    if (!path) return;
    return new Path(path);
};

/*
 * Could be either String or Binary encoded path
 */
Import._pathDecode = function(src) {
    if (is.str(src)) return src;
    if (!is.num(src) || (src == -1)) return null;

    var encoded = Import._paths[src];
    if (!encoded) return;

    var val = Import._path_cache.get(encoded);
    if (val) {
        return [].concat(val.segs);
    } else {
        val = Import._decodeBinaryPath(encoded);
        if (!val) return null;
        Import._path_cache.put(encoded, val);
    }

    return val.segs;
};

Import._decodeBinaryPath = function(encoded) {
    var path = new Path();
    if (encoded) {
        encoded = encoded.replace(/\s/g, ''); // TODO: avoid this by not formatting base64 while exporting
        try {
            var decoded = Base64Decoder.decode(encoded);
            var s = new BitStream(decoded);
            var base = [0, 0];
            if (s) {
                var _do = true;
                while (_do) {
                    var type = s.readBits(2), p;
                    switch (type) {
                        case 0:
                            p = Import._pathReadPoint(s, [], base);
                            base = p;

                            path.add(new MSeg(p));
                            break;
                        case 1:
                            p = Import._pathReadPoint(s, [], base);
                            base = p;

                            path.add(new LSeg(p));
                            break;
                        case 2:
                            p = Import._pathReadPoint(s, [], base);
                            Import._pathReadPoint(s, p);
                            Import._pathReadPoint(s, p);
                            base = [p[p.length - 2], p[p.length - 1]];

                            path.add(new CSeg(p));
                            break;
                        case 3:
                            _do = false;
                            break;
                        default:
                            _do = false;
                            _reportError('Unknown type "' + type + ' for path "' + encoded + '"');
                            break;
                    }
                }
            } else {
                _reportError('Unable to decode Path "' + encoded + '"');
                return null;
            }
        } catch (err) {
            _reportError('Unable to decode Path "' + encoded + '"');
            return null;
        }
    }

    return path;
};

Import._pathReadPoint = function(stream, target, base) {
    var l = stream.readBits(5);
    if (l <= 0) {
        throw new Error('Failed to decode path, wrong length (<= 0)');
    }

    var x = stream.readSBits(l);
    var y = stream.readSBits(l);

    var b_x = base ? base[0] : (target.length ? target[target.length - 2] : 0);
    var b_y = base ? base[1] : (target.length ? target[target.length - 1] : 0);

    target.push(b_x + x / 1000.0);
    target.push(b_y + y / 1000.0);
    return target;
};

/** text **/
/*
 * array {
 *     4;                // 0
 *     *fill*;           // 1
 *     *stroke*;         // 2
 *     *shadow*;         // 3
 *     string;           // 4, css font
 *     string;           // 5, aligment: left/right/center // IMPL
 *     string;           // 6, text
 *     number;           // 7, flags, currently just one: 1 - underline // IMPL
 * } *text_element*;
 */
var TEXT_UNDERLINE = 1,
    TEXT_MID_BASELINE = 2;
// -> Text
Import.text = function(src) {
    var lines = is.arr(src[6]) ? src : src[6].split('\n');
    return new Text((lines.length > 1) ? lines : lines[0],
                    src[4],
                    src[5], // align
                    (src[7] & TEXT_MID_BASELINE) ? 'middle' : 'bottom',
                    (src[7] & TEXT_UNDERLINE) ? true : false);
};
/** sheet (image) **/
/*
 * array {
 *     8;                          // 0
 *     string;                     // 1, url
 *     array { number; number; };  // 2, size [optional]
 * } *image_element*;
 */
// -> Sheet
Import.sheet = function(src) {
    var sheet = new anm.Sheet(src[1]);
    if (src[2]) sheet._dimen = src[2];
    return sheet;
};
/** tween **/
/*
 * union {
 *     *alpha_tween*;
 *     *rotate_tween*;
 *     *translate_tween*;
 *     *shear_tween*;
 *     *scale_tween*;
 * } *tween*;
 *
 * array {
 *     0;                          // 0, type
 *     array { number; number; };  // 1, band
 *     *easing*;                   // 2, optional easing
 *     union {
 *         array { number; };         // static alpha
 *         array { number; number; }; // alpha from, to
 *     };                          // 3
 * } *alpha_tween*;
 *
 * array {
 *     1;                          // 0, type
 *     array { number; number; };  // 1, band
 *     *easing*;                   // 2, optional easing
 *     union {
 *       array { number; };         // static rotate
 *       array { number; number; }; // rotate from, to
 *     };                          // 3
 * } *rotate_tween*;
 *
 * array {
 *     2;                          // 0, type
 *     array { number; number; };  // 1, band
 *     *easing*;                   // 2, optional easing
 *     union {
 *       array { number; };         // static sx=sy
 *       array { number; number; }; // dynamic from, to (sx=sy)
 *       array { number; number; number; number; }; // sx0, sy0, sx1, sy1
 *     };                          // 3
 * } *scale_tween*;
 *
 * array {
 *     3;                          // 0, type
 *     array { number; number; };  // 1, band
 *     *easing*;                   // 2, optional easing
 *     union {
 *       array { number; };         // static shx=shy
 *       array { number; number; }; // dynamic from, to (shx=shy)
 *       array { number; number; number; number; }; // shx0, shy0, shx1, shy1
 *     };                          // 3
 * } *shear_tween*;
 *
 * array {
 *     4;                          // 0, type
 *     array { number; number; };  // 1, band
 *     *easing*;                   // 2, optional easing
 *     string;                     // 3, path
 * } *translate_tween*;
 */
// -> Tween
Import.tween = function(src) {
    var type = Import.tweentype(src[0]);
    if (type === null) return null;
    var tween = new Tween(type, Import.tweendata(type, src[3]))
                          .band(Import.band(src[1])),
        easing = Import.easing(src[2]);
    if (easing) tween.easing(easing);
    return tween;
};
/** tweentype **/
// -> Type
Import.tweentype = function(src) {
    if (src === 0) return C.T_ALPHA;
    if (src === 1) return C.T_ROTATE;
    if (src === 2) return C.T_SCALE;
    if (src === 3) return C.T_SHEAR;
    if (src === 4) return C.T_TRANSLATE;
    //if (src === 5) return C.T_ROT_TO_PATH;
    if (src === 7) return C.T_VOLUME;
    if (src === 9) return C.T_FILL;
    if (src === 10) return C.T_STROKE;
    if (src === 11) return C.T_SHADOW;
};
/** tweendata **/
// -> Any
Import.tweendata = function(type, src) {
    if (src === null) return null; // !!! do not optimize to !src since 0 can also happen
    if (type === C.T_TRANSLATE) return Import.pathval(src);
    if ((type === C.T_ROTATE) ||
        (type === C.T_ALPHA)) {
        if (src.length == 2) return src;
        if (src.length == 1) return [ src[0], src[0] ];
    }
    if ((type === C.T_SCALE) ||
        (type === C.T_SHEAR)) {
        if (src.length == 4) return [ [ src[0], src[1] ],
                                      [ src[2], src[3] ] ];
        if (src.length == 2) return [ [ src[0], src[1] ],
                                      [ src[0], src[1] ] ];
        if (src.length == 1) return [ [ src[0], src[0] ],
                                      [ src[0], src[0] ] ];
    }
    if (type === C.T_FILL) {
        return [Import.fill(src[0]), Import.fill(src[1])];
    }
    if (type === C.T_STROKE) {
        return [Import.stroke(src[0]), Import.stroke(src[1])];
    }
    if (type === C.T_SHADOW) {
        return [Import.shadow(src[0]), Import.shadow(src[1])];
    }
    if (type === C.T_VOLUME) {
      if (src.length == 2) return src;
      if (src.length == 1) return [ src[0], src[0] ];
    }

};
/** easing **/
/*
 * union {
 *     number;                     // 0, standard type: 0, 1, 2, 3 (tbd)
 *     string;                     // 1, svg encoded curve segment
 * } *easing*;
 */
// -> Object
Import.easing = function(src) {
    if (!src) return null;
    if (is.str(src)) {
        return {
            type: C.E_PATH,
            data: Import.pathval('M0 0 ' + src + ' Z')
        };
    } else if (is.num(src)) {
        return {
            type: C.E_STDF,
            data: src
        };
    }
};
/** mode **/
Import.mode = function(src) {
    if (!src) return C.R_ONCE;
    if (src === 0) return C.R_ONCE;
    if (src === 1) return C.R_LOOP;
    if (src === 2) return C.R_BOUNCE;
    if (src === 3) return C.R_STAY;
};
/** brush (paint) **/
/*
 * union {
 *     string;          // color in rgba(), rgb, #xxxxxx or word format
 *     *lgrad*;         // linear gradient
 *     *rgrad*;         // radial gradient
 * } *paint*;
 */
 /** fill **/
Import.fill = function(src) {
    if (!src) return Brush.fill('transparent');
    if (is.str(src)) {
        return Brush.fill(src);
    } else if (is.arr(src)) {
        if (is.arr(src[0])) {
            return Brush.fill(Import.grad(src));
        }
        return Brush.fill(Import.pattern(src));
    } else _reportError('Unknown type of brush');
};
/** stroke **/
/*
 * union {
 *     array {
 *        number;       // 0, width
 *        *paint*;      // 1
 *     };
 *     array {
 *        number;       // 0, width
 *        *paint*;      // 1
 *        string;       // 2, linecap ("round"if empty)
 *        string;       // 3, linejoin ("round" if empty)
 *        number;       // 4, mitterlimit
 *     }
 * } *stroke*;
 */
Import.stroke = function(src) {
    if (!src) return null;
    var fill;
    if (is.str(src[1])) {
        fill = src[1];
    } else if (is.arr(src[1])) {
        if (is.arr(src[1][0])) {
            fill = Import.grad(src[1]);
        } else {
            fill = Import.pattern(src[1]);
        }
    }
    return Brush.stroke(fill, // paint
                        src[0], // width
                        src[2] || C.PC_ROUND, // cap
                        src[3] || C.PC_ROUND, // join
                        src[4]); // mitter
};
/** shadow **/
/*
 * array {
 *     number;       // 0, x
 *     number;       // 1, y
 *     number;       // 2, blur
 *     string;       // 3, css color
 * } *shadow*;
 */
Import.shadow = function(src) {
    if (!src) return null;
    return Brush.shadow(src[3],  // paint, never a gradient
                        src[2],  // blur-radius
                        src[0],  // offsetX
                        src[1]); // offsetY
};
/** lgrad **/
/*
 * array {          // linear gradient
 *     array {
 *         number;  // x0
 *         number;  // y0
 *         number;  // x1
 *         number;  // y1
 *     }; // 0
 *     array [ string; ]; // 1, colors
 *     array [ number; ]; // 2, offsets
 * }
 */
/** rgrad **/
/*
 * array {          // radial gradient
 *     array {
 *         number;  // x0
 *         number;  // y0
 *         number;  // r0
 *         number;  // x1
 *         number;  // y1
 *         number;  // r1
 *     }; // 0
 *     array [ string; ]; // 1, colors
 *     array [ number; ]; // 2, offsets
 * }
 */
Import.grad = function(src) {
    var pts = src[0],
        colors = src[1],
        offsets = src[2];
    if (colors.length != offsets.length) {
        _reportError('Number of colors do not corresponds to number of offsets in gradient');
    }
    var stops = [];
    for (var i = 0; i < offsets.length; i++) {
        stops.push([ offsets[i], colors[i] ]);
    }
    if (pts.length == 4) {
        return {
            dir: [ [ pts[0], pts[1] ], [ pts[2], pts[3] ] ],
            stops: stops
        };
    } else if (pts.length == 6) {
        return {
            r: [ pts[2], pts[5] ],
            dir: [ [ pts[0], pts[1] ], [ pts[3], pts[4] ] ],
            stops: stops
        };
    } else {
        _reportError('Unknown type of gradient with ' + pts.length + ' points');
    }
};
/*
array {          // pattern
number;      // id of either shapeelement or image element
number;      // 0 - no repeat, 1 - repeat xy, 2 - repeat x, 3 - repeat y
number;      // width
number;      // height
array { number; number; number; number; }  // rectangle, inner bounds
number;      // opacity
}
*/
var repeats = ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'];

Import.pattern = function(src) {
    var el = anm.lastImportedProject.anim.elements[src[0]],
        elm = Import.leaf(Import._type(el), el);

    elm.alpha = src[5];
    elm.disabled = true;
    Import.root.add(elm);
    return {
        elm: elm,
        repeat: repeats[src[1]],
        w: src[2],
        h: src[3],
        bounds: src[4]
    };
};

/** pathval **/
Import.pathval = function(src) {
    return new Path(Import._pathDecode(src));
};

Import.audio = function(src) {
    var audio = new Audio(src[1]);
    audio.offset = src[2];
    audio.master = src[3];
    return audio;
};

Import.video = function(src) {
    var video = new Video(src[1]);
    video.offset = src[2];
    return video;
};

// BitStream
// -----------------------------------------------------------------------------

function BitStream(int8array) {
    this.buf = int8array;
    this.pos = 0;
    this.bitPos = 0;
    this.bitsBuf = 0;
}

/*
 * Reads n unsigned bits
 */
BitStream.prototype.readBits = function(n) {
    var v = 0;
    for (;;) {
        var s = n - this.bitPos;
        if (s>0) {
            v |= this.bitBuf << s;
            n -= this.bitPos;
            this.bitBuf = this.readUByte();
            this.bitPos = 8;
        } else {
            s = -s;
            v |= this.bitBuf >> s;
            this.bitPos = s;
            this.bitBuf &= (1 << s) - 1;
            return v;
        }
    }
};

/*
 * Reads one unsigned byte
 */
BitStream.prototype.readUByte = function() {
    return this.buf[this.pos++]&0xff;
};

/*
 * Reads n signed bits
 */
BitStream.prototype.readSBits = function(n) {
    var v = this.readBits(n);
    // Is the number negative?
    if( (v&(1 << (n - 1))) !== 0 ) {
        // Yes. Extend the sign.
        v |= -1 << n;
    }

    return v;
};

// Base64 Decoder
// -----------------------------------------------------------------------------

function Base64Decoder() {}

// FIXME: one function is also enough here
/*
 * Returns int8array
 */
Base64Decoder.decode = function(str) {
    return Base64Decoder.str2ab(Base64Decoder._decode(str));
};

var Int8Array = window.Int8Array || Array;

Base64Decoder.str2ab = function(str) {
    var result = new Int8Array(str.length);
    for (var i=0, strLen=str.length; i<strLen; i++) {
        result[i] = str.charCodeAt(i);
    }
    return result;
};

Base64Decoder._decode = function(data) {
    if (window.atob) {
        // optimize
        return atob(data);
    }

    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        dec = "",
        tmp_arr = [];

    if (!data) {
        return data;
    }

    data += '';

    do { // unpack four hexets into three octets using index points in b64
        h1 = b64.indexOf(data.charAt(i++));
        h2 = b64.indexOf(data.charAt(i++));
        h3 = b64.indexOf(data.charAt(i++));
        h4 = b64.indexOf(data.charAt(i++));

        bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

        o1 = bits >> 16 & 0xff;
        o2 = bits >> 8 & 0xff;
        o3 = bits & 0xff;

        if (h3 == 64) {
            tmp_arr[ac++] = String.fromCharCode(o1);
        } else if (h4 == 64) {
            tmp_arr[ac++] = String.fromCharCode(o1, o2);
        } else {
            tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
        }
    } while (i < data.length);

    dec = tmp_arr.join('');

    return dec;
};

// Path cache
// -----------------------------------------------------------------------------

// FIXME: use an object and a hash function for this, no need in special class

function ValueCache() {
    this.hash2val = {};
}

ValueCache.prototype.put = function(str, val) {
    this.hash2val[this.hash(str)] = val;
};

ValueCache.prototype.get = function(str) {
    return this.hash2val[this.hash(str)];
};

ValueCache.prototype.hash = function(str) {
    var hash = 0, i, char;
    if (str.length === 0) return hash;
    for (i = 0, l = str.length; i < l; i++) {
        char  = str.charCodeAt(i);
        hash  = ((hash<<5)-hash)+char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

// Finish the importer
// -----------------------------------------------------------------------------

function __MYSELF() { }

__MYSELF.prototype.load = Import.project;

__MYSELF.Import = Import;

__MYSELF.IMPORTER_ID = IMPORTER_ID;

return __MYSELF;

})();

anm.importers.register('animatron', AnimatronImporter);

//module.exports = AnimatronImporter;
/*
* Copyright (c) 2011-@COPYRIGHT_YEAR by Animatron.
* All rights are reserved.
*
* Animatron Player is licensed under the MIT License, see LICENSE.
*
* @VERSION
*/

var Player = anm.Player;

var E = anm.Element;

var is = anm.utils.is,
    log = anm.log;

E._customImporters.push(function(source, type, importer, import_id) {
  if (importer === 'ANM') {

    switch(type) {
      case 2: // TYPE_SCENE
        if (source[4] && is.not_empty(source[4])) log.warn('Scripting from Animatron Editor is temporarily not supported');
      case 255: // TYPE_LAYER
        if (source[8] && is.not_empty(source[8])) log.warn('Scripting from Animatron Editor is temporarily not supported');
    }
  }
});

var conf = {};

anm.modules.register('scripting', conf);
/*
 * Copyright (c) 2011-@COPYRIGHT_YEAR by Animatron.
 * All rights are reserved.
 *
 * Animatron Player is licensed under the MIT License, see LICENSE.
 *
 * @VERSION
 */

// TODO: element.rect
// TODO: element.ellipse
// TODO: element.arc
// and so on

anm.modules.register('shapes', {});

var E = anm.Element;

var C = anm.C;

var Path = anm.Path,
    MSeg = anm.MSeg, LSeg = anm.LSeg, CSeg = anm.CSeg;

// case 'dot':  elm.dot(0, 0); break;
// case 'rect': elm.rect(0, 0, size.x, size.y); break;
// case 'oval': elm.oval(0, 0, size.x, size.y); break;
// case 'triangle': elm.triangle(0, 0, size.x, size.y); break;
//
E.prototype.dot = function(x, y) {
    this.type = C.ET_PATH;
    var me = this;
    this.paint(function(ctx) {
        ctx.save();
        ctx.save();
        ctx.beginPath();
        ctx.arc(x /*x*/, y /*y*/, 3 /* radius */, 0 /* start */, 2*Math.PI /* end */, false /* clockwise */);
        ctx.closePath();
        ctx.restore();
        me.applyBrushes(ctx);
        ctx.restore();
    });
}

E.prototype.rect = function(x, y, width, height) {
    // FIXME: or use painter instead, but specify Element.type
    //if (this.$path) { this.$path.reset(); }
    //var path = this.$path || (new Path());
    //this.invalidate();
    var path = new Path();
    path.add(new MSeg([ x, y ]));
    path.add(new LSeg([ x + width, y ]));
    path.add(new LSeg([ x + width, y + height]));
    path.add(new LSeg([ x, y + height]));
    path.add(new LSeg([ x, y ]));
    return this.path(path);
}

E.prototype.oval = function(x, y, width, height) {
    // ctx.ellipse(x, y, rx, ry, rotation, start, end, anticlockwise);
}

E.prototype.triangle = function(x, y, width, height) {
    var rx = width / 2;
    var ry = height / 2;

    var x0 = rx * Math.cos(0) + x;
    var y0 = ry * Math.sin(0) + y;
    var x1 = rx * Math.cos((1./3)*(2*Math.PI)) + x;
    var y1 = ry * Math.sin((1./3)*(2*Math.PI)) + y;
    var x2 = rx * Math.cos((2./3)*(2*Math.PI)) + x;
    var y2 = ry * Math.sin((2./3)*(2*Math.PI)) + y;

    var path = new Path();
    path.add(new MSeg([ x0, y0 ]));
    path.add(new LSeg([ x1, y1 ]));
    path.add(new LSeg([ x2, y2 ]));
    path.add(new LSeg([ x0, y0 ]));
    return this.path(path);
}
