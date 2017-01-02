;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

var d3 = d3 || d3_tiny;

// TODO: nodes have different size depending on their content
var defaultSize = { width: 50, height: 18 };

var view = new PdView(defaultSize, function() { return document.body; });

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

Rpd.noderenderer('wpd/number', 'svg', function(node) {
    var path, text, handle;
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
            handle = d3.select(_createSvgElement('rect'))
                       .classed('rpd-wpd-handle', true)
                       .attr('x', 2).attr('y', 2)
                       .attr('width', size.height - 2)
                       .attr('height', Math.floor(size.width * 0.7));
            text = d3.select(_createSvgElement('text'))
                     .attr('x', 2).attr('y', size.height / 2)
                     .text('0');

            spinner = view.addSpinner(handle.node());
            var changes = spinner.getChangesStream();

            view.addSelection(bodyElm, node);
            d3.select(bodyElm).call(function(body) {
                body.append(path.node());
                body.append(text.node());
                body.append(handle.node());
            });

            return {
                'receive': { valueOut: changes.map(function(val) {
                                 return PdValue.from([ parseFloat(val) ]);
                           }) }
            };
        },
        always: function(bodyElm, inlets) {
            var newVal = (inlets.receive || inlets.spinner);
            if (!newVal.isBang()) text.text(newVal.getByIndex(0));
        }
    }
});

Rpd.noderenderer('wpd/symbol', 'svg', function(node) {
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
            view.addSelection(bodyElm, node); /* view.addEditor(bodyElm, text.node()); */
            d3.select(bodyElm).call(function(body) {
                body.append(path.node());
                body.append(text.node());
            });

        }
    }
});

Rpd.noderenderer('wpd/message', 'svg', function(node) {
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
            view.addSelection(bodyElm, node);
            //view.addResize()
            view.addEditor(bodyElm, text.node(), function(value) { lastValue = PdValue.extract(value); });
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

Rpd.noderenderer('wpd/comment', 'svg', function(node) {
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
            view.addSelection(bodyElm, node); view.addEditor(bodyElm, text.node());
            d3.select(bodyElm).call(function(body) {
                body.append(rect.node());
                body.append(text.node());
            });

        }
    }
});

Rpd.noderenderer('wpd/object', 'svg', function(node) {
    var size = defaultSize;
    var model = node.patch.model;
    return {
        size: size,
        first: function(bodyElm) {
            var rect = d3.select(_createSvgElement('rect'))
                         .classed('rpd-wpd-erratic', true);
            rect.attr('width', size.width).attr('height', size.height);
            var text = d3.select(_createSvgElement('text'))
                         .attr('x', 2).attr('y', size.height / 2);
            view.addSelection(bodyElm, node);
            view.addEditor(bodyElm, text.node(), function(value) {
                var commandAndArgs = PdValue.extract(value).get();
                model.requestResolve(node, commandAndArgs[0], commandAndArgs.slice(1));
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
                rect.classed('rpd-wpd-erratic', !value.webPdObject || !value.command);
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

function isToggled(val) { return (val.getByIndex(0) > 0); }
function toggledOff() { return PdValue.from([0]); }
function toggledOn() { return PdValue.from([1]); }
function switchToggle(from) { return isToggled(from) ? toggledOff() : toggledOn(); }
Rpd.noderenderer('wpd/toggle', 'svg', function(node) {
    var rect;
    var mark;
    var size = { width: defaultSize.height,
                 height: defaultSize.height };
    var toggle = toggledOff();
    var changes = Kefir.emitter();
    var initialized = false;
    return {
        size: size,
        first: function(bodyElm) {
            rect = d3.select(_createSvgElement('rect'))
                     .attr('width', size.width).attr('height', size.height);
            mark = d3.select(_createSvgElement('g'))
                     .classed('rpd-wpd-mark', true)
                     .call(function(group) {
                         group.append(d3.select(_createSvgElement('line'))
                                        .attr('x1', 0).attr('y1', 0)
                                        .attr('x2', size.width).attr('y2', size.height)
                                        .node());
                         group.append(d3.select(_createSvgElement('line'))
                                        .attr('x1', size.width).attr('y1', 0)
                                        .attr('x2', 0).attr('y2', size.height)
                                        .node());
                     });
            view.addSelection(bodyElm, node);
            view.addValueSend(rect.node(), this, 'receive', function() {
                toggle = switchToggle(toggle);
                changes.emit(toggle);
                return toggle.get();
            });
            mark.classed('rpd-wpd-enabled', isToggled(toggle));
            d3.select(bodyElm).append(mark.node());
            d3.select(bodyElm).append(rect.node());

            changes.emit(toggle);
            return {
                'receive': {
                    valueOut: changes.toProperty(function() { return toggledOff(); })
                }
            };
        },
        always: function(bodyElm, inlets) {
            var incomingValue;
            if (inlets.init && !initialized) {
                incomingValue = inlets.init;
                initialized = true;
            } else if (inlets.receive) {
                incomingValue = inlets.receive;
            }
            if (incomingValue.isBang()) incomingValue = switchToggle(toggle);
            toggle = incomingValue;
            mark.classed('rpd-wpd-enabled', isToggled(toggle));
        }
    }
});

Rpd.noderenderer('wpd/bang', 'svg', function(node) {
    var rect, circle;
    var size = { width: defaultSize.height,
                 height: defaultSize.height };
    return {
        size: size,
        first: function(bodyElm) {
            rect = d3.select(_createSvgElement('rect'))
                     .attr('width', size.width).attr('height', size.height);
            circle = d3.select(_createSvgElement('circle'))
                       .attr('cx', size.width / 2).attr('cy', size.width / 2)
                       .attr('r', size.width / 2);
            view.addSelection(bodyElm, node);
            view.addValueSend(bodyElm, this, 'receive', function() { return PdValue.bang().get(); });
            d3.select(bodyElm).call(function(body) {
                body.append(rect.node());
                body.append(circle.node());
            });

        }
    }
});

Rpd.noderenderer('wpd/toolbar', 'svg', function(node) {
    var mWidth = 325,
        mHeight = 70;
    var commandToType = PdModel.COMMAND_TO_TYPE;
    var editModeKeyLabel = PdView.EDIT_MODE_KEY_LABEL;
    var nodeTypeToKeyLabel = PdView.NODE_TYPE_TO_KEY_LABEL;
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
                          .classed('rpd-wpd-toolbar-group', true);
            group.append('rect').classed('rpd-wpd-toolbar-border', true)
                                .attr('height', mHeight).attr('width', mWidth + 100)
                                .attr('rx', 5).attr('ry', 5);

            // edit mode switch
            group.append('g').call(function(editGroup) {
                editGroup.attr('transform', 'translate(12, ' + (mHeight / 2) + ')')
                         .classed('rpd-wpd-edit-mode', true);
                var outerCircle = d3.select(_createSvgElement('circle')).attr('r', 7);
                var innerCircle = d3.select(_createSvgElement('circle')).attr('r', 5);
                editGroup.append(outerCircle.node());
                editGroup.append(innerCircle.node()).style('pointer-events', 'none');
                var text = d3.select(_createSvgElement('text')).text('Edit mode').attr('x', 10);
                var keyLabel = d3.select(_createSvgElement('text')).text('(' + editModeKeyLabel + ')').attr('x', 55).attr('y', 1)
                                                                   .classed('rpd-wpd-key-label', true);
                editGroup.append(text.node());
                editGroup.append(keyLabel.node());
                view.addEditModeSwitch(outerCircle.node(), editGroup.node());
                view.addEditModeSwitch(text.node(), editGroup.node());
            });

            // node buttons
            group.append('g').call(function(buttons) {
                buttons.attr('transform', 'translate(95, 0)')
                       .classed('rpd-wpd-buttons', true);
                var bWidth = mWidth / 4,
                    bHeight = mHeight / 4;
                var xPos, yPos;
                Object.keys(commandToType).forEach(function(command, idx) {
                    xPos = (Math.floor(idx / 4)) * bWidth;
                    yPos = (idx % 4) * bHeight;
                    var nodeName = names[command];
                    var nodeType = commandToType[command];
                    var keyLabel = nodeType ? nodeTypeToKeyLabel[nodeType] : null;
                    var button = d3.select(_createSvgElement('g'))
                                   .attr('transform', 'translate(' + xPos + ',' + yPos + ')')
                                   .classed('rpd-wpd-accessible', nodeType ? true : false);
                    button.append('rect').attr('width', bWidth).attr('height', bHeight);
                    button.append('text').attr('x', 10).attr('y', bHeight / 2).text(nodeName);
                    if (keyLabel) { button.append('text').attr('x', bWidth - 3).attr('y', bHeight / 2)
                                                         .text('(' + keyLabel + ')')
                                                         .classed('rpd-wpd-key-label', true); }
                    if (commandToType[command]) view.addNodeAppender(button.node(), nodeType, node.patch);
                    buttons.append(button.node());
                });
            });

            d3.select(bodyElm).append(group.node());
        }
    };
});

Rpd.noderenderer('wpd/edit-switch', 'svg', function(node) {
    return {
        first: function(bodyElm) {
            var group = d3.select(_createSvgElement('g'))
                          .classed('rpd-wpd-edit-switch-group', true);

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

Rpd.noderenderer('wpd/audio-control', 'svg', function(node) {
    var model = node.patch.model;
    return {
        first: function(bodyElm) {
            var ch0switch = d3.select(_createSvgElement('text'))
                              .classed('rpd-wpd-channel', true);
            Kefir.fromEvents(ch0switch.node(), 'click')
                 .toProperty(function() { return model.isAudioChannelOn(0); })
                 .scan(function(prev, next) { return !prev; })
                 .onValue(function(val) {
                     model.switchAudioChannel(0, val);
                     ch0switch.classed('rpd-wpd-channel-on', val)
                              .text('CH0:' + (val ? '✔' : '✘'));
                 });
            d3.select(bodyElm).append(ch0switch.node());
            d3.select(bodyElm).append(d3.select(_createSvgElement('text'))
                                        .text('/').attr('x', 35).node());
            var ch1switch = d3.select(_createSvgElement('text')).attr('x', 45)
                              .classed('rpd-wpd-channel', true);
            Kefir.fromEvents(ch1switch.node(), 'click')
                 .toProperty(function() { return model.isAudioChannelOn(1); })
                 .scan(function(prev, next) { return !prev; })
                 .onValue(function(val) {
                     model.switchAudioChannel(1, val);
                     ch1switch.classed('rpd-wpd-channel-on', val)
                              .text('CH1:' + (val ? '✔' : '✘'));
                 });
            d3.select(bodyElm).append(ch1switch.node());
        }
    };
});

})(this);
