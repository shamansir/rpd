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
    var size = defaultSize;
    return {
        size: size,
        first: function(bodyElm) {
            var rect = d3.select(_createSvgElement('rect'))
                         .attr('width', size.width)
                         .attr('height', size.height);
            var text = d3.select(_createSvgElement('text'))
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
    var size = defaultSize;
    return {
        size: defaultSize,
        first: function(bodyElm) {
            var node = this;
            var rect = d3.select(_createSvgElement('rect'))
                         .classed('rpd-pd-erratic', true);
            rect.attr('width', size.width).attr('height', size.height);
            var text = d3.select(_createSvgElement('text'))
                         .attr('x', 2).attr('y', size.height / 2);
            view.addSelection(bodyElm);
            view.addEditor(bodyElm, text.node(), function(value) {
                PdEvent['object/request-resolve'].emit({
                    node: node, command: value.split(' ')
                });
            });

            PdEvent['object/is-resolved'].filter(function(value) {
                                             return value.node.id === node.id;
                                         }).onValue(function(value) {
                                             text.text(value.command.join(' '));
                                             rect.classed('rpd-pd-erratic', !value.definition);
                                         });

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

Rpd.noderenderer('pd/toolbar', 'svg', function() {
    return {
        first: function(bodyElm) {
            var group = d3.select(_createSvgElement('g'))
                          .classed('rpd-pd-toolbar', true);
            group.append('rect').classed('rpd-pd-toolbar-border', true)
                                .attr('height', 30).attr('width', 100)
                                .attr('rx', 5).attr('ry', 5);

            // edit mode switch
            group.append('g').call(function(editGroup) {
                editGroup.attr('transform', 'translate(12, 15)').classed('rpd-pd-edit-mode', true);
                var outerCircle = d3.select(_createSvgElement('circle')).attr('r', 7);
                var innerCircle = d3.select(_createSvgElement('circle')).attr('r', 5);
                editGroup.append(outerCircle.node());
                editGroup.append(innerCircle.node()).style('pointer-events', 'none');
                var text = d3.select(_createSvgElement('text')).attr('x', 10).text('Edit mode');
                editGroup.append(text.node());
                view.addEditModeSwitch(outerCircle.node(), editGroup.node());
                view.addEditModeSwitch(text.node(), editGroup.node());
            });

            d3.select(bodyElm).append(group.node());
        }
    };
});

})();
