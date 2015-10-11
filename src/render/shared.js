Rpd.Render = (function() {

var ƒ = Rpd.unit,
    invertValue = Rpd.not;

// =============================================================================
// ============================ Navigation =====================================
// =============================================================================

function Navigation(getPatchByHash) {
    this.currentPatch = null;
    this.getPatchByHash = getPatchByHash;

    var me = this;

    Kefir.fromEvents(window, 'hashchange')
         .map(function() { return (window.location.hash ? window.location.hash.slice(1) : null); })
         .filter(function(newHash) { return !(me.currentPatch && (newHash === me.currentPatch.id)); })
         .map(me.getPatchByHash)
         .filter(function(targetPatch) { return targetPatch != null; })
         .onValue(function(targetPatch) {
             if (me.currentPatch) me.currentPatch.exit(); // TODO: pass this value through a stream
             targetPatch.enter();
         });
}
Navigation.prototype.switch = function(targetPatch) {
    if (!targetPatch) return;
    this.currentPatch = targetPatch;
    if (document.title.indexOf('—') >= 0) {
        document.title = document.title.replace(/—.+$/, '— ' + targetPatch.name || '[Unnamed]');
    } else {
        document.title += ' — ' + targetPatch.name || '[Unnamed]';
    }
    window.location.hash = targetPatch.id;
}

// =============================================================================
// ============================= Placing =======================================
// =============================================================================

function GridPlacing(style) {
    this.nodeRects = [];
    this.edgePadding = style.edgePadding || { horizontal: 30, vertical: 20 };
    this.boxPadding  = style.boxPadding  || { horizontal: 20, vertical: 30 };
}
GridPlacing.DEFAULT_LIMITS = [ 1000, 1000 ]; // in pixels
GridPlacing.prototype.nextPosition = function(node, size, limits) {
    limits = limits || GridPlacing.DEFAULT_LIMITS;
    var nodeRects = this.nodeRects,
        boxPadding = this.boxPadding, edgePadding = this.edgePadding;
    var width =  size.width, height = size.height;
    var lastRect = (nodeRects.length ? nodeRects[nodeRects.length-1] : null);
    var newRect = { x: lastRect ? lastRect.x : edgePadding.horizontal,
                    y: lastRect ? (lastRect.y + lastRect.height + boxPadding.vertical)
                                : edgePadding.vertical,
                    width: width, height: height };
    if ((newRect.y + height + edgePadding.vertical) > limits.height) {
        newRect.x = newRect.x + width + boxPadding.horizontal;
        newRect.y = edgePadding.vertical;
    }
    nodeRects.push(newRect);
    return { x: newRect.x, y: newRect.y };
}

// =============================================================================
// ============================= DragAndDrop ===================================
// =============================================================================

function DragAndDrop(root) {
    this.root = root;
}

DragAndDrop.prototype.add = function(handle, spec) {
    var root = this.root;
    var start = spec.start, end = spec.end, drag = spec.drag;
    Kefir.fromEvents(handle.node(), 'mousedown').map(extractPos)
                                                .flatMap(function(pos) {
        var initPos = start(),
            diffPos = { x: pos.x - initPos.x,
                        y: pos.y - initPos.y };
        var moveStream = Kefir.fromEvents(root.node(), 'mousemove')
                              .map(stopPropagation)
                              .takeUntilBy(Kefir.merge([
                                  Kefir.fromEvents(root.node(), 'mouseup'),
                                  Kefir.fromEvents(handle.node(), 'mouseup')
                              ]))
                              .map(extractPos)
                              .map(function(absPos) {
                                  return { x: absPos.x - diffPos.x,
                                           y: absPos.y - diffPos.y };
                              }).toProperty(function() { return initPos; });
        moveStream.last().onValue(end);
        return moveStream;
    }).onValue(drag);
}

// =============================================================================
// ================================ Links ======================================
// =============================================================================

function VLinks() {
    // VLink instances
    // VLink implementation is currently custom for every renderer
    this.vlinks = {};
}
VLinks.prototype.clear = function() { this.vlinks = {}; }
VLinks.prototype.add = function(vlink) { this.vlinks[vlink.link.id] = vlink; }
VLinks.prototype.remove = function(vlink) {
    if (this.vlinks[vlink.link.id]) this.vlinks[vlink.link.id] = null;
}
VLinks.prototype.forEach = function(f) {
    var vlinks = this.vlinks;
    Object.keys(vlinks).forEach(function(id) {
        if (vlinks[id]) f(vlinks[id]);
    });
}
VLinks.prototype.updateAll = function() {
    this.forEach(function(vlink) { vlink.update(); });
}

// =============================================================================
// =============================== helpers =====================================
// =============================================================================

function mergeConfig(user_conf, defaults) {
    if (user_conf) {
        var merged = {};
        Object.keys(defaults).forEach(function(prop) { merged[prop] = defaults[prop]; });
        Object.keys(user_conf).forEach(function(prop) { merged[prop] = user_conf[prop]; });
        return merged;
    } else return defaults;
}

function preventDefault(evt) { evt.preventDefault(); return evt; };
function stopPropagation(evt) { evt.stopPropagation(); return evt; };
function extractPos(evt) { return { x: evt.clientX,
                                    y: evt.clientY }; };
function getPos(elm) { var bounds = elm.getBoundingClientRect();
                       return { x: bounds.left, y: bounds.top } };
function incrementPos(pos, incX, incY) {
   return { x: pos.x + incX, y: pos.y + (incY || incX) };
}
function addTarget(target) {
    return function(pos) {
        return { pos: pos, target: target };
    }
};
function addClickSwitch(elm, on_true, on_false, initial) {
    Kefir.fromEvents(elm, 'click')
         .map(stopPropagation)
         .map(ƒ(initial || false))
         .scan(invertValue)  // will toggle between `true` and `false`
         .onValue(function(val) {
             if (val) { on_true(); }
             else { on_false(); }
         })
}

var addValueErrorEffect = (function() {
    var errorEffects = {};
    return function(key, target, duration) {
        target.classed('rpd-error', true);
        if (errorEffects[key]) clearTimeout(errorEffects[key]);
        errorEffects[key] = setTimeout(function() {
            target.classed('rpd-error', false);
            errorEffects[key] = null;
        }, duration || 1);
    }
})();

var addValueUpdateEffect = (function() {
    var updateEffects = {};
    return function(key, target, duration) {
        target.classed('rpd-stale', false);
        target.classed('rpd-fresh', true);
        if (updateEffects[key]) clearTimeout(updateEffects[key]);
        updateEffects[key] = setTimeout(function() {
            target.classed('rpd-fresh', false);
            target.classed('rpd-stale', true);
            updateEffects[key] = null;
        }, duration || 1);
    }
})();

function subscribeUpdates(node, subscriptions) {
    if (!subscriptions) return;
    Object.keys(subscriptions).forEach(function(alias) {
        (function(subscription, alias) {
            node.event['node/add-inlet']
                .filter(function(inlet) { return inlet.alias === alias; })
                .onValue(function(inlet) {
                    node.event['node/is-ready'].onValue(function() {
                        if (subscription.default) inlet.receive(subscription.default());
                        if (subscription.valueOut) {
                            subscription.valueOut.onValue(function(value) {
                                inlet.receive(value);
                            });
                        }
                    });
                });
        })(subscriptions[alias], alias);
    });
}

return {
    Navigation: Navigation,
    Placing: GridPlacing,
    DragAndDrop: DragAndDrop,
    //Connectivity: Connectivity,

    //VLink: VLink,
    VLinks: VLinks,

    mergeConfig: mergeConfig,

    preventDefault: preventDefault,
    stopPropagation: stopPropagation,

    extractPos: extractPos,
    getPos: getPos,
    incrementPos: incrementPos,

    addTarget: addTarget,
    addClickSwitch: addClickSwitch,

    addValueErrorEffect: addValueErrorEffect,
    addValueUpdateEffect: addValueUpdateEffect,

    subscribeUpdates: subscribeUpdates
};

})();
