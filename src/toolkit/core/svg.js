Rpd.channelrenderer('core/number', 'svg', {
    /* show: function(target, value) { }, */
    edit: function(target, inlet, valueIn) {
        var foElm = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        foElm.setAttributeNS(null, 'width', 20);
        foElm.setAttributeNS(null, 'height', 30);
        var valInput = document.createElementNS('http://www.w3.org/1999/xhtml', 'input');
        valInput.type = 'number';
        //valInput.style.position = 'absolute';
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

Rpd.noderenderer('core/random', 'svg', function() {
    return {
        size: { width: 40 }
    }
});
