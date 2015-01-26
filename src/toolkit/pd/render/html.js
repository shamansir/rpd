Rpd.noderenderer('pd/number', 'html', function() {
    var valInput;
    return {
        first: function(bodyElm) {
            valInput = document.createElement('input');
            valInput.style.display = 'block';
            valInput.type = 'number';
            bodyElm.appendChild(valInput);
            return { 'in':
        { default: function() { valInput.value = 0; return T(0); },
                  valueOut: Kefir.fromEvent(valInput, 'change')
                                 .map(function() { return T(parseFloat(valInput.value)); })
                }
            };
        },
        always: function(bodyElm, inlets, outlets) {
            if (inlets.in) valInput.value = inlets.in.value;
        }
    };
});
