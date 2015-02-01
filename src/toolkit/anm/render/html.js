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
