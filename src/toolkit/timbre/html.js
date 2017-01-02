;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

Rpd.noderenderer('timbre/osc', 'html', {
    always: function(bodyElm, inlets) {
        bodyElm.innerText = bodyElm.textContent =
            inlets.wave + '/' + inlets.freq;
    }
});

Rpd.noderenderer('timbre/wave', 'html', {
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
                valueOut: Kefir.fromEvents(chooser, 'change')
                               .map(function() {
                                    return chooser.options[chooser.selectedIndex].value;
                               })
            }
        }
    }
});

Rpd.noderenderer('timbre/plot', 'html', function() {
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

})(this);
