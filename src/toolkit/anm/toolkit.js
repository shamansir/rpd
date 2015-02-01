Rpd.channeltype('anm/color', {
    accept: function(val) {
        return (typeof val === 'string') &&
               ((val.indexOf('#') == 0) ||
                (val.indexOf('rgb') == 0));
    }
});

Rpd.channeltype('anm/element', { });

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

Rpd.nodetype('anm/element', {
    name: 'element',
    inlets: {
        'x':     { type: 'core/number', default: 0 },
        'y':     { type: 'core/number', default: 0 },
        'color': { type: 'anm/color', default: 'rgba(99, 255, 255, 1)' }
    },
    outlets: {
        'element': { type: 'anm/element', default: null }
    },
    process: function(inlets) {}
});
