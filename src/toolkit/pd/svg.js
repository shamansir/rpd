(function() {

var d3 = d3 || d3_tiny;

var defaultSize = { width: 40, height: 18 };

function _createSvgElement(name) {
    return document.createElementNS(d3.ns.prefix.svg, name);
}

var stopPropagation = Rpd.Render.stopPropagation;

var editorNode = d3.select(document.createElement('input'))
                   .attr('type', 'text')
                   .attr('class', 'rpd-pd-text-editor')
                   .style('width', defaultSize.width + 'px')
                   .style('height', defaultSize.height + 'px')
                   .node();

document.addEventListener('DOMContentLoaded', function() {
    d3.select(document.body)
      .append(d3.select(editorNode)
                .style('display', 'none')
                .style('position', 'absolute').node());
});

var selected;

Rpd.noderenderer('pd/gatom', 'svg', function() {
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
                     .attr('y', size.height / 2);
            listenForSelection(path.node())
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
                     .attr('y', size.height / 2);
            listenForSelection(path.node())
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
            addTextEditor(text.node());
            listenForSelection(bodyElm);
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
                     .attr('y', size.height / 2);
            listenForSelection(rect.node())
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
            listenForSelection(rect.node());
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
            listenForSelection(rect.node())
            d3.select(bodyElm).call(function(body) {
                body.append(rect.node());
                body.append(circle.node());
            });
        }
    }
});

function addTextEditor(textNode, selectNode) {
    var text = d3.select(textNode)
    var editor = d3.select(editorNode);
    Kefir.fromEvents(textNode, 'click')
         .map(stopPropagation)
         .map(function() { return text.text(); })
         .onValue(function(textValue) {
             var pos = textNode.getBoundingClientRect();
             editor.attr('value', textValue)
                   .classed('rpd-selected', true)
                   .style('top', (pos.top - 4) + 'px')
                   .style('left', (pos.left - 1) + 'px');
             text.text('');
             editorNode.setSelectionRange(0, editorNode.value.length);
             editor.style('display', 'block')
                   .node().focus();
             Kefir.fromEvents(document.body, 'click').take(1)
                  .onValue(function() {
                      editorNode.blur();
                      text.text(editor.node().value);
                      editor.style('display', 'none')
                            .classed('rpd-selected', true);
                  });
         });
}

function listenForSelection(rectNode) {
    Kefir.fromEvents(rectNode, 'click')
         .map(stopPropagation)
         .onValue(function() {
             if (selected) d3.select(selected).classed('rpd-pd-selected', false);
             selected = rectNode;
             d3.select(rectNode).classed('rpd-pd-selected', true);
             Kefir.fromEvents(document.body, 'click').take(1)
                  .onValue(function() {
                      d3.select(rectNode).classed('rpd-pd-selected', false);
                      selected = null;
                  });
         });
}

})();
