Rpd.noderenderer('pd/number', 'html', function() {
    var changeIn, changeOut;
    return {
        first: function(bodyElm) {
            var spinner = document.createElement('span');
            var changes = attachSpinner(spinner, 0);
            changeIn = changes[0], changeOut = changes[1];
            bodyElm.appendChild(spinner);
            return { 'in':
                { default: function() { changeOut.emit(0); return T(0); },
                  valueOut: changeOut.map(function(val) { return T(parseFloat(val)); })
                  /* Kefir.fromEvent(valInput, 'change')
                                 .map(function() { return T(parseFloat(valInput.value)); }) */
                }
            };
        },
        always: function(bodyElm, inlets, outlets) {
            //valInput.textContent = inlets.in.value
            if (inlets.in) changeIn.emit(inlets.in.value);
            //if (inlets.in) setTimeout(function() { change.emit(inlets.in.value) },1);
        }
    };
});

// utils

function extractPos(evt) { return { x: evt.clientX,
                                    y: evt.clientY }; };
function stopPropagation(evt) { evt.stopPropagation(); }

function attachSpinner(target, initial) {
    target.classList.add('rpd-pd-spinner');
    var initial = initial || 0;
    var state = { value: initial };
    var changeIn = Kefir.emitter(),
        changeOut = Kefir.emitter();
    changeOut.merge(changeIn).onValue(function(val) {
        state.value = val;
        target.innerText = target.textContent = val;
    });
    changeOut.emit(initial);
    Kefir.fromEvent(target, 'mousedown')
         .tap(stopPropagation)
         .map(extractPos)
         .flatMap(function(startPos) {
             var start = state.value;
             return Kefir.fromEvent(document.body, 'mousemove')
                         .tap(stopPropagation)
                         .map(extractPos)
                         .takeUntilBy(Kefir.fromEvent(document.body, 'mouseup'))
                         .onValue(function(value) {
                             changeOut.emit(start + (value.x - startPos.x));
                         })
         }).onEnd(function() {});
    return [ changeIn, changeOut ];
}
