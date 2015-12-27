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
            text.text('');
            view.addSelection(bodyElm);
            view.addEditor(bodyElm, text.node(), function(value) { lastValue = PdValue.from(value ? value.split(' ') : []); });
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

Rpd.noderenderer('pd/object', 'svg', function(node) {
    var size = defaultSize;
    var model = node.patch.model;
    return {
        size: defaultSize,
        first: function(bodyElm) {
            var rect = d3.select(_createSvgElement('rect'))
                         .classed('rpd-pd-erratic', true);
            rect.attr('width', size.width).attr('height', size.height);
            var text = d3.select(_createSvgElement('text'))
                         .attr('x', 2).attr('y', size.height / 2);
            view.addSelection(bodyElm);
            view.addEditor(bodyElm, text.node(), function(value) {
                var definition = value.split(' ');
                model.requestResolve(node, definition[0], definition.slice(1));
            });

            var lastCommand;
            model.whenResolved(node, function(value) {
                var newCommand;
                if (value.command) {
                    newCommand = value.command +
                          (value.arguments.length ? ' ' + value.arguments.join(' ')
                                                  : '');
                }
                if (lastCommand && (newCommand === lastCommand)) return;
                text.text(newCommand || '');
                var newSize = view.measureText(text);
                rect.attr('width', (newSize.width > 30) ? (newSize.width + 6) : 30);
                rect.classed('rpd-pd-erratic', !value.webPdObject || !value.command);
                lastCommand = newCommand;
                return true;
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
    var commandToType = PdModel.COMMAND_TO_TYPE;
    var names = {
        'obj':        'object',
        'msg':        'message',
        'floatatom':  'number',
        'symbolatom': 'symbol',
        'text':       'comment',
        'bng':        'bang',
        'tgl':        'toggle',
        'nbx':        'number2',
        'vsl':        'vslider',
        'hsl':        'hslider',
        'vradio':     'vradio',
        'hradio':     'hradio',
        'vu':         'vumeter',
        'cnv':        'canvas',
        'graph':      'graph',
        'array':      'array'
    };
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
                Object.keys(commandToType).forEach(function(command, idx) {
                    xPos = (Math.floor(idx / 4)) * bWidth;
                    yPos = (idx % 4) * bHeight;
                    var button = d3.select(_createSvgElement('g'))
                                   .attr('transform', 'translate(' + xPos + ',' + yPos + ')')
                                   .classed('rpd-pd-accessible', commandToType[command] ? true : false);
                    button.append('rect').attr('width', bWidth).attr('height', bHeight);
                    button.append('text').attr('x', 10).attr('y', bHeight / 2).text(names[command]);
                    if (commandToType[command]) view.addNodeAppender(button.node(), commandToType[command], node.patch);
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

Rpd.noderenderer('pd/audio-control', 'svg', {
    first: function(bodyElm) {
        var ch0switch = d3.select(_createSvgElement('text'))
                          .classed('rpd-pd-channel', true);
        Kefir.fromEvents(ch0switch.node(), 'click').toProperty(function() { return true; })
             .scan(function(prev, next) { return !prev; })
             .onValue(function(val) {
                 Pd._glob.audio.channels[0].gain.value = val ? 1 : 0;
                 ch0switch.classed('rpd-pd-channel-on', val)
                          .text('CH0:' + (val ? '✔' : '✘'));
             });
        d3.select(bodyElm).append(ch0switch.node());
        d3.select(bodyElm).append(d3.select(_createSvgElement('text'))
                                    .text('/').attr('x', 35).node());
        var ch1switch = d3.select(_createSvgElement('text')).attr('x', 45)
                          .classed('rpd-pd-channel', true);
        Kefir.fromEvents(ch1switch.node(), 'click').toProperty(function() { return true; })
             .scan(function(prev, next) { return !prev; })
             .onValue(function(val) {
                 Pd._glob.audio.channels[1].gain.value = val ? 1 : 0;
                 ch1switch.classed('rpd-pd-channel-on', val)
                          .text('CH1:' + (val ? '✔' : '✘'));
             });
        d3.select(bodyElm).append(ch1switch.node());
    }
});

})();
