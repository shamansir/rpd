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


Rpd.channelrenderer('anm/color', 'html', {
    show: function(target, value, repr) {
        //target.innerText = '';
        target.style.backgroundColor = repr || value;
    }
});
