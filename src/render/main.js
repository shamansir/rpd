var Render = (function() {

var ƒ = Rpd.unit,
    invertValue = Rpd.not;

// =============================================================================
// ============================ Navigation =====================================
// =============================================================================

function Navigation() {
    this.current = null;

    var me = this;

    Kefir.fromEvents(window, 'hashchange')
         .map(function() { return (window.location.hash ? window.location.hash.slice(1) : null); })
         .filter(function(newHash) { return !(me.currentPatch && (newHash === me.currentPatch.id)); })
         .map(function(newHash) { return tree.patches[newHash].data().patch; })
         .filter(function(targetPatch) { return targetPatch != null; })
         .onValue(function(targetPatch) {
             if (me.currentPatch) me.currentPatch.exit(); // TODO: pass this value through a stream
             targetPatch.enter();
         });
}
Navigation.prototype.switch = function(targetPatch) {
    if (!targetPatch) return;
    this.currentPatch = targetPatch;
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
                              .tap(stopPropagation)
                              .takeUntilBy(Kefir.fromEvents(root.node(), 'mouseup'))
                              .map(extractPos)
                              .map(function(absPos) {
                                  return { x: absPos.x - diffPos.x,
                                           y: absPos.y - diffPos.y };
                              });
        moveStream.last().onValue(end);
        return moveStream;
    }).onValue(drag);
}

// =============================================================================
// =============================== helpers =====================================
// =============================================================================

function mergeConfig(user_conf, defaults) {
    if (user_conf) {
        var merged = {};
        for (var prop in defaults)  { merged[prop] = defaults[prop]; }
        for (var prop in user_conf) { merged[prop] = user_conf[prop]; }
        return merged;
    } else return defaults;
}

function preventDefault(evt) { evt.preventDefault(); };
function stopPropagation(evt) { evt.stopPropagation(); };
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
         .tap(stopPropagation)
         .map(ƒ(initial || false))
         .scan(invertValue)  // will toggle between `true` and `false`
         .onValue(function(val) {
             if (val) { on_true(); }
             else { on_false(); }
         })
}

return {
    Navigation: Navigation,
    Placing: GridPlacing,
    DragAndDrop: DragAndDrop,

    mergeConfig: mergeConfig,

    preventDefault: preventDefault,
    stopPropagation: stopPropagation,

    extractPos: extractPos,
    getPos: getPos,
    incrementPos: incrementPos,

    addTarget: addTarget,
    addClickSwitch: addClickSwitch
};

})();
