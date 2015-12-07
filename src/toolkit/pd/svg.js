(function() {

var d3 = d3 || d3_tiny;

// TODO: nodes have different size depending on size
var defaultSize = { width: 50, height: 18 };

var view = new PdView(defaultSize);

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

Rpd.noderenderer('pd/number', 'svg', function() {
    var path, text;
    var size = defaultSize;
    var spinner;
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

            spinner = view.addSpinner(text.node());
            var changes = spinner.getChangesStream();

            view.addSelection(bodyElm);
            d3.select(bodyElm).call(function(body) {
                body.append(path.node());
                body.append(text.node());
            });

            return {
                'receive': { valueOut: changes.map(function(val) {
                                 return PdValue.from([ parseFloat(val) ]);
                           }) }
            };
        },
        always: function(bodyElm, inlets) {
            /*if (inlets.hasOwnProperty('receive')) {
                spinner.setValue(inlets.receive);
            }*/
            text.text((inlets.receive || inlets.spinner).get());
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
    var lastValue;
    var initialized = false;
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
            text.text("");
            view.addSelection(bodyElm);
            view.addEditor(bodyElm, text.node(), function(value) { lastValue = PdValue.from(value.split(' ')); });
            view.addValueSend(bodyElm, this, 'receive', function() { return lastValue.get(); });
            d3.select(bodyElm).call(function(body) {
                body.append(path.node());
                body.append(text.node());
            });
        },
        always: function(bodyElm, inlets) {
            if (inlets.init && !initialized) {
                lastValue = inlets.init;
                text.text(lastValue.get().join(' '));
                initialized = true;
            } else if (inlets.receive && !inlets.receive.isBang()) {
                lastValue = inlets.receive;
            }
        }
    }
});

Rpd.noderenderer('pd/comment', 'svg', function() {
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
            var model = node.patch ? node.patch.model : null;
            var rect = d3.select(_createSvgElement('rect'))
                         .classed('rpd-pd-erratic', true);
            rect.attr('width', size.width).attr('height', size.height);
            var text = d3.select(_createSvgElement('text'))
                         .attr('x', 2).attr('y', size.height / 2);
            view.addSelection(bodyElm);
            view.addEditor(bodyElm, text.node(), function(value) {
                if (model) {
                    var definition = value.split(' ');
                    model.requestResolve(node, definition[0], definition.slice(1));
                }
            });

            if (model) {
                var lastCommand;
                model.whenResolved(node, function(value) {
                    var newCommand = value.command +
                              (value.arguments.length ? ' ' + value.arguments.join(' ')
                                                      : '');
                    if (lastCommand && (newCommand === lastCommand)) return;
                    text.text(newCommand);
                    var newSize = view.measureText(text);
                    rect.attr('width', newSize.width + 6);
                    rect.classed('rpd-pd-erratic', !value.object);
                    model.applyDefinition(value.node,
                                          value.command, value.arguments,
                                          value.object);
                    lastCommand = newCommand;
                });
            }

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
            view.addValueSend(bodyElm, this, 'receive', function() { return {}; });
            d3.select(bodyElm).call(function(body) {
                body.append(rect.node());
                body.append(circle.node());
            });

        }
    }
});

Rpd.noderenderer('pd/toolbar', 'svg', function(node) {
    var mWidth = 300,
        mHeight = 70;
    var PdNodeMap = PdModel.TYPE_MAP;
    return {
        size: { width: mWidth + 100,
                height: mHeight },
        first: function(bodyElm) {
            var group = d3.select(_createSvgElement('g'))
                          .classed('rpd-pd-toolbar-group', true);
            group.append('rect').classed('rpd-pd-toolbar-border', true)
                                .attr('height', mHeight).attr('width', mWidth + 100)
                                .attr('rx', 5).attr('ry', 5);

            // edit mode switch
            group.append('g').call(function(editGroup) {
                editGroup.attr('transform', 'translate(12, ' + (mHeight / 2) + ')')
                         .classed('rpd-pd-edit-mode', true);
                var outerCircle = d3.select(_createSvgElement('circle')).attr('r', 7);
                var innerCircle = d3.select(_createSvgElement('circle')).attr('r', 5);
                editGroup.append(outerCircle.node());
                editGroup.append(innerCircle.node()).style('pointer-events', 'none');
                var text = d3.select(_createSvgElement('text')).attr('x', 10).text('Edit mode');
                editGroup.append(text.node());
                view.addEditModeSwitch(outerCircle.node(), editGroup.node());
                view.addEditModeSwitch(text.node(), editGroup.node());
            });

            // node buttons
            group.append('g').call(function(buttons) {
                buttons.attr('transform', 'translate(95, 0)')
                       .classed('rpd-pd-buttons', true);
                var bWidth = mWidth / 4,
                    bHeight = mHeight / 4;
                var xPos, yPos;
                Object.keys(PdNodeMap).forEach(function(name, idx) {
                    xPos = (idx % 4) * bWidth;
                    yPos = (Math.floor(idx / 4)) * bHeight;
                    var button = d3.select(_createSvgElement('g'))
                                   .attr('transform', 'translate(' + xPos + ',' + yPos + ')')
                                   .classed('rpd-pd-accessible', PdNodeMap[name] ? true : false);
                    button.append('rect').attr('width', bWidth).attr('height', bHeight);
                    button.append('text').attr('x', 10).attr('y', bHeight / 2).text(name);
                    if (PdNodeMap[name]) view.addNodeAppender(button.node(), PdNodeMap[name], node.patch);
                    buttons.append(button.node());
                });
            });

            d3.select(bodyElm).append(group.node());
        }
    };
});

Rpd.noderenderer('pd/edit-switch', 'svg', function(node) {
    return {
        first: function(bodyElm) {
            var group = d3.select(_createSvgElement('g'))
                          .classed('rpd-pd-edit-switch-group', true);

            var outerCircle = d3.select(_createSvgElement('circle')).attr('r', 7);
            var innerCircle = d3.select(_createSvgElement('circle')).attr('r', 5);
            group.append(outerCircle.node());
            group.append(innerCircle.node()).style('pointer-events', 'none');
            var text = d3.select(_createSvgElement('text')).attr('x', 10).text('Edit mode');
            group.append(text.node());
            view.addEditModeSwitch(outerCircle.node(), group.node());
            view.addEditModeSwitch(text.node(), group.node());

            d3.select(bodyElm).append(group.node());
        }
    }
});

})();
