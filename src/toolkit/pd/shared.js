var PdEditor = (function() {

    var stopPropagation = Rpd.Render.stopPropagation;

    var editorNode = d3.select(document.createElement('input'))
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
    var startEditing = Kefir.emitter(),
        finishEditing = Kefir.emitter();

    var startSelection = Kefir.emitter(),
        finishSelection = Kefir.emitter();
    var selected;

    function addSelection(selectNode) {
        Kefir.fromEvents(selectNode, 'click')
             .map(stopPropagation)
             .onValue(function() {

                 startSelection.emit();
                 if (selected) d3.select(selected).classed('rpd-pd-selected', false);
                 selected = selectNode;
                 d3.select(selectNode).classed('rpd-pd-selected', true);

                 Kefir.fromEvents(document.body, 'click').take(1)
                      .onValue(function() {

                          d3.select(selectNode).classed('rpd-pd-selected', false);
                          selected = null;
                          finishSelection.emit();

                      });
             });
    }

    function addEditor(selectNode, textNode) {
        var text = d3.select(textNode);
        var editor = d3.select(editorNode);
        Kefir.fromEvents(selectNode, 'click')
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

                          editorNode.blur();
                          text.text(editor.node().value);
                          editor.node().value = '';
                          editor.style('display', 'none')
                                .classed('rpd-selected', false);
                          text.style('display', 'block');

                          finishEditing.emit();
                      });
             });
    }

    return {

        addSelection: addSelection,
        addEditor: addEditor,

        objects: {},
        editMode: true,
        selection: null
    };

});
