Rpd.noderenderer('anm/number', 'html', {
    first: function(bodyElm) {
        var spinner = document.createElement('span');
        var change = attachSpinner(spinner, 0);
        bodyElm.appendChild(spinner);
        return { 'spinner':
            { default: function() { change.emit(0); return 0; },
              valueOut: change.map(function(val) {
                  return parseFloat(val);
            }) }
        };
    }
});

Rpd.noderenderer('anm/color', 'html', function() {
    var colorElm;
    return {
        first: function(bodyElm) {
            colorElm = document.createElement('div');
            colorElm.classList.add('rpd-anm-color-body');
            bodyElm.appendChild(colorElm);
        },
        always: function(bodyElm, inlets, outlets) {
            colorElm.style.backgroundColor = outlets.color;
        }
    };
});

Rpd.noderenderer('anm/element', 'html', function() {
    var player;
    return {
        first: function(bodyElm) {
            var trg = document.createElement('div');
            bodyElm.appendChild(trg);
            player = anm.createPlayer(trg, {
                width: 100,
                height: 100,
                controlsEnabled: false,
                repeat: true
            });
        },
        always: function(bodyElm, inlets, outlets) {
            if (!outlets.element) return;
            player.stop();
            player.load(outlets.element);
            player.play();
            //colorElm.style.backgroundColor = outlets.color;
        }
    };
});


Rpd.channelrenderer('anm/color', 'html', {
    show: function(target, value, repr) {
        target.style.backgroundColor = repr || value;
    }
});

function extractPos(evt) { return { x: evt.clientX,
                                    y: evt.clientY }; };
function attachSpinner(target, initial) {
    target.classList.add('rpd-anm-spinner');
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
