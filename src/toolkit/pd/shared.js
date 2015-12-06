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
                 node.webPdObject.inlets[0].message(getValue());
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

    var pdResolveObject = (function() {
        return function(patch, command, _arguments) {
            try {
                return patch.webPdPatch.createObject(command, _arguments);
            } catch (e) {
                if (!(e instanceof WebPd.core.errors.UnkownObjectError)) {
                    console.error(e, command, _arguments);
                }
                return null;
            }
        };

    })();

    var requestResolveEmitter = Kefir.emitter();
    var isResolvedEmitter = Kefir.emitter();

    var events = {
        // This event is emitted every time object node needs to be
        // resolved, i.e. to determine if we know command it contains,
        // emits PdObjectResolved event with a result, on each value.
        // event is: { node: node, command: [] }
        'object/request-resolve': requestResolveEmitter,
        // This event is emitted every time object node got (or lost)
        // the appropriate function, so the number of inlets/outlets
        // changed and style should be changed as well.
        // Renderer subscribes to this event.
        // event is: { node: node,
        //             command: command,
        //             arguments: [],
        //             definition: { inlets, outlets, process } }
        //       or: { node: node,
        //             command: command,
        //             arguments: [],
        //             definition: null }, if command wasn't succesfully parsed
        'object/is-resolved': isResolvedEmitter.toProperty()
    };

    requestResolveEmitter.map(function(value) {
        return {
            node: value.node, patch: value.node.patch,
            command: value.command, arguments: value.arguments,
            object: pdResolveObject(value.node.patch, value.command, value.arguments)
        };
    }).onValue(function(value) {
        isResolvedEmitter.emit(value);
    });

    function PdModel(patch, webPdPatch) {
        this.patch = patch;
        this.webPdPatch = webPdPatch;

        this.nodeToInlets = {};
        this.nodeToOutlets = {};
        //this.nodeToCommand = {};

        this.webPdDummy = { patch: webPdPatch };
    };

    var DspInlet = Pd.core.portlets.DspInlet,
        DspOutlet = Pd.core.portlets.DspOutlet;

    function getInletType(pdInlet) {
        return (pdInlet instanceof DspInlet) ? 'pd/dsp' : 'pd/value';
    }
    function getOutletType(pdOutlet) {
        return (pdOutlet instanceof DspOutlet) ? 'pd/dsp' : 'pd/value';
    }

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
    }

    // add required inlets and outlets to the node using the properties from resove-event
    PdModel.prototype.applyDefinition = function(node, command, _arguments, object) {
        //this.nodeToCommand[node.id] = command;

        var nodeInlets = this.nodeToInlets[node.id],
            nodeOutlets = this.nodeToOutlets[node.id];

        //if (this.nodeToCommand[node.id] === command) return;

        if (nodeInlets) {
            nodeInlets.forEach(function(inlet) { node.removeInlet(inlet); });
            nodeInlets = null;
        }
        if (nodeOutlets) {
            nodeOutlets.forEach(function(outlet) { node.removeOutlet(outlet); });
            nodeOutlets = null;
        }
        if (!object) return;

        var pdInlets = object.inlets || {},
            pdOutlets = object.outlets || {};
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
                            object.inlets, object.outlets,
                            '<'+node.id+'> ' + (object.prefix || command || node.type));
    };

    PdModel.prototype.requestResolve = function(node, command, _arguments) {
        requestResolveEmitter.emit({ node: node,
                                     command: command,
                                     arguments: _arguments });
    };

    PdModel.prototype.whenResolved = function(node, callback) {
        isResolvedEmitter.filter(function(value) {
            return value.node.id === node.id;
        }).onValue(callback);
    };

    PdModel.prototype.initMessage = function(node, _arguments) {
        node.inlets['init'].receive(PdValue.from(_arguments));
    };

    PdModel.getReceivingInlet = function(node) {
        return node.inlets['receive'];
    };

    PdModel.getSendingOutlet = function(node) {
        return node.outlets['send'];
    };

    PdModel.TYPE_MAP = {
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
