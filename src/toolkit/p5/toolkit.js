var DEFAULT_COLOR = { r: 0xED, g: 0x22, b: 0x5D };

// ============= Register p5/color channel type =============

function numberToHex(num) { return (num > 15) ? num.toString(16) : '0' + num.toString(16); }

function toHexColor(color) {
    return '#' + numberToHex(color.r || 0)
               + numberToHex(color.g || 0)
               + numberToHex(color.b || 0);
}

Rpd.channeltype('p5/color', { show: toHexColor });

// ============= Register p5/color node type ================

Rpd.nodetype('p5/color', {
    inlets: {
        'r': { type: 'core/number', default: DEFAULT_COLOR.r, name: 'red' },
        'g': { type: 'core/number', default: DEFAULT_COLOR.g, name: 'green' },
        'b': { type: 'core/number', default: DEFAULT_COLOR.b, name: 'blue' }
    },
    outlets: {
        'color': { type: 'p5/color' }
    },
    process: function(inlets) { return { color: inlets }; }
});

// ============= Register p5/shape channel type =============

Rpd.channeltype('p5/shape', {});

// ============= Register p5/shape node type =============

Rpd.nodetype('p5/shape', {
    inlets: { 'shape': { type: 'p5/shape', default: 'circle', hidden: true } },
    outlets: { 'shape': { type: 'p5/shape' } },
    process: function(inlets) { return { shape: inlets.shape } }
});
