function nop() {};

Rpd.channeltype('pd/value', {
    accept: function(test) { return PdValue.isPdValue(test); }
});
Rpd.channeltype('pd/dsp', { });

Rpd.nodetype('pd/object', function(node) {
    var _process;
    var model = node.patch.model;
    model.whenResolved(node, function(value) {
        _process = value.definition ? value.definition.process : null;
    });
    return {
        inlets: { 'command': { type: 'pd/value', hidden: true } },
        process: function() {
            return _process ? _process.apply(this, arguments) : null;
        }
    }
});

Rpd.nodetype('pd/comment', {
    inlets: { 'text': { type: 'pd/value', hidden: true } }
});

Rpd.nodetype('pd/number', {
    inlets: { 'receive': { type: 'pd/value' },
              'spinner': { type: 'pd/value', hidden: true } },
    outlets: { 'send': { type: 'pd/value' } },
    process: nop
});

Rpd.nodetype('pd/symbol', {
    inlets: { 'receive': { type: 'pd/value' } },
    outlets: { 'send': { type: 'pd/value' } }
});

Rpd.nodetype('pd/message', function() {
    var lastVal;
    return {
        inlets: { 'receive': { type: 'pd/value' },
                  'init': { type: 'pd/value', hidden: true } },
        outlets: { 'send': { type: 'pd/value' } },
        process: nop
    }
});

Rpd.nodetype('pd/bang', {
    inlets: { 'receive': { type: 'pd/value' }, },
    outlets: { 'send': { type: 'pd/value' } },
    process: nop
});

Rpd.nodetype('pd/toggle', {
    inlets: { 'receive': { type: 'pd/value' } },
    outlets: { 'send': { type: 'pd/value' } },
    process: nop
});

Rpd.nodetype('pd/toolbar', {});

Rpd.nodetype('pd/edit-switch', {});

Rpd.nodetype('pd/audio-control', {});
