Rpd.noderenderer('core/sum-of-three', 'svg', function() {
    var textElement;
    return {
        //layout: 'no-header',
        //size: { width: 150, height: null },
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
        var foElm = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        foElm.setAttributeNS(null, 'width', 20);
        foElm.setAttributeNS(null, 'height', 30);
        var valInput = document.createElementNS('http://www.w3.org/1999/xhtml', 'input');
        valInput.type = 'number';
        valueIn.onValue(function(val) {
            valInput.value = val;
        });
        foElm.appendChild(valInput);
        target.appendChild(foElm);
        return Kefir.fromEvents(valInput, 'change')
                    .map(function() {
                        return valInput.value;
                    });
    }
});
