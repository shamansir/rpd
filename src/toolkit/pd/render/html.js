Rpd.noderenderer('pd/number', 'html', function() {
    var change;
    return {
        first: function(bodyElm) {
            var spinner = document.createElement('span');
            change = attachSpinner(spinner, 0);
            bodyElm.appendChild(spinner);
            return { 'spinner':
                { default: function() { change.emit(0); return T(0); },
                  valueOut: change.map(function(val) { return T(parseFloat(val)); }) }
            };
        },
        always: function(bodyElm, inlets) {
            if (inlets.spinner && inlets.in && ((Date.now() - inlets.spinner.time) > 50)) {
                change.emit(inlets.in.value);
            }
        }
    };
});

Rpd.noderenderer('pd/osc', 'html', {
    always: function(bodyElm, inlets) {
        bodyElm.innerText = bodyElm.textContent =
            inlets.wave + '/' + inlets.freq;
    }
});

Rpd.noderenderer('pd/wave', 'html', {
    first: function(bodyElm) {
        var chooser = document.createElement('select');
        chooser.appendChild(createOption('sin'));
        chooser.appendChild(createOption('saw'));
        chooser.appendChild(createOption('tri'));
        chooser.appendChild(createOption('pulse'));
        chooser.appendChild(createOption('fami'));
        bodyElm.appendChild(chooser);
        return {
            'wave': {
                default: function() { chooser.value = 'sin'; return 'sin'; },
                valueOut: Kefir.fromEvent(chooser, 'change')
                               .map(function() {
                                    return chooser.options[chooser.selectedIndex].value;
                               })
            }
        }
    }
});

Rpd.noderenderer('pd/plot', 'html', function() {
    var plotElm;
    return {
        first: function(bodyElm) {
            plotElm = document.createElement('canvas');
            plotElm.width = 100;
            plotElm.height = 100;
            bodyElm.appendChild(plotElm);
        },
        always: function(bodyElm, inlets) {
            if (inlets.sound) {
                inlets.sound.plot({ target: plotElm });
            }
        }
    }
});

// utils

function createOption(value, selected) {
    var option = document.createElement('option');
    option.value = value;
    option.innerText = option.textContent = value;
    if (selected) option.selected = 'selected';
    return option;
}

function extractPos(evt) { return { x: evt.clientX,
                                    y: evt.clientY }; };
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
         .map(extractPos)
         .flatMap(function(startPos) {
             var start = state.value;
             return Kefir.fromEvent(document.body, 'mousemove')
                         .map(extractPos)
                         .takeUntilBy(Kefir.fromEvent(document.body, 'mouseup'))
                         .onValue(function(value) {
                             change.emit(start + (value.x - startPos.x));
                         })
         }).onEnd(function() {});
    return change;
}
