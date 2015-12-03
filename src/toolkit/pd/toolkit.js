Rpd.linktype('core/pass', { });

Rpd.channeltype('pd/any', { });
Rpd.channeltype('pd/dsp', { });

Rpd.nodetype('pd/object', function(node) {
    var _process;
    var model = node.patch ? node.patch.model : null;
    if (model) {
        model.whenResolved(node, function(value) {
            _process = value.definition ? value.definition.process : null;
        });
    };
    return {
        inlets: { 'command': { type: 'pd/any', hidden: true } },
        process: function() {
            return _process ? _process.apply(this, arguments) : null;
        }
    }
});

Rpd.nodetype('pd/comment', {
    inlets: { 'text': { type: 'pd/any', hidden: true } }
});

Rpd.nodetype('pd/number', {
    inlets: { 'receive': { type: 'pd/any' },
              'spinner': { type: 'pd/any', default: [ 0 ], hidden: true } },
    outlets: { 'send': { type: 'pd/any' } },
    process: function(inlets) {
         //if (!inlets.hasOwnProperty('spinner')) return;
         // comparison logic is in the renderer, since it communicates with
         // this node through a hidden spinner inlet
         return { 'send': inlets.spinner };
    }
});

Rpd.nodetype('pd/symbol', {
    inlets: { 'receive': { type: 'pd/any' } },
    outlets: { 'send': { type: 'pd/any' } }
});

Rpd.nodetype('pd/message', function() {
    var lastVal;
    return {
        inlets: { 'receive': { type: 'pd/any' } },
        outlets: { 'send': { type: 'pd/any' } },
        process: function(inlets) {
            if (inlets['receive'][0] !== 'bang') {
                lastVal = inlets['receive'];
                return { 'send': inlets['receive'] };
            } else return { 'send': lastVal };
        }
    }
});

Rpd.nodetype('pd/bang', {
    inlets: { 'receive': { type: 'pd/any' }, },
    outlets: { 'send': { type: 'pd/any' } },
    process: function(inlets) {
        return  { 'send': 'bang' };
    }
});

Rpd.nodetype('pd/toggle', {
    inlets: { 'receive': { type: 'pd/any' } },
    outlets: { 'send': { type: 'pd/any' } }
});

Rpd.nodetype('pd/toolbar', {});

Rpd.nodetype('pd/edit-switch', {});

//Rpd.nodetype('pd/mute', {});
