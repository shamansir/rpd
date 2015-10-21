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

    PdView.prototype.addMessageSend = function(messageNode, message, getValue) {
        var styleTimeout;
        Kefir.fromEvents(messageNode, 'click')
             .filterBy(this.inEditMode)
             .map(stopPropagation)
             .onValue(function() {
                 if (styleTimeout) clearTimeout(styleTimeout);
                 d3.select(messageNode).classed('rpd-pd-send-value', true);
                 styleTimeout = setTimeout(function() {
                     d3.select(messageNode).classed('rpd-pd-send-value', false);
                 }, 300);
                 message.inlets['receive'].receive(getValue());
             });
    }

    return PdView;

})();

var PdObject = {

    'print': {
        inlets: { 'what': { type: 'pd/msg' } },
        process: function(inlets) {
            if (console) console.log('print:', inlets.what);
        }
    }

};

var PdNodeMap = {
    'Object':  'pd/object',
    'Message': 'pd/message',
    'Number':  'pd/number',
    'Symbol':  'pd/symbol',
    'Comment': 'pd/text',
    'Bang':    'pd/bang',
    'Toggle':  'pd/toggle',
    'Number2': null /*'pd/number-2'*/,
    'VSlider': null /*'pd/vslider'*/,
    'HSlider': null /*'pd/hslider'*/,
    'VRadio':  null /*'pd/vradio'*/,
    'HRadio':  null /*'pd/hradio'*/,
    'VUMeter': null /*'pd/vumeter'*/,
    'Canvas':  null /*'pd/canvas'*/,
    'Graph':   null /*'pd/graph'*/,
    'Array':   null /*'pd/array'*/
};

function pdConfigureSymbol() {

}

var PdEvent = (function() {
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
        //             command: [ command, params.. ],
        //             definition: { inlets, outlets, process } }
        //       or: { node: node,
        //             command: [ command, params.. ],
        //             definition: null }, if command wasn't succesfully parsed
        'object/is-resolved': isResolvedEmitter.toProperty()
    };

    requestResolveEmitter.map(function(value) {
        return {
            node: value.node, command: value.command,
            definition: PdObject[value.command[0]] || null
        };
    }).onValue(function(value) {
        isResolvedEmitter.emit(value);
    });

    var nodeToInlets = {}, nodeToOutlets = {}, nodeToCommand = {};
    isResolvedEmitter.onValue(function(value) {
        var node = value.node, command = value.command,
            definition = value.definition;
        var commandChanged = !definition || !(nodeToCommand[node.id] && (command[0] === nodeToCommand[node.id]));
        if (commandChanged && nodeToInlets[node.id]) {
            nodeToInlets[node.id].forEach(function(inlet) { node.removeInlet(inlet); });
            nodeToInlets[node.id] = null;
        }
        if (commandChanged && nodeToOutlets[node.id]) {
            nodeToOutlets[node.id].forEach(function(outlet) { node.removeOutlet(outlet); });
            nodeToOutlets[node.id] = null;
        }
        nodeToCommand[node.id] = command[0] || null;
        if (!definition || !commandChanged) return;
        var inlets = definition.inlets || {}, oultets = definition.outlets || {};
        var savedInlets = [], savedOutlets = [];
        Object.keys(inlets).forEach(function(alias) {
            savedInlets.push(node.addInlet(inlets[alias].type, alias));
        });
        Object.keys(oultets).forEach(function(alias) {
            savedOutlets.push(node.addOutlet(oultets[alias].type, alias));
        });
        nodeToInlets[node.id] = savedInlets.length ? savedInlets : null;
        nodeToOutlets[node.id] = savedOutlets.length ? savedOutlets : null;
    });

    return events;

})();
