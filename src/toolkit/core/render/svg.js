Rpd.noderenderer('core/sum-of-three', 'svg', function() {
    var textElement;
    return {
        size: { width: null, height: 200 },
        first: function(bodyElm) {
            textElement = document.createElementNS(null, bodyElm);
            bodyElm.appendChild(textElement);
        },
        always: function(bodyElm, inlets, outlets) {
            textElement.innerHTML = '∑ (' + (inlets.a || '?') + ', '
                                      + (inlets.b || '?') + ', '
                                      + (inlets.c || '?') + ') = ' + (outlets.sum || '?');
        }
    }
});
