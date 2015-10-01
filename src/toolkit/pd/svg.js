(function() {

var d3 = d3 || d3_tiny;

var defaultSize = { width: 50, height: 18 };

var view = new PdView(defaultSize);

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

Rpd.noderenderer('pd/number', 'svg', function() {
    var path, text;
    var size = defaultSize;
    return {
        size: size,
        first: function(bodyElm) {
            path = d3.select(_createSvgElement('path'))
                     .attr('d', 'M 0,0 h ' + (size.width - 5) + ' ' +
                                'l ' + 5 + ' ' + 5 + ' ' +
                                'v ' + (size.height - 5) + ' ' +
                                'h ' + (-size.width) + ' v ' + (-size.height) + ' z');
            text = d3.select(_createSvgElement('text'))
                     .attr('x', 2).attr('y', size.height / 2)
                     .text('0');
            view.addSelection(bodyElm);
            d3.select(bodyElm).call(function(body) {
                body.append(path.node());
                body.append(text.node());
            });

        }
    }
});

Rpd.noderenderer('pd/symbol', 'svg', function() {
    var path, editor, text;
    var size = defaultSize;
    return {
        size: size,
        first: function(bodyElm) {
            path = d3.select(_createSvgElement('path'))
                     .attr('d', 'M 0,0 h ' + (size.width - 5) + ' ' +
                                'l ' + 5 + ' ' + 5 + ' ' +
                                'v ' + (size.height - 5) + ' ' +
                                'h ' + (-size.width) + ' v ' + (-size.height) + ' z');
            text = d3.select(_createSvgElement('text'))
                     .attr('x', 2).attr('y', size.height / 2)
                     .text('symbol');
            view.addSelection(bodyElm); /* view.addEditor(bodyElm, text.node()); */
            d3.select(bodyElm).call(function(body) {
                body.append(path.node());
                body.append(text.node());
            });

        }
    }
});

Rpd.noderenderer('pd/message', 'svg', function() {
    var path, text;
    var size = defaultSize;
    return {
        size: size,
        first: function(bodyElm) {

            path = d3.select(_createSvgElement('path'))
                     .attr('d', 'M 0,0 h ' + size.width + ' ' +
                                'l ' + (-4) + ' ' + 4 + ' ' +
                                'v ' + (size.height - 8) + ' ' +
                                'l ' + 4 + ' ' + 4 + ' ' +
                                'h ' + (-size.width) + ' v ' + (-size.height) + ' z');
            text = d3.select(_createSvgElement('text'))
                     .attr('x', 2).attr('y', size.height / 2);
            text.text('foobar');
            view.addSelection(bodyElm); view.addEditor(bodyElm, text.node());
            d3.select(bodyElm).call(function(body) {
                body.append(path.node());
                body.append(text.node());
            });

        }
    }
});

Rpd.noderenderer('pd/text', 'svg', function() {
    var rect, text;
    var size = defaultSize;
    return {
        size: size,
        first: function(bodyElm) {

            rect = d3.select(_createSvgElement('rect'))
                     .attr('width', size.width)
                     .attr('height', size.height);
            text = d3.select(_createSvgElement('text'))
                     .attr('y', size.height / 2)
                     .text('comment');
            view.addSelection(bodyElm); view.addEditor(bodyElm, text.node());
            d3.select(bodyElm).call(function(body) {
                body.append(rect.node());
                body.append(text.node());
            });

        }
    }
});

Rpd.noderenderer('pd/object', 'svg', function() {
    var rect, text;
    var size = defaultSize;
    return {
        size: defaultSize,
        first: function(bodyElm) {

            rect = d3.select(_createSvgElement('rect'));
            rect.attr('width', size.width).attr('height', size.height);
            text = d3.select(_createSvgElement('text'))
                     .attr('x', 2).attr('y', size.height / 2);
            view.addSelection(bodyElm); view.addEditor(bodyElm, text.node());
            d3.select(bodyElm).call(function(body) {
                body.append(rect.node());
                body.append(text.node());
            });

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
            view.addSelection(bodyElm);
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
            view.addSelection(bodyElm);
            d3.select(bodyElm).call(function(body) {
                body.append(rect.node());
                body.append(circle.node());
            });

        }
    }
});

})();
