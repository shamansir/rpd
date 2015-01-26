Rpd.noderenderer('pd/number', 'html', function() {
    var changeIn;
    return {
        first: function(bodyElm) {
            var spinner = document.createElement('span');
            var change = attachSpinner(spinner, 0);
            changeIn = change.in;
            var changeOut = change.out;
            bodyElm.appendChild(spinner);
            return { 'spinner':
                { default: function() { changeOut.emit(0); return T(0); },
                  valueOut: changeOut.map(function(val) { return T(parseFloat(val)); })
                }
            };
        },
        always: function(bodyElm, inlets, outlets) {
            if (inlets.spinner && inlets.in && (Date.now() - inlets.spinner.time) > 50) {
                changeIn.emit(inlets.in.value);
            }
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
    var change = { in: Kefir.emitter(),
                   out: Kefir.emitter() };
    change.out.merge(change.in).onValue(function(val) {
        state.value = val;
        target.innerText = target.textContent = val;
    });
    change.out.emit(initial);
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
                             change.out.emit(start + (value.x - startPos.x));
                         })
         }).onEnd(function() {});
    return change;
}
