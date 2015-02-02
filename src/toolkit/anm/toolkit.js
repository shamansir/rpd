Rpd.channeltype('anm/color', {
    accept: function(val) {
        return (typeof val === 'string') &&
               ((val.indexOf('#') == 0) ||
                (val.indexOf('rgb') == 0));
    }
});

Rpd.channeltype('anm/element', {
    show: function(val) { return val ? '[Element]' : '[Nothing]' }
});

Rpd.nodetype('anm/color', {
    name: 'color',
    inlets: {
        'red':   { type: 'core/number', default: 255 },
        'green': { type: 'core/number', default: 255 },
        'blue':  { type: 'core/number', default: 255 },
        'alpha': { type: 'core/number', default: 1 }
    },
    outlets: {
        'color': { type: 'anm/color', default: 'rgba(255, 255, 255, 1)' }
    },
    process: function(inlets) {
        return { 'color':
            'rgba('+inlets.red+','+inlets.green+','+inlets.blue+','+inlets.alpha+')'
        };
    }
})

Rpd.nodetype('anm/element', function() {
    var element;
    return {
        name: 'element',
        inlets: {
            'x':     { type: 'core/number', default: 0 },
            'y':     { type: 'core/number', default: 0 },
            'color': { type: 'anm/color', default: 'rgba(99, 255, 255, 1)' }
        },
        outlets: {
            'element': { type: 'anm/element', default: null }
        },
        process: function(inlets) {
            if (!element) {
                element = new anm.Element();
                element.rect(0, 0, 20, 20);
            }
            element.x = inlets.x;
            element.y = inlets.y;
            element.fill(inlets.color);
            return { 'element': element };
        }
    };
});

Rpd.nodetype('anm/number', {
    name: 'number',
    inlets:  { 'spinner': { type: 'core/number', default: 0, hidden: true } },
    outlets: { 'out':     { type: 'core/number' } },
    process: function(inlets) {
        if (!inlets.hasOwnProperty('spinner')) return;
        return { 'out': inlets.spinner };
    }
});
