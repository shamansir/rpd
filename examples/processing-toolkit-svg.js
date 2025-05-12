(function() {

var SHAPES = [ 'circle', 'rect', 'cross', 'diamond' ];

var DEFAULT_COLOR = { r: 0xED, g: 0x22, b: 0x5D };

var SVG_XMLNS = "https://www.w3.org/2000/svg";

// ============= Register p5/color channel type =============

function numberToHex(num) { return (num > 15) ? num.toString(16) : '0' + num.toString(16); }

function toHexColor(color) {
    return '#' + numberToHex(color.r || 0)
               + numberToHex(color.g || 0)
               + numberToHex(color.b || 0);
}

Rpd.channeltype('p5/color', { show: toHexColor });

// ============= Register p5/color node type and renderer =============

Rpd.nodetype('p5/color', {
    inlets: {
        'r': { type: 'util/number', default: DEFAULT_COLOR.r, name: 'red' },
        'g': { type: 'util/number', default: DEFAULT_COLOR.g, name: 'green' },
        'b': { type: 'util/number', default: DEFAULT_COLOR.b, name: 'blue' }
    },
    outlets: {
        'color': { type: 'p5/color' }
    },
    process: function(inlets) { return { color: inlets }; }
});

Rpd.noderenderer('p5/color', 'svg', function() {
    var colorElm, textElm;
    return {
        size: { width: 90, height: 40 },
        first: function(bodyElm) {
            var group = document.createElementNS(SVG_XMLNS, 'g');
            group.setAttributeNS(null, 'transform', 'translate(-30, 0)');
            colorElm = document.createElementNS(SVG_XMLNS, 'rect');
            colorElm.setAttributeNS(null, 'y', -10);
            colorElm.setAttributeNS(null, 'width', 20);
            colorElm.setAttributeNS(null, 'height', 20);
            colorElm.setAttributeNS(null, 'rx', 2);
            colorElm.setAttributeNS(null, 'ry', 2);
            group.appendChild(colorElm);
            textElm = document.createElementNS(SVG_XMLNS, 'text');
            textElm.style.alignmentBaseline = 'middle';
            textElm.setAttributeNS(null, 'x', 25);
            textElm.setAttributeNS(null, 'y', 1);
            textElm.innerText = textElm.textContent = '<None>';
            group.appendChild(textElm);
            bodyElm.appendChild(group);
        },
        always: function(bodyElm, inlets, outlets) {
            var color = outlets.color;
            colorElm.style.fill = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
            textElm.innerText = textElm.textContent = toHexColor(color);
        }
    };
});

// ============= Register p5/shape channel type =============

Rpd.channeltype('p5/shape', {});

// ============= Register p5/shape node type and renderer =============

Rpd.nodetype('p5/shape', {
    inlets: { 'shape': { type: 'p5/shape', default: 'circle', hidden: true } },
    outlets: { 'shape': { type: 'p5/shape' } },
    process: function(inlets) { return { shape: inlets.shape } }
});

Rpd.noderenderer('p5/shape', 'svg', function() {
    var curShape = 'circle';
    var variants = {};
    var symbolSide = 10;
    var symbols = {
        'circle': function() {
            var circle = document.createElementNS(SVG_XMLNS, 'circle');
            circle.setAttributeNS(null, 'r', Math.floor(symbolSide / 2));
            return circle;
        },
        'rect': function() {
            var rect = document.createElementNS(SVG_XMLNS, 'rect');
            rect.setAttributeNS(null, 'width', symbolSide);
            rect.setAttributeNS(null, 'height', symbolSide);
            rect.setAttributeNS(null, 'x', -1 * Math.floor(symbolSide / 2));
            rect.setAttributeNS(null, 'y', -1 * Math.floor(symbolSide / 2));
            return rect;
        },
        'cross': function() {
            var group = document.createElementNS(SVG_XMLNS, 'g');
            group.setAttributeNS(null, 'transform', 'translate(' + (-1 * Math.floor(symbolSide / 2)) + ', '
                                                                 + (-1 * Math.floor(symbolSide / 2)) + ')');
            var line1 = document.createElementNS(SVG_XMLNS, 'line');
            line1.setAttributeNS(null, 'x1', 0);
            line1.setAttributeNS(null, 'y1', 0);
            line1.setAttributeNS(null, 'x2', Math.floor(symbolSide));
            line1.setAttributeNS(null, 'y2', Math.floor(symbolSide));
            group.appendChild(line1);
            var line2 = document.createElementNS(SVG_XMLNS, 'line');
            line2.setAttributeNS(null, 'x1', Math.floor(symbolSide));
            line2.setAttributeNS(null, 'y1', 0);
            line2.setAttributeNS(null, 'x2', 0);
            line2.setAttributeNS(null, 'y2', Math.floor(symbolSide));
            group.appendChild(line2);
            return group;
        },
        'diamond': function() {
            var rect = document.createElementNS(SVG_XMLNS, 'rect');
            rect.setAttributeNS(null, 'transform', 'rotate(45)');
            rect.setAttributeNS(null, 'width', symbolSide);
            rect.setAttributeNS(null, 'height', symbolSide);
            rect.setAttributeNS(null, 'x', -1 * Math.floor(symbolSide / 2));
            rect.setAttributeNS(null, 'y', -1 * Math.floor(symbolSide / 2));
            return rect;
        } };
    return {
        size: { width: 80, height: 40 },
        pivot: { x: 0, y: 0.5 },
        first: function(bodyElm) {
            var shapeChange = Kefir.emitter();
            var allShapesGroup = document.createElementNS(SVG_XMLNS, 'g');
            SHAPES.forEach(function(shape, i) {
                var shapeGroup = document.createElementNS(SVG_XMLNS, 'g');
                shapeGroup.appendChild(symbols[SHAPES[i]]());
                shapeGroup.setAttributeNS(null, 'transform', 'translate(' + ((i * symbolSide * 2) + 10) + ', 0)');
                shapeGroup.setAttributeNS(null, 'class', 'rpd-p5-shape-variant');
                shapeGroup.addEventListener('click',
                    (function(shape) {
                        return function() {
                            variants[curShape].setAttributeNS(null, 'class', 'rpd-p5-shape-variant');
                            curShape = shape;
                            variants[curShape].setAttributeNS(null, 'class', 'rpd-p5-shape-variant rpd-p5-active-variant');
                            shapeChange.emit(curShape);
                        }
                    })(shape));
                variants[shape] = shapeGroup;
                allShapesGroup.appendChild(shapeGroup);
            });
            variants[curShape].setAttributeNS(null, 'class', 'rpd-p5-shape-variant rpd-p5-active-variant');
            bodyElm.appendChild(allShapesGroup);
            return { 'shape': { valueOut: shapeChange } };
        }
    }
});

// ============= Monkey-patch util/random renderer =============

var curSvgRandomRendererFunc = Rpd.allNodeRenderers['util/random'].svg;
var newSvgRandomRendererFunc = function(node) {
    var returnObj = curSvgRandomRendererFunc.apply(this, arguments);
    if (returnObj.size) {
        returnObj.size.width = 80;
    } else {
        returnObj.size = { width: 80 };
    }
    var textElm;
    returnObj.first = function(bodyElm) {
        textElm = document.createElementNS(SVG_XMLNS, 'text');
        textElm.innerText = textElm.textContent = '?';
        bodyElm.appendChild(textElm);
    };
    returnObj.always = function(bodyElm, inlets, outlets) {
        textElm.innerText = textElm.textContent = 'from ' + inlets.min + ' to ' + inlets.max;
    };
    return returnObj;
};
Rpd.allNodeRenderers['util/random'].svg = newSvgRandomRendererFunc;

})();
