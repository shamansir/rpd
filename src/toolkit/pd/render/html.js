Rpd.noderenderer('pd/number', 'html', function() {
    var change;
    return {
        first: function(bodyElm) {
            var spinner = document.createElement('span');
            change = attachSpinner(spinner, 0);
            bodyElm.appendChild(spinner);
            return { 'spinner':
                { default: function() { change.emit(0); return T(0); },
                  valueOut: change.map(function(val) { return T(parseFloat(val)); })
                }
            };
        },
        always: function(bodyElm, inlets, outlets) {
            if (inlets.spinner && inlets.in && (Date.now() - inlets.spinner.time) > 50) {
                change.emit(inlets.in.value);
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
    var change = Kefir.emitter();
    change.onValue(function(val) {
        state.value = val;
        target.innerText = target.textContent = val;
    });
    change.emit(initial);
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
                             change.emit(start + (value.x - startPos.x));
                         })
         }).onEnd(function() {});
    return change;
}
