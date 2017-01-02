;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

function nop() {};

Rpd.channeltype('wpd/value', {
    accept: function(test) { return PdValue.isPdValue(test); }
});
Rpd.channeltype('wpd/dsp', { });

Rpd.nodetype('wpd/object', function(node) {
    var _process;
    var model = node.patch.model;
    model.whenResolved(node, function(value) {
        _process = value.definition ? value.definition.process : null;
    });
    return {
        inlets: { 'command': { type: 'wpd/value', hidden: true } },
        process: function() {
            return _process ? _process.apply(this, arguments) : null;
        }
    }
});

Rpd.nodetype('wpd/comment', {
    inlets: { 'text': { type: 'wpd/value', hidden: true } }
});

Rpd.nodetype('wpd/number', {
    inlets: { 'receive': { type: 'wpd/value' },
              'spinner': { type: 'wpd/value', hidden: true } },
    outlets: { 'send': { type: 'wpd/value' } },
    process: nop
});

Rpd.nodetype('wpd/symbol', {
    inlets: { 'receive': { type: 'wpd/value' } },
    outlets: { 'send': { type: 'wpd/value' } }
});

Rpd.nodetype('wpd/message', function() {
    var lastVal;
    return {
        inlets: { 'receive': { type: 'wpd/value' },
                  'init': { type: 'wpd/value', hidden: true } },
        outlets: { 'send': { type: 'wpd/value' } },
        process: nop
    }
});

Rpd.nodetype('wpd/bang', {
    inlets: { 'receive': { type: 'wpd/value' }, },
    outlets: { 'send': { type: 'wpd/value' } },
    process: nop
});

Rpd.nodetype('wpd/toggle', {
    inlets: { 'receive': { type: 'wpd/value' } },
    outlets: { 'send': { type: 'wpd/value' } },
    process: nop
});

Rpd.nodetype('wpd/toolbar', {});

Rpd.nodetype('wpd/edit-switch', {});

Rpd.nodetype('wpd/audio-control', {});

})(this);
