(function() {

Rpd.channelrenderer('util/boolean', 'html', {
    /* show: function(target, value) { }, */
    edit: function(target, inlet, valueIn) {
        var valInput = document.createElement('input');
        valInput.type = 'checkbox';
        valueIn.onValue(function(val) {
            valInput.checked = val ? true : false;
        });
        target.appendChild(valInput);
        return Kefir.fromEvents(valInput, 'change')
                    .map(function() {
                        return valInput.checked;
                    }).toProperty(function() { return false; });
    }
});

Rpd.channelrenderer('util/number', 'html', {
    /* show: function(target, value) { }, */
    edit: function(target, inlet, valueIn) {
        var valInput = document.createElement('input');
        valInput.type = 'number';
        valueIn.onValue(function(val) {
            valInput.value = val;
        });
        target.appendChild(valInput);
        return Kefir.fromEvents(valInput, 'change')
                    .map(function() { return valInput.value; });
    }
});

Rpd.noderenderer('util/number', 'html', {
    first: function(bodyElm) {
        var valInput = document.createElement('input');
        valInput.style.display = 'block';
        valInput.type = 'number';
        valInput.min = 0;
        valInput.max = 1000;
        bodyElm.appendChild(valInput);
        return { 'user-value':
                    { default: function() { valInput.value = 0; return 0; },
                      valueOut: Kefir.fromEvents(valInput, 'change')
                                     .map(function() { return valInput.value; })
                    }
               };
    }
});

Rpd.noderenderer('util/bounded-number', 'html', function() {
    var spinnerElm, spinner;
    return {
        first: function(bodyElm) {
            spinnerElm = document.createElement('span');
            spinnerElm.classList.add('rpd-util-spinner');
            spinner = new Spinner(spinnerElm);
            var changes = spinner.getChangesStream();
            bodyElm.appendChild(spinnerElm);
            return {
                'spinner': { valueOut: changes.map(function(val) {
                                 return parseFloat(val);
                           }) }
            };
        },
        always: function(bodyElm, inlets) {
            spinner.updateBounds(inlets.min, inlets.max);
            spinnerElm.innerText = spinnerElm.textContent = spinner.setValue(inlets.spinner);
        }
    }
});

Rpd.noderenderer('util/sum-of-three', 'html', {
    size: { width: null, height: 200 },
    always: function(bodyElm, inlets, outlets) {
        bodyElm.innerHTML = '∑ (' + (inlets.a || '?') + ', '
                                  + (inlets.b || '?') + ', '
                                  + (inlets.c || '?') + ') = ' + (outlets.sum || '?');
    }
});

var d3 = d3 || d3_tiny;

Rpd.noderenderer('util/nodelist', 'html', {
    size: {},
    first: function(bodyElm) {
        var nodeTypes = Rpd.allNodeTypes,
            nodeDescriptions = Rpd.allNodeDescriptions,
            toolkitIcons = Rpd.allToolkitIcons,
            nodeTypeIcons = Rpd.allNodeTypeIcons;

        var nodeTypesByToolkit = Object.keys(nodeTypes).reduce(function(byToolkit, nodeType) {
            var slashPos = nodeType.indexOf('/');
            var toolkit = (slashPos < 0) ? toolkit : nodeType.substring(0, slashPos);
            var typeName = (slashPos < 0) ? '' : nodeType.substring(slashPos + 1);
            if (!byToolkit[toolkit]) byToolkit[toolkit] = { icon: '', types: [] };
            byToolkit[toolkit].types.push({ toolkit: toolkit,
                                            fullName: nodeType, name: typeName,
                                            data: nodeTypes[nodeType] });
            return byToolkit;
        }, {});

        var search = d3.select(bodyElm).append('input').attr('type', 'text');

        var listElements = [];

        var clearSearch = d3.select(bodyElm).append('a').attr('href', '#').text('x');

        var clearEvents = Kefir.fromEvents(clearSearch.node(), 'click').map(function() {
            search.node().value = '';
        });

        d3.select(bodyElm)
          .append('dl')
          .call(function(dl) {
              Object.keys(nodeTypesByToolkit).forEach(function(toolkit) {
                  dl.append('dt')
                    .call(function(dt) {
                        if (toolkitIcons[toolkit]) dt.append('span') .attr('class', 'rpd-nodelist-toolkit-icon').text(toolkitIcons[toolkit]);
                     })
                    .append('span').attr('class', 'rpd-nodelist-toolkit-name').text(toolkit)
                  nodeTypesByToolkit[toolkit].types.forEach(function(nodeTypeDef) {
                      var nodeType = nodeTypeDef.fullName;
                      dl.append('dd')
                        .call(function(dd) {
                            if (nodeTypeIcons[nodeType]) {
                                dd.append('span').attr('class', 'rpd-nodelist-icon').text(nodeTypeIcons[nodeType]);
                            }
                            dd.append('span').attr('class', 'rpd-nodelist-toolkit').text(nodeTypeDef.toolkit);
                            dd.append('span').attr('class', 'rpd-nodelist-separator').text('/');
                            dd.append('span').attr('class', 'rpd-nodelist-typename').text(nodeTypeDef.name);
                            if (nodeDescriptions[nodeType]) {
                                dd.append('span').attr('class', 'rpd-nodelist-description')
                                                 .attr('title', nodeDescriptions[nodeType])
                                                 .text(nodeDescriptions[nodeType]);
                            }
                            listElements.push({ nodeType: nodeType, element: dd });
                        })
                  });
              });
          });

        Kefir.fromEvents(search.node(), 'input').merge(clearEvents).throttle(500).map(function() {
            return search.node().value;
        }).onValue(function(searchString) {
            listElements.forEach(function(def) {
                var index = def.nodeType.indexOf(searchString);
                def.element.style('display', (index >= 0) ? 'block' : 'none');
                //def.element.classed('rpd-nodelist-hiddenitem', index < 0);
            });
        });

    }
});

/* Rpd.noderenderer('util/sum-of-three-with-body', 'html', function() {
    var sumContent;
    return {
        first: function(bodyElm) {
            var cValInput = document.createElement('input');
            cValInput.style.display = 'block';
            cValInput.type = 'number';
            cValInput.min = 0;
            cValInput.max = 10;
            bodyElm.appendChild(cValInput);
            sumContent = document.createElement('span');
            bodyElm.appendChild(sumContent);
            return { c:
                        { default: function() { cValInput.value = 0; return 0; },
                          valueOut: Kefir.fromEvents(cValInput, 'change')
                                         .map(function() { return cValInput.value; })
                        }
                   };
        },
        always: function(bodyElm, inlets, outlets) {
            sumContent.innerHTML = sumContent.textContent =
                    '∑ (' + (inlets.a || '0') + ', '
                          + (inlets.b || '0') + ', '
                          + (inlets.c || '0') + ') = ' + (outlets.sum || '?');
        }
    };
}); */

function extractPos(evt) { return { x: evt.clientX,
                                    y: evt.clientY }; };
function Spinner(element, min, max) {
    this.element = element;
    this.min = min || 0;
    this.max = isNaN(max) ? Infinity : max;
    this.value = this.min;

    var spinner = this;

    this.incoming = Kefir.emitter();
    /*changes.onValue(function(value) {
        spinner.value = val;
    });*/

    Kefir.fromEvents(element, 'mousedown')
         .map(extractPos)
         .flatMap(function(startPos) {
             var start = spinner.value;
             return Kefir.fromEvents(document.body, 'mousemove')
                         .map(extractPos)
                         .takeUntilBy(Kefir.fromEvents(document.body, 'mouseup'))
                         .map(function(newPos) { return start + (newPos.x - startPos.x); })
                         .onValue(function(num) { spinner.incoming.emit(num); })
         }).onEnd(function() {});

    this.changes = this.incoming.map(function(value) {
        return spinner.setValue(value); // returns value updated to bounds
    });
    //this.changes.onValue(function() {});
}
Spinner.prototype.setValue = function(value) {
    this.value = value;
    return this.checkValue();
}
Spinner.prototype.checkValue = function() {
    if (isNaN(this.value) || (this.value < this.min)) {
        this.value = this.min; this.incoming.emit(this.min);
    }
    if (this.value > this.max) {
        this.value = this.max; this.incoming.emit(this.max);
    }
    return this.value;
}
Spinner.prototype.updateBounds = function(min, max) {
    this.min = min || 0;
    this.max = isNaN(max) ? Infinity : max;
    return this.checkValue();
}
Spinner.prototype.getChangesStream = function() {
    return this.changes;
}

})();
