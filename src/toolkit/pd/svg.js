(function() {

var d3 = d3 || d3_tiny;

var defaultSize = { width: 40, height: 18 };

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

Rpd.noderenderer('pd/gatom', 'svg', function() {
    var rect;
    var size = defaultSize;
    return {
        size: size,
        first: function(bodyElm) {
            rect = d3.select(_createSvgElement('rect'));
            rect.attr('width', size.width).attr('height', size.height);
            d3.select(bodyElm).append(rect.node());
        }
    }
});

Rpd.noderenderer('pd/message', 'svg', function() {
    var path;
    var size = defaultSize;
    return {
        size: size,
        first: function(bodyElm) {
            path = d3.select(_createSvgElement('path'))
                     .attr('d', 'M 0,0 h ' + size.width + ' ' +
                                'l ' + (-5) + ' ' + 5 + ' ' +
                                'v ' + (size.height - 10) + ' ' +
                                'l ' + 5 + ' ' + 5 + ' ' +
                                'h ' + (-size.width) + ' v ' + (-size.height) + ' z');
            d3.select(bodyElm).append(path.node());
        }
    }
});

Rpd.noderenderer('pd/text', 'svg', function() {
    var text;
    var size = defaultSize;
    return {
        size: size,
        first: function(bodyElm) {
            text = d3.select(_createSvgElement('text'))
                     .text('comment');
            d3.select(bodyElm).append(text.node());
        }
    }
});

Rpd.noderenderer('pd/object', 'svg', function() {
    var rect;
    var size = defaultSize;
    return {
        size: defaultSize,
        first: function(bodyElm) {
            rect = d3.select(_createSvgElement('rect'));
            rect.attr('width', size.width).attr('height', size.height);
            d3.select(bodyElm).append(rect.node());
        }
    }
});

Rpd.noderenderer('pd/toggle', 'svg', function() {
    var rect;
    var size = { width: defaultSize.height,
                 height: defaultSize.height };
    return {
        size: defaultSize,
        first: function(bodyElm) {
            rect = d3.select(_createSvgElement('rect'));
            rect.attr('width', size.width).attr('height', size.height);
            d3.select(bodyElm).append(rect.node());
        }
    }
});

Rpd.noderenderer('pd/bang', 'svg', function() {
    var rect, circle;
    var size = { width: defaultSize.height,
                 height: defaultSize.height };
    return {
        size: defaultSize,
        first: function(bodyElm) {
            rect = d3.select(_createSvgElement('rect'))
                     .attr('width', size.width).attr('height', size.height);
            circle = d3.select(_createSvgElement('circle'))
                       .attr('cx', size.width / 2).attr('cy', size.width / 2)
                       .attr('r', size.width / 2);
            d3.select(bodyElm).call(function(body) {
                body.append(rect.node());
                body.append(circle.node());
            });
        }
    }
});

})();
