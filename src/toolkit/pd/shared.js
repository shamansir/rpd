var PdView = (function() {

    var d3 = d3 || d3_tiny;

    var ƒ = Rpd.unit,
        not = Rpd.not;

    var stopPropagation = Rpd.Render.stopPropagation;

    var editorNode;
    var startEditing = Kefir.emitter(),
        finishEditing = Kefir.emitter();

    var selection = null;
    var startSelection = Kefir.emitter(),
        finishSelection = Kefir.emitter();

    var editModeOn = Kefir.emitter(),
        editModeOff = Kefir.emitter();

    function PdView(defaultSize) {
        this.inEditMode = Kefir.merge([ editModeOn.map(ƒ(true)),
                                        editModeOff.map(ƒ(false)) ]).toProperty(ƒ(false));
        editorNode = d3.select(document.createElement('input'))
                           .attr('type', 'text')
                           .attr('class', 'rpd-pd-text-editor')
                           .style('width', '300px')
                           .style('height', (defaultSize.height + 1) + 'px')
                           .node();
        document.addEventListener('DOMContentLoaded', function() {
           d3.select(document.body)
             .append(d3.select(editorNode)
                       .style('display', 'none')
                       .style('position', 'absolute').node());
        });
    }

    PdView.prototype.addSelection = function(selectNode) {
        Kefir.fromEvents(selectNode, 'click')
             .filterBy(this.inEditMode.map(not))
             .map(stopPropagation)
             .onValue(function() {

                 startSelection.emit();
                 if (selection) d3.select(selection).classed('rpd-pd-selected', false);
                 selection = selectNode;
                 d3.select(selectNode).classed('rpd-pd-selected', true);

                 Kefir.fromEvents(document.body, 'click').take(1)
                      .onValue(function() {

                          d3.select(selectNode).classed('rpd-pd-selected', false);
                          selection = null;
                          finishSelection.emit();

                      });
             });
    }

    PdView.prototype.addEditor = function(selectNode, textNode, onSubmit) {
        var text = d3.select(textNode);
        var editor = d3.select(editorNode);
        Kefir.fromEvents(selectNode, 'click')
             .filterBy(this.inEditMode.map(not))
             .map(stopPropagation)
             .map(function() { return text.text(); })
             .onValue(function(textValue) {
                 startEditing.emit();

                 var brect = textNode.getBoundingClientRect();
                 editor.classed('rpd-pd-selected', true)
                       .style('top', (brect.top - 5) + 'px')
                       .style('left', (brect.left - 1) + 'px');
                 editor.node().value = textValue || '';
                 editorNode.setSelectionRange(0, editorNode.value.length);
                 text.text('').style('display', 'none');
                 editor.style('display', 'block')
                       .node().focus();

                 Kefir.merge([ Kefir.fromEvents(document.body, 'click'),
                               Kefir.fromEvents(editorNode, 'keydown')
                                    .map(function(evt) { return evt.keyCode; })
                                    .filter(function(key) { return key === 13; }),
                               startSelection
                             ]).take(1)
                      .onValue(function() {

                          var value = editor.node().value;

                          editorNode.blur();
                          text.text(value);
                          editor.node().value = '';
                          editor.style('display', 'none')
                                .classed('rpd-pd-selected', false);
                          text.style('display', 'block');

                          finishEditing.emit();

                          if (onSubmit) onSubmit(value);
                      });
             });
    }

    PdView.prototype.addEditModeSwitch = function(switchNode, targetNode) {
        Kefir.fromEvents(switchNode, 'click')
             .map(stopPropagation)
             .map(ƒ(true))
             .scan(Rpd.not) // will toggle between `true` and `false`
             .onValue(function(val) {
                 if (val) { editModeOn.emit(); } else { editModeOff.emit(); };
                 d3.select(targetNode).classed('rpd-pd-enabled', val);
             });
    }

    PdView.prototype.addNodeAppender = function(buttonNode, nodeType, targetPatch) {
        Kefir.fromEvents(buttonNode, 'click')
             .map(stopPropagation)
             .onValue(function() {
                 targetPatch.addNode(nodeType);
             });
    }

    PdView.prototype.addValueSend = function(sourceNode, node, inlet, getValue) {
        var model = node.patch.model;
        var styleTimeout;
        Kefir.fromEvents(sourceNode, 'click')
             .filterBy(this.inEditMode)
             .map(stopPropagation)
             .onValue(function() {
                 if (styleTimeout) clearTimeout(styleTimeout);
                 d3.select(sourceNode).classed('rpd-pd-send-value', true);
                 styleTimeout = setTimeout(function() {
                     d3.select(sourceNode).classed('rpd-pd-send-value', false);
                 }, 300);
                 //node.inlets[inlet].receive(getValue());
                 model.sendPdMessageValue(node, getValue());
             });
    }

    PdView.prototype.addSpinner = function(sourceNode) {
        return new Spinner(sourceNode, this.inEditMode);
    }

    PdView.prototype.measureText = function(textHolder) {
        var bbox = textHolder.node().getBBox();
        return { width: bbox.width, height: bbox.height };
    }

    // ================================ Spinner ====================================

    function extractPos(evt) { return { x: evt.clientX,
                                        y: evt.clientY }; };
    function Spinner(element, editMode) {
        this.element = element;
        this.value = 0;

        var spinner = this;

        var changes = Kefir.emitter();

        changes.onValue(function(value) {
            spinner.value = value;
        });

        Kefir.fromEvents(element, 'mousedown')
             .filterBy(editMode)
             .map(stopPropagation)
             .map(extractPos)
             .flatMap(function(startPos) {
                 var start = spinner.value;
                 return Kefir.fromEvents(document.body, 'mousemove')
                             .map(extractPos)
                             .takeUntilBy(Kefir.fromEvents(document.body, 'mouseup'))
                             .map(function(newPos) { return start + (startPos.y - newPos.y); })
                             .onValue(function(num) { changes.emit(num); })
             }).onEnd(function() {});
        //this.changes.onValue(function() {});

        this.changes = changes;
    }
    Spinner.prototype.getChangesStream = function() {
        return this.changes;
    }

    return PdView;

})();

var PdModel = (function() {

    var WebPd = window.Pd || null;
    if (!WebPd) throw new Error('Building PD Model requires WebPd present');

    var models = 0;
    function PdModel(patch, webPdPatch) {
        this.patch = patch;
        this.webPdPatch = webPdPatch || WebPd.createPatch();

        this.nodeToInlets = {};
        this.nodeToOutlets = {};
        //this.nodeToCommand = {};

        this.webPdDummy = { patch: webPdPatch };

        this.requestResolve = Kefir.emitter();
        this.alreadyResolved = Kefir.emitter();
        this.requestApply = Kefir.emitter();

        var events = {
            'pd/request-resolve': this.requestResolve,
            'pd/is-resolved': null,
            'pd/request-apply': this.requestApply,
            'pd/is-applied': null
        };

        var model = this;

        events['pd/is-resolved'] = this.requestResolve.map(function(value) {
            var node = value.node, patch = node.patch,
                command = value.command, _arguments = value['arguments'];
            var webPdObject;
            try {
                webPdObject = patch.webPdPatch.createObject(command, _arguments);
            } catch (e) {
                if (!(e instanceof WebPd.core.errors.UnkownObjectError)) {
                    console.error(e, command, _arguments); // FIXME: should be a stream error (#13)
                }
                return;
            }
            return {
                node: node, command: command, 'arguments': _arguments,
                webPdObject: webPdObject
            }
        }).merge(this.alreadyResolved);

        var allResolved = events['pd/is-resolved'].scan(function(all, current) {
            all[current.node.id] = current;
            return all;
        }).toProperty(function() { return {}; });

        //events['pd/is-resolved'].bufferBy(this.requestApply)

        this.events['pd/is-applied'] = allResolved.sampledBy(this.requestApply, function(vals) {
            var requestedNode = vals[1].node; var allNodes = vals[0];
            return allNodes[requestedNode.id];
        }).map(function(value) {
            var node = value.node;
            var webPdObject = value.webPdObject;
            if (node.type === 'pd/object') {
                model.updatePdObject(node, value.command, value['arguments'], webPdObject);
                // model.connectToWebPd is called from inside of updatePdObject
            } else {
                try {
                    model.connectToWebPd([ PdModel.getReceivingInlet(node) ], [ PdModel.getSendingOutlet(node) ],
                                           webPdObject.inlets, webPdObject.outlets, '<'+node.id+'> ' + node.type);
                } catch (err) {
                    console.error(err);
                }
            }
            if (node.type === 'pd/message') {
                model.initPdMessage(node, value['arguments']);
            }
        });

        this.events = events;

        models++;
        this.events['pd/request-resolve'].log('request-resolve-' + models);
        this.events['pd/is-resolved'].log('is-resolved-' + models);
        this.events['pd/request-apply'].log('request-apply-' + models);
        this.events['pd/is-applied'].log('is-applied-' + models);
    };

    PdModel.prototype.listenForNewNodes = function() {
        var typeToCmd = PdModel.COMMAND_TO_TYPE;
        var model = this,
            patch = this.patch;
        patch.event['patch/add-node'].onValue(function(node) {
            node.event['node/is-ready'].onValue(function() {
                model.requestResolve(node, typeToCmd[node.type], []);
            });
        });
        patch.event['patch/remove-node'].onValue(function(update) {

        });
    };

    PdModel.prototype.requestResolve = function(node, command, _arguments) {
        this.requestResolve.emit({ node: node,
                                   command: command,
                                   arguments: _arguments });
    };

    PdModel.prototype.markResolved = function(node, command, _arguments, webPdObject) {
        this.alreadyResolved.emit({ node: node, patch: node.patch,
                                    command: command, 'arguments': _arguments,
                                    webPdObject: webPdObject });
    };

    PdModel.prototype.markResolvedAndApply = function(node, command, _arguments, webPdObject) {
        this.markResolved(node, command, _arguments, webPdObject);
        this.requestApply.emit({ node: node });
    };

    function isNode(node) { return function(value) { return value.node.id === node.id; } }

    PdModel.prototype.whenResolved = function(node, callback) {

        /* this.events['pd/is-resolved'].filter(isNode(node)).take(1)
                                     .bufferBy(this.applySolution.filter(isNode(node)).take(1))
        .onValue(function(value) {
            console.log(value);
            if (callback) callback(value);
            this.events['pd/apply-solution'].emit(value);
            // FIXME: refactor it using streams
        }.bind(this)); */
    };

    var DspInlet = Pd.core.portlets.DspInlet,
        DspOutlet = Pd.core.portlets.DspOutlet;

    function getInletType(pdInlet) {
        return (pdInlet instanceof DspInlet) ? 'pd/dsp' : 'pd/value';
    }
    function getOutletType(pdOutlet) {
        return (pdOutlet instanceof DspOutlet) ? 'pd/dsp' : 'pd/value';
    }

    // add required inlets and outlets to the node using the properties from resolve-event
    PdModel.prototype.updatePdObject = function(node, command, _arguments, webPdObject) {
        //this.nodeToCommand[node.id] = command;

        var nodeInlets = this.nodeToInlets[node.id],
            nodeOutlets = this.nodeToOutlets[node.id];

        //if (this.nodeToCommand[node.id] === command) return;

        if (nodeInlets) {
            nodeInlets.forEach(function(inlet) { node.removeInlet(inlet); });
            this.nodeToInlets[node.id] = null;
        }
        if (nodeOutlets) {
            nodeOutlets.forEach(function(outlet) { node.removeOutlet(outlet); });
            this.nodeToOutlets[node.id] = null;
        }
        if (!webPdObject) return;

        var pdInlets = webPdObject.inlets || {},
            pdOutlets = webPdObject.outlets || {};
        var savedInlets = [], savedOutlets = [];
        pdInlets.forEach(function(pdInlet, idx) {
            savedInlets.push(node.addInlet(getInletType(pdInlet), idx.toString()));
        });
        pdOutlets.forEach(function(pdOutlet, idx) {
            savedOutlets.push(node.addOutlet(getOutletType(pdOutlet), idx.toString()));
        });
        this.nodeToInlets[node.id] = savedInlets.length ? savedInlets : null;
        this.nodeToOutlets[node.id] = savedOutlets.length ? savedOutlets : null;

        this.connectToWebPd(savedInlets, savedOutlets,
                            webPdObject.inlets, webPdObject.outlets,
                            '<'+node.id+'> ' + (webPdObject.prefix || command || node.type));
    };

    PdModel.prototype.connectToWebPd = function(inlets, outlets, webPdInlets, webPdOutlets) { // FIXME: remove label
        if ((inlets && !webPdInlets) ||
            (inlets && (inlets.length !== webPdInlets.length))) throw new Error('inlets number not matches to WebPd inlets number');
        if ((outlets && !webPdOutlets) ||
            (outlets && (outlets.length !== webPdOutlets.length))) throw new Error('outlets number not matches to WebPd outlets number');
        if (inlets && webPdInlets) {
            inlets.forEach(function(inlet, idx) {
                if (inlet.type === 'pd/dsp') return;
                // TODO: disconnect/unsubscribe previously connected links
                var webPdInlet = webPdInlets[idx];
                if (!webPdInlet) throw new Error('Failed to find WebPd inlet corresponding to inlet ' + idx);
                inlet.event['inlet/update'].onValue(function(val) {
                    webPdInlet.message(val.get());
                });
            });
        }
        if (outlets && webPdOutlets) {
            var dummy = this.webPdDummy;
            outlets.forEach(function(outlet, idx) {
                if (outlet.type === 'pd/dsp') return;
                var receiver = new WebPd.core.portlets.Inlet(dummy);
                receiver.message = function(args) {
                    outlet.send(PdValue.from(args));
                };
                // TODO: disconnect previously connected links
                if (webPdOutlets[idx]) {
                    webPdOutlets[idx].connect(receiver);
                } else throw new Error('Failed to find WebPd outlet corresponding to outlet ' + idx);
            });
        }
    };

    PdModel.prototype.initPdMessage = function(node, _arguments) {
        node.inlets['init'].receive(PdValue.from(_arguments));
    };

    PdModel.prototype.sendPdMessageValue = function(node, value) {
        if (node.webPdObject) {
            node.webPdObject.inlets[0].message(getValue());
        } else throw new Error('Message node is not connected to WebPd');
    };

    PdModel.getReceivingInlet = function(node) {
        return node.inlets['receive'];
    };

    PdModel.getSendingOutlet = function(node) {
        return node.outlets['send'];
    };

    PdModel.COMMAND_TO_TYPE = {
        'obj':        'pd/object',
        'msg':        'pd/message',
        'floatatom':  'pd/number',
        'symbolatom': 'pd/symbol',
        'text':       'pd/comment',
        'bng':        'pd/bang',
        'tgl':        'pd/toggle',
        'nbx':        null, // 'pd/number-2'
        'vsl':        null, // 'pd/vslider'
        'hsl':        null, // 'pd/hslider'
        'vradio':     null, // 'pd/vradio'
        'hradio':     null, // 'pd/hradio'
        'vu':         null, // 'pd/vumeter'
        'cnv':        null, // 'pd/canvas'
        'graph':      null, // 'pd/graph'
        'array':      null  // 'pd/array'
    };
    PdModel.TYPE_TO_COMMAND = {};
    Object.keys(PdModel.COMMAND_TO_TYPE).forEach(function(cmd) {
        var type = PdModel.COMMAND_TO_TYPE[cmd];
        if (type) PdModel.TYPE_TO_COMMAND[type] = cmd;
    });

    return PdModel;

})();

PdValue = (function() {

    function PdValue(vals) {
        this.value = vals;
    };

    PdValue.prototype.get = function() {
        return this.value;
    };

    PdValue.prototype.isBang = function() {
        return (this.value[0] === 'bang');
    };

    PdValue.isPdValue = function(test) {
        return test instanceof PdValue;
    };

    PdValue.from = function(vals) {
        return new PdValue(vals);
    };

    PdValue.bang = function() {
        return new PdValue(['bang']);
    };

    return PdValue;

})();
