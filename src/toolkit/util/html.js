(function() {

Rpd.channelrenderer('util/boolean', 'html', {
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

Rpd.channelrenderer('util/number', 'html', {
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

Rpd.noderenderer('util/number', 'html', {
    first: function(bodyElm) {
        var valInput = document.createElement('input');
        valInput.style.display = 'block';
        valInput.type = 'number';
        valInput.min = 0;
        valInput.max = 1000;
        bodyElm.appendChild(valInput);
        return { 'user-value':
                    { default: function() { valInput.value = 0; return 0; },
                      valueOut: Kefir.fromEvents(valInput, 'change')
                                     .map(function() { return valInput.value; })
                    }
               };
    }
});

Rpd.noderenderer('util/bounded-number', 'html', function() {
    var spinnerElm, spinner;
    return {
        first: function(bodyElm) {
            spinnerElm = document.createElement('span');
            spinnerElm.classList.add('rpd-util-spinner');
            spinner = new Spinner(spinnerElm);
            var changes = spinner.getChangesStream();
            bodyElm.appendChild(spinnerElm);
            return {
                'spinner': { valueOut: changes.map(function(val) {
                                 return parseFloat(val);
                           }) }
            };
        },
        always: function(bodyElm, inlets) {
            spinner.updateBounds(inlets.min, inlets.max);
            spinnerElm.innerText = spinnerElm.textContent = spinner.setValue(inlets.spinner);
        }
    }
});

Rpd.noderenderer('util/sum-of-three', 'html', {
    size: { width: null, height: 200 },
    always: function(bodyElm, inlets, outlets) {
        bodyElm.innerHTML = '∑ (' + (inlets.a || '?') + ', '
                                  + (inlets.b || '?') + ', '
                                  + (inlets.c || '?') + ') = ' + (outlets.sum || '?');
    }
});

/* Rpd.noderenderer('util/sum-of-three-with-body', 'html', function() {
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

function extractPos(evt) { return { x: evt.clientX,
                                    y: evt.clientY }; };
function Spinner(element, min, max) {
    this.element = element;
    this.min = min || 0;
    this.max = isNaN(max) ? Infinity : max;
    this.value = this.min;

    var spinner = this;

    this.incoming = Kefir.emitter();
    /*changes.onValue(function(value) {
        spinner.value = val;
    });*/

    Kefir.fromEvents(element, 'mousedown')
         .map(extractPos)
         .flatMap(function(startPos) {
             var start = spinner.value;
             return Kefir.fromEvents(document.body, 'mousemove')
                         .map(extractPos)
                         .takeUntilBy(Kefir.fromEvents(document.body, 'mouseup'))
                         .map(function(newPos) { return start + (newPos.x - startPos.x); })
                         .onValue(function(num) { spinner.incoming.emit(num); })
         }).onEnd(function() {});

    this.changes = this.incoming.map(function(value) {
        return spinner.setValue(value); // returns value updated to bounds
    });
    //this.changes.onValue(function() {});
}
Spinner.prototype.setValue = function(value) {
    this.value = value;
    return this.checkValue();
}
Spinner.prototype.checkValue = function() {
    if (isNaN(this.value) || (this.value < this.min)) {
        this.value = this.min; this.incoming.emit(this.min);
    }
    if (this.value > this.max) {
        this.value = this.max; this.incoming.emit(this.max);
    }
    return this.value;
}
Spinner.prototype.updateBounds = function(min, max) {
    this.min = min || 0;
    this.max = isNaN(max) ? Infinity : max;
    return this.checkValue();
}
Spinner.prototype.getChangesStream = function() {
    return this.changes;
}

})();
