;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

Rpd.channelrenderer('anm/number', 'html', {
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

Rpd.noderenderer('anm/color', 'html',
    renderSpread('color', function(elm, color) {
        elm.style.backgroundColor = color;
    })
);

Rpd.noderenderer('anm/spread', 'html',
    renderSpread('spread', function(elm, num) {
        elm.innerText = elm.textContent = num.toFixed(3);
    })
);

Rpd.noderenderer('anm/vector', 'html',
    renderSpread('vector', function(elm, vector) {
        elm.innerText = elm.textContent = vector.toString();
    })
);

Rpd.noderenderer('anm/primitive', 'html', function() {
    var chooser;
    return {
        first: function(bodyElm) {
            chooser = document.createElement('select');
            chooser.appendChild(createOption('dot'));
            chooser.appendChild(createOption('rect'));
            chooser.appendChild(createOption('oval'));
            chooser.appendChild(createOption('triangle'));
            bodyElm.appendChild(chooser);
            return {
                'type': {
                    default: function() { chooser.value = 'rect'; return 'rect'; },
                    valueOut: Kefir.fromEvents(chooser, 'change')
                                   .map(function() {
                                        return chooser.options[chooser.selectedIndex].value;
                                   })
                }
            }
        },
        always: function(bodyElm, inlets, outlets) {
            chooser.value = inlets.type;
        }
    };
});

var RENDER_WIDTH = 140,
    RENDER_HEIGHT = 140;
Rpd.noderenderer('anm/render', 'html', function() {
    var player;
    return {
        first: function(bodyElm) {
            var trg = document.createElement('div');
            bodyElm.appendChild(trg);
            player = anm.createPlayer(trg, {
                width: RENDER_WIDTH,
                height: RENDER_HEIGHT,
                controlsEnabled: false,
                repeat: true,
                infiniteDuration: true
            });
        },
        always: function(bodyElm, inlets, outlets) {
            if (!inlets.what) return;
            player.stop();
            if (player.anim) player.anim = null;
            var root = new anm.Element();
            root.sx = 1 / 4;
            root.sy = 1 / 4;
            root.x = RENDER_WIDTH  / 2;
            root.y = RENDER_HEIGHT / 2;
            inlets.what.stream().onValue(function(prepare) {
                var child = new anm.Element();
                var update = prepare(child);
                if (update) child.modify(function(t, dt) { update(t, dt); });
                root.add(child);
            });
            player.load(root);
            player.play();
        }
    };
});


Rpd.channelrenderer('anm/colors', 'html', {
    show: function(target, value, repr) {
        /* if (value.length() == 1) {
            target.classList.add('rpd-anm-one-color');
            target.style.backgroundColor = value.get(0);
        } else { */
            target.innerText = target.textContent = value.toString();
            target.style.backgroundColor = 'transparent';
            target.classList.remove('rpd-anm-one-color');
        // }
    }
});

// utils

function renderSpread(prop, f) {
    return function() {
        var holder;
        return {
            first: function(bodyElm) {
                holder = document.createElement('div');
                bodyElm.appendChild(holder);
            },
            always: function(bodyElm, inlets, outlets) {
                clearNode(holder);
                var itemElm;
                outlets[prop].stream().onValue(function(item) {
                    itemElm = document.createElement('span');
                    f(itemElm, item);
                    holder.appendChild(itemElm);
                });
            }
        }
    };
}

function createOption(value, selected) {
    var option = document.createElement('option');
    option.value = value;
    option.innerText = option.textContent = value;
    if (selected) option.selected = 'selected';
    return option;
}

function clearNode(node) {
    while (node.firstChild) { node.removeChild(node.firstChild); }
}

})(this);
