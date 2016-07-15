function getKey(evt) { return evt.which || evt.keyCode; }
function isKey(evt, val) { return getKey(evt) === val; }
function isAltAnd(evt, val) { return evt.altKey && isKey(evt, val); }
function isAltShiftAnd(evt, val) { return evt.shiftKey && isAltAnd(evt, val); }

var PdView = (function() {

    var d3 = d3 || d3_tiny;

    var ƒ = Rpd.unit,
        not = Rpd.not;

    var stopPropagation = Rpd.Render.stopPropagation;

    var editorNode;
    var startEditing = Kefir.emitter(),
        finishEditing = Kefir.emitter();

    var selection = null; //var changeSelection = Kefir.emitter(); TODO
    var startSelection = Kefir.emitter(),
        finishSelection = Kefir.emitter();

    var switchEditMode = Kefir.emitter();

    function PdView(defaultSize, getRoot) { // FIXME: a) create view only when document is ready;
                                            //        b) 'root' should be a canvas of the patch... probably;
        this.getRoot = (typeof getRoot === 'function') ? getRoot : function() { return getRoot; };
        this.inEditMode = switchEditMode.map(ƒ(true))
                                        .scan(Rpd.not, false) // will switch between `true` and `false`
                                        .toProperty(ƒ(false));
        editorNode = d3.select(document.createElement('input'))
                           .attr('type', 'text')
                           .attr('class', 'rpd-wpd-text-editor')
                           .style('width', '300px')
                           .style('height', (defaultSize.height + 1) + 'px')
                           .node();
        var view = this;
        document.addEventListener('DOMContentLoaded', function() {
            d3.select(view.getRoot())
              .append(d3.select(editorNode)
                        .style('display', 'none')
                        .style('position', 'absolute').node());

            Kefir.fromEvents(view.getRoot(), 'keydown')
                          .filter(function(evt) { return isAltAnd(evt, 69/*E*/) })
                          .onValue(function() { switchEditMode.emit(); });

            Kefir.fromEvents(view.getRoot(), 'keydown')
                          .filter(function(evt) { return isAltAnd(evt, 8/*Delete*/) && selection; })
                          .onValue(function() {
                              var node = selection.node;
                              if (node) {
                                  node.patch.removeNode(node);
                                  finishEditing.emit(); // FIXME: use filterBy?
                              }
                          });

            Kefir.fromEvents(view.getRoot(), 'keydown')
                 .filter(function() { return PdModel.lastPatch; }) // there's some current patch
                 .map(function(evt) { return PdModel.getNodeTypeByKey(evt); })
                 .filter(function(type) { return type; }) // type is defined
                 .onValue(function(type) {
                     PdModel.lastPatch.addNode(type);
                 });

        });
    }

    PdView.prototype.addSelection = function(selectNode, node) {
        var view = this;
        Kefir.fromEvents(selectNode, 'click')
             .filterBy(this.inEditMode.map(not))
             .map(stopPropagation)
             .onValue(function() {

                 startSelection.emit();
                 if (selection) d3.select(selection.element).classed('rpd-wpd-selected', false);
                 selection = { element: selectNode, node : node };
                 d3.select(selectNode).classed('rpd-wpd-selected', true);

                 Kefir.fromEvents(view.getRoot(), 'click').take(1)
                      .onValue(function() {

                          d3.select(selectNode).classed('rpd-wpd-selected', false);
                          selection = null;
                          finishSelection.emit();

                      });
             });
    }

    PdView.prototype.addEditor = function(selectNode, textNode, onSubmit) {
        var view = this;
        var text = d3.select(textNode);
        var editor = d3.select(editorNode);
        Kefir.fromEvents(selectNode, 'click')
             .filterBy(this.inEditMode.map(not))
             .map(stopPropagation)
             .map(function() { return text.text(); })
             .onValue(function(textValue) {
                 startEditing.emit();

                 var brect = textNode.getBoundingClientRect();
                 editor.classed('rpd-wpd-selected', true)
                       .style('top', (brect.top - 5) + 'px')
                       .style('left', (brect.left - 1) + 'px');
                 editor.node().value = textValue || '';
                 editorNode.setSelectionRange(0, editorNode.value.length);
                 text.text('').style('display', 'none');
                 editor.style('display', 'block')
                       .node().focus();

                 Kefir.merge([ Kefir.fromEvents(view.getRoot(), 'click'),
                               Kefir.fromEvents(editorNode, 'keydown')
                                    .filter(function(evt) { return isKey(evt, 13/*Enter*/); }),
                               startSelection
                             ]).take(1)
                      .onValue(function() {

                          var value = editor.node().value;

                          editorNode.blur();
                          text.text(value);
                          editor.node().value = '';
                          editor.style('display', 'none')
                                .classed('rpd-wpd-selected', false);
                          text.style('display', 'block');

                          finishEditing.emit();

                          if (onSubmit) onSubmit(value);
                      });
             });
    }

    PdView.prototype.addEditModeSwitch = function(switchNode, targetNode) {
        Kefir.fromEvents(switchNode, 'click')
             .map(stopPropagation)
             .onValue(function() { switchEditMode.emit(); });

        this.inEditMode.onValue(function(val) {
            d3.select(targetNode).classed('rpd-wpd-enabled', val);
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
                 d3.select(sourceNode).classed('rpd-wpd-send-value', true);
                 styleTimeout = setTimeout(function() {
                     d3.select(sourceNode).classed('rpd-wpd-send-value', false);
                 }, 300);
                 //node.inlets[inlet].receive(getValue());
                 model.sendPdMessageValue(node, getValue());
             });
    }

    PdView.prototype.addSpinner = function(sourceNode) {
        return new Spinner(this.getRoot(), sourceNode, this.inEditMode);
    }

    PdView.prototype.measureText = function(textHolder) {
        var bbox = textHolder.node().getBBox();
        return { width: bbox.width, height: bbox.height };
    }

    PdView.EDIT_MODE_KEY_LABEL = '⌥E';
    PdView.NODE_TYPE_TO_KEY_LABEL = {
        'wpd/object':  '⌥1',
        'wpd/message': '⌥2',
        'wpd/number':  '⌥3',
        'wpd/symbol':  '⌥4',
        'wpd/comment': '⌥5',
        'wpd/bang': '⌥⇧B',
        'wpd/toggle': '⌥⇧T'
    };

    // ================================ Spinner ====================================

    function extractPos(evt) { return { x: evt.clientX,
                                        y: evt.clientY }; };
    function Spinner(root, element, editMode) {
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
                 return Kefir.fromEvents(root, 'mousemove')
                             .map(extractPos)
                             .takeUntilBy(Kefir.fromEvents(root, 'mouseup'))
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

    function PdModel(patch, webPdPatch) {
        webPdPatch = webPdPatch || WebPd.createPatch()

        this.patch = patch;
        this.webPdPatch = webPdPatch;

        this.nodeToInlets = {};
        this.nodeToOutlets = {};
        //this.nodeToCommand = {};

        this.webPdDummy = { patch: webPdPatch };
        PdModel.lastPatch = patch; // FIXME: it's no good

        this._requestResolve = Kefir.emitter();
        this._alreadyResolved = Kefir.emitter();
        this._requestApply = Kefir.emitter();
        this._sendMessage = Kefir.emitter();

        var events = {
            'wpd/request-resolve': this._requestResolve,
            'wpd/is-resolved': null,
            'wpd/request-apply': this._requestApply,
            'wpd/is-applied': null,
            'wpd/send-message': null
        };

        var model = this;

        events['wpd/is-resolved'] = this._requestResolve.map(function(value) {
            var node = value.node, patch = node.patch,
                command = value.command, _arguments = value['arguments'];
            var webPdObject;
            try {
                webPdObject = webPdPatch.createObject(command, _arguments);
            } catch (e) {
                if (!(e instanceof WebPd.core.errors.UnkownObjectError)) {
                    console.error(e, command, _arguments); // FIXME: should be a stream error (#13)
                }
            }
            return {
                node: node, command: command, 'arguments': _arguments,
                webPdObject: webPdObject
            }
        }).merge(this._alreadyResolved);

        var allResolved = events['wpd/is-resolved'].scan(function(all, current) {
                                                      all[current.node.id] = current;
                                                      return all;
                                                  }, {});

        events['wpd/is-applied'] = allResolved.sampledBy(this._requestApply.map(function(value) { return value.node; }),
                                                        function(all, requested) {
                                                            return all[requested.id];
                                                        })
                                             .map(function(value) {
                                                 var node = value.node;
                                                 var webPdObject = value.webPdObject;
                                                 if (node.type === 'wpd/object') {
                                                     model.updatePdObject(node, value.command, value['arguments'], webPdObject);
                                                     // model.connectToWebPd is called from inside of updatePdObject
                                                 } else if (node.type !== 'wpd/comment') {
                                                    try {
                                                        model.connectToWebPd([ PdModel.getReceivingInlet(node) ], [ PdModel.getSendingOutlet(node) ],
                                                                             webPdObject.inlets, webPdObject.outlets, '<'+node.id+'> ' + node.type);
                                                    } catch (err) {
                                                        console.error(err); // FIXME: use Kefir error stream
                                                    }
                                                }
                                                if (node.type === 'wpd/message') {
                                                    model.initPdMessage(node, value['arguments']);
                                                }
                                            }).onValue(function() {});

        events['wpd/send-message'] =  allResolved.sampledBy(this._sendMessage,
                                                           function(all, messagePair) {
                                                               return { node: messagePair.node,
                                                                        data: all[messagePair.node.id],
                                                                        message: messagePair.message }
                                                           })
                                                .map(function(value) {
                                                    if (value.data && value.data.webPdObject) {
                                                        value.data.webPdObject.inlets[0].message(value.message);
                                                    } else {
                                                        console.error('Message node is not connected to WebPd'); // FIXME: use Kefir error stream
                                                    }
                                                }).onValue(function() {});


        this.events = events;
    };

    PdModel.prototype.listenForNewNodes = function() {
        var typeToCmd = PdModel.TYPE_TO_COMMAND;
        var model = this,
            patch = this.patch;
        patch.event['patch/add-node'].onValue(function(node) {
            node.event['node/is-ready'].onValue(function() {
                if ((node.type !== 'wpd/object') && typeToCmd[node.type]) {
                    model.requestResolve(node, typeToCmd[node.type], []);
                    model.requestApply(node);
                }
            });
        });
        patch.event['patch/remove-node'].onValue(function(update) {

        });
    };

    PdModel.prototype.requestResolve = function(node, command, _arguments) {
        this._requestResolve.emit({ node: node,
                                    command: command,
                                    arguments: _arguments });
    };

    PdModel.prototype.requestApply = function(node) {
        this._requestApply.emit({ node: node });
    };

    PdModel.prototype.markResolved = function(node, command, _arguments, webPdObject) {
        this._alreadyResolved.emit({ node: node, patch: node.patch,
                                     command: command, 'arguments': _arguments,
                                     webPdObject: webPdObject });
    };

    PdModel.prototype.markResolvedAndApply = function(node, command, _arguments, webPdObject) {
        this.markResolved(node, command, _arguments, webPdObject);
        this.requestApply(node);
    };

    PdModel.prototype.whenResolved = function(node, callback) {
        var model = this;
        this.events['wpd/is-resolved'].filter(function(value) {
            return value.node.id === node.id;
        }).onValue(function(value) {
            if (callback(value)) model._requestApply.emit({ node: value.node });
        });
    };

    PdModel.prototype.switchAudioChannel = function(id, val) {
        if (!Pd._glob.audio) return; // FIXME: add volume changes stream
        Pd._glob.audio.channels[id].gain.value = val ? 1 : 0;
    };

    PdModel.prototype.isAudioChannelOn = function(id) {
        if (!Pd._glob.audio) return false; // FIXME: add volume changes stream
        return (Pd._glob.audio.channels[id].gain.value > 0) ? true : false;
    };

    var DspInlet = Pd.core.portlets.DspInlet,
        DspOutlet = Pd.core.portlets.DspOutlet;

    function getInletType(pdInlet) {
        return (pdInlet instanceof DspInlet) ? 'wpd/dsp' : 'wpd/value';
    }
    function getOutletType(pdOutlet) {
        return (pdOutlet instanceof DspOutlet) ? 'wpd/dsp' : 'wpd/value';
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
                if (inlet.type === 'wpd/dsp') return;
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
                if (outlet.type === 'wpd/dsp') return;
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

    PdModel.prototype.sendPdMessageValue = function(node, message) {
        this._sendMessage.emit({ node: node, message: message });
        /*if (node.webPdObject) {
            node.webPdObject.inlets[0].message(value);
        } else throw new Error('Message node is not connected to WebPd');*/
    };

    PdModel.getReceivingInlet = function(node) {
        return node.inlets['receive'];
    };

    PdModel.getSendingOutlet = function(node) {
        return node.outlets['send'];
    };

    PdModel.COMMAND_TO_TYPE = {
        'obj':        'wpd/object',
        'msg':        'wpd/message',
        'floatatom':  'wpd/number',
        'symbolatom': 'wpd/symbol',
        'text':       'wpd/comment',
        'bng':        'wpd/bang',
        'tgl':        'wpd/toggle',
        'nbx':        null, // 'wpd/number-2'
        'vsl':        null, // 'wpd/vslider'
        'hsl':        null, // 'wpd/hslider'
        'vradio':     null, // 'wpd/vradio'
        'hradio':     null, // 'wpd/hradio'
        'vu':         null, // 'wpd/vumeter'
        'cnv':        null, // 'wpd/canvas'
        'graph':      null, // 'wpd/graph'
        'array':      null  // 'wpd/array'
    };
    PdModel.TYPE_TO_COMMAND = {};
    Object.keys(PdModel.COMMAND_TO_TYPE).forEach(function(cmd) {
        var type = PdModel.COMMAND_TO_TYPE[cmd];
        if (type) PdModel.TYPE_TO_COMMAND[type] = cmd;
    });

    PdModel.getNodeTypeByKey = function(evt) {
        if (!evt.altKey) return;
        if (isAltAnd(evt, 49/*1*/)) return 'wpd/object';
        if (isAltAnd(evt, 50/*2*/)) return 'wpd/message';
        if (isAltAnd(evt, 51/*3*/)) return 'wpd/number';
        if (isAltAnd(evt, 52/*4*/)) return 'wpd/symbol';
        if (isAltAnd(evt, 53/*5*/)) return 'wpd/comment';
        if (isAltShiftAnd(evt, 66/*B*/)) return 'wpd/bang';
        if (isAltShiftAnd(evt, 84/*T*/)) return 'wpd/toggle';
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

    PdValue.prototype.getByIndex = function(idx) {
        return this.value[idx];
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

    PdValue.extract = function(test) {
        if (!test) return PdValue.from([]);
        if (Array.isArray(test)) return PdValue.from(test);
        //if (test === 'bang') return PdValue.bang();
        //if (!Number.isNaN(parseFloat(test))) return PdValue.from([test]);
        var parts = test.split(' ');
        return PdValue.from(parts.map(function(part) {
            return !Number.isNaN(parseFloat(part)) ? parseFloat(part) : part;
        }));
    };

    PdValue.bang = function() {
        return new PdValue(['bang']);
    };

    return PdValue;

})();
