Rpd.noderenderer('core/sum-of-three', 'html', {
    always: function(bodyElm, inlets, outlets) {
        bodyElm.innerHTML = '∑ (' + (inlets.a || '?') + ', '
                                  + (inlets.b || '?') + ', '
                                  + (inlets.c || '?') + ') = ' + (outlets.sum || '?');
    }
});

Rpd.noderenderer('core/sum-of-three-with-body', 'html', function() {
    var sumContent;
    return {
        first: function(bodyElm) {
            var cValInput = document.createElement('input');
            cValInput.style.display = 'block';
            cValInput.type = 'number';
            cValInput.min = 0;
            cValInput.max = 10;
            bodyElm.appendChild(cValInput);
            sumContent = document.createElement('span');
            bodyElm.appendChild(sumContent);
            return { c: { default: function() { cValInput.value = 0; return 0; },
                          valueOut: Kefir.fromEvent(cValInput, 'change')
                                         .map(function() { return cValInput.value; }) }
        },
        always: function(bodyElm, inlets, outlets) {
            sumContent.innerHTML = sumContent.textContent =
                    '∑ (' + (inlets.a || '0') + ', '
                          + (inlets.b || '0') + ', '
                          + (inlets.c || '0') + ') = ' + (outlets.sum || '?');
        }
    };
});

Rpd.channelrenderer('core/number', 'html', {
    /* show: function(target, value) { }, */
    edit: function(target, inlet, valueIn) {
        var valInput = document.createElement('input');
        valInput.type = 'number';
        valueIn.onValue(function(val) {
            valInput.value = val;
        });
        target.appendChild(valInput);
        return Kefir.fromEvent(valInput, 'change')
                    .map(function() { return cValInput.value; });
    }
});
