Rpd.noderenderer('core/number', 'html', function() {
    var config = { min: 0, max: Infinity };
    return {
        first: function(bodyElm) {
            var spinner = document.createElement('span');
            var change = attachSpinner(spinner, 0, config);
            bodyElm.appendChild(spinner);
            return { 'spinner':
                { default: function() { change.emit(0); return 0; },
                  valueOut: change.map(function(val) {
                      return parseFloat(val);
                }) }
            };
        },
        always: function(bodyElm, inlets) {
            config.min = inlets.min; config.max = inlets.max;
        }
    }
});

Rpd.noderenderer('core/sum-of-three', 'html', {
    size: [ null, 200 ],
    always: function(bodyElm, inlets, outlets) {
        bodyElm.innerHTML = '∑ (' + (inlets.a || '?') + ', '
                                  + (inlets.b || '?') + ', '
                                  + (inlets.c || '?') + ') = ' + (outlets.sum || '?');
    }
});

/* Rpd.noderenderer('core/sum-of-three-with-body', 'html', function() {
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
            return { c:
                        { default: function() { cValInput.value = 0; return 0; },
                          valueOut: Kefir.fromEvents(cValInput, 'change')
                                         .map(function() { return cValInput.value; })
                        }
                   };
        },
        always: function(bodyElm, inlets, outlets) {
            sumContent.innerHTML = sumContent.textContent =
                    '∑ (' + (inlets.a || '0') + ', '
                          + (inlets.b || '0') + ', '
                          + (inlets.c || '0') + ') = ' + (outlets.sum || '?');
        }
    };
}); */

Rpd.channelrenderer('core/boolean', 'html', {
    /* show: function(target, value) { }, */
    edit: function(target, inlet, valueIn) {
        var valInput = document.createElement('input');
        valInput.type = 'checkbox';
        valueIn.onValue(function(val) {
            valInput.checked = val ? true : false;
        });
        target.appendChild(valInput);
        return Kefir.fromEvents(valInput, 'change')
                    .map(function() {
                        return valInput.checked;
                    }).toProperty(function() { return false; });
    }
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
        return Kefir.fromEvents(valInput, 'change')
                    .map(function() { return valInput.value; });
    }
});

function extractPos(evt) { return { x: evt.clientX,
                                    y: evt.clientY }; };
function attachSpinner(target, initial, config) {
    target.classList.add('rpd-anm-spinner');
    var initial = initial || 0;
    var state = { value: initial };
    var change = Kefir.emitter();
    change.onValue(function(val) {
        state.value = val;
        target.innerText = target.textContent = val;
    });
    change.emit(initial);
    Kefir.fromEvents(target, 'mousedown')
         .map(extractPos)
         .flatMap(function(startPos) {
             var start = state.value;
             return Kefir.fromEvents(document.body, 'mousemove')
                         .map(extractPos)
                         .takeUntilBy(Kefir.fromEvents(document.body, 'mouseup'))
                         .map(function(newPos) { return start + (newPos.x - startPos.x); })
                         .map(function(num) {
                             if (num >= config.max) return config.max;
                             if (num <= config.min) return config.min;
                             return num;
                          })
                         .onValue(function(num) { change.emit(num); })
         }).onEnd(function() {});
    return change;
}
