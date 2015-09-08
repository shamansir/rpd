Rpd.noderenderer('core/sum-of-three', 'svg', function() {
    var textElement;
    return {
        size: { width: 150, height: null },
        first: function(bodyElm) {
            textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            bodyElm.appendChild(textElement);
        },
        always: function(bodyElm, inlets, outlets) {
            textElement.innerHTML = '∑ (' + (inlets.a || '?') + ', '
                                          + (inlets.b || '?') + ', '
                                          + (inlets.c || '?') + ') = ' + (outlets.sum || '?');
        }
    }
});

Rpd.channelrenderer('core/number', 'svg', {
    /* show: function(target, value) { }, */
    edit: function(target, inlet, valueIn) {
        var valInput = document.createElement('input');
        valInput.type = 'number';
        valueIn.onValue(function(val) {
            valInput.value = val;
        });
        target.appendChild(valInput);
        return Kefir.fromEvents(valInput, 'change')
                    .map(function() { return valInput.value; });
    }
});
