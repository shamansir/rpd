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

        var patch = this.patch;

        var nodeTypes = Rpd.allNodeTypes,
            nodeDescriptions = Rpd.allNodeDescriptions,
            toolkitIcons = Rpd.allToolkitIcons,
            nodeTypeIcons = Rpd.allNodeTypeIcons;

        // collect all the known node types
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

        // prepare a storage for elements with corresponding types
        var listElements = [];

        // attach text input, search field, to let user filter results
        var search = d3.select(bodyElm).append('input').attr('type', 'text');

        // attach a button which is able to clear this field
        var clearSearch = d3.select(bodyElm).append('a').attr('href', '#').text('x');
        var clearingEvents = Kefir.fromEvents(clearSearch.node(), 'click').onValue(function() {
            search.node().value = '';
        });

        var selected;
        function updateSelection(to) {
            if (selected) selected.element.classed('rpd-nodelist-selected', false);
            selected = to;
            if (selected) selected.element.classed('rpd-nodelist-selected', true);
        };

        function updateVisibility(elm, visible) {
            elm.style('display', visible ? 'list-item' : 'none');
        }

        // build the list html structure
        d3.select(bodyElm)
          .append('dl')
          .call(function(dl) {
              Object.keys(nodeTypesByToolkit).forEach(function(toolkit) {

                  dl.append('dt')
                    .call(function(dt) {
                        if (toolkitIcons[toolkit]) dt.append('span').attr('class', 'rpd-nodelist-toolkit-icon').text(toolkitIcons[toolkit]);
                        dt.append('span').attr('class', 'rpd-nodelist-toolkit-name').text(toolkit)
                    });

                  dl.append('dd')
                    .append('ul')
                    .call(function(ul) {
                        nodeTypesByToolkit[toolkit].types.forEach(function(nodeTypeDef) {
                            var nodeType = nodeTypeDef.fullName;
                            ul.append('li')
                              .call(function(li) {

                                  var elmData = { def: nodeTypeDef,
                                                  element: li };

                                  li.data(elmData);

                                  if (nodeTypeIcons[nodeType]) {
                                      li.append('span').attr('class', 'rpd-nodelist-icon').text(nodeTypeIcons[nodeType]);
                                  }
                                  li.append('span').attr('class', 'rpd-nodelist-toolkit').text(nodeTypeDef.toolkit);
                                  li.append('span').attr('class', 'rpd-nodelist-separator').text('/');
                                  li.append('span').attr('class', 'rpd-nodelist-typename').text(nodeTypeDef.name);
                                  if (nodeDescriptions[nodeType]) {
                                      li.append('span').attr('class', 'rpd-nodelist-description')
                                                       .attr('title', nodeDescriptions[nodeType])
                                                       .text(nodeDescriptions[nodeType]);
                                  }
                                  listElements.push(elmData);

                                  // add the corresponding node when it's element was clicked with mouse
                                  Kefir.fromEvents(li.node(), 'click')
                                       .onValue(function() {
                                           updateSelection(li.data());
                                           console.log('click', 'add', selected.def.fullName);
                                           //patch.addNode(li.data().def.fullName);
                                       });
                              })
                        });
                    });

              });
          });

        // make the list of elements double-linked and looped,
        // so easy navigation with up/down arrow keys will be possible
        for (var i = 0; i < listElements.length; i++) {
            listElements[i].visible = true;
            listElements[i].prev = (i > 0) ? listElements[i - 1] : listElements[listElements.length - 1];
            listElements[i].next = (i < listElements.length - 1) ? listElements[i + 1] : listElements[0];
        }

        // make seach field hide filtered results when user changes search request
        var currentlyVisible = listElements.length;
        Kefir.fromEvents(search.node(), 'input')
             .merge(clearingEvents)
             .throttle(500)
             .map(function() { return search.node().value; })
             .onValue(function(searchString) {
                 currentlyVisible = 0;
                 listElements.forEach(function(elmData) {
                     var index = elmData.def.fullName.indexOf(searchString);
                     updateVisibility(elmData.element, index >= 0);
                     elmData.visible = (index >= 0);
                     if (elmData.visible) currentlyVisible++;
                 });
             });

        // ctrl+space should focus on the search field and up/down arrows should
        // work for selection
        Kefir.merge([
                Kefir.fromEvents(document.body, 'keyup')
                     .filter(function(evt) {
                         // control / alt / cmd + space
                         return (evt.which == 32 || evt.keyCode == 32) && (evt.altKey || evt.metaKey || evt.ctrlKey);
                     }),
                Kefir.fromEvents(search.node(), 'click')/*.filter(function() {
                        return !document.activeElement || (document.activeElement !== search.node());
                    })*/
            ]).flatMap(function(switchedOn) {
                 console.log('start!'); search.node().focus();
                 if (listElements.length > 0) updateSelection(listElements[0]);
                 return Kefir.fromEvents(document.body, 'keyup')
                             .map(function(evt) { return evt.which || evt.keyCode; })
                             .filter(function(key) { return (key === 38) || (key === 40); })
                             .map(function(key) { return (key === 38) ? 'up' : 'down'; })
                             .takeUntilBy(Kefir.merge([
                                              Kefir.fromEvents(document.body, 'keyup')
                                                   .filter(function(evt) {
                                                       return (evt.which == 13 || evt.keyCode == 13); // key == enter
                                                   }).map(function() { return true; }),
                                              Kefir.fromEvents(document.body, 'keyup').filter(function(evt) {
                                                  return (evt.which == 27 || evt.keyCode == 27); // key === escape
                                              }).map(function() { return false; }),
                                              Kefir.fromEvents(document.body, 'click').filter(function(evt) {
                                                  return evt.target !== search.node();
                                              }).map(function() { return false; }),
                                              clearingEvents.map(function() { return false; })/*,
                                              Kefir.fromEvents(search.node(), 'click')*/
                                          ]).take(1).onValue(function(doAdd) {
                                              if (doAdd && selected) {
                                                  console.log('enter', 'add', selected.def.fullName);
                                              }
                                              console.log('clear selection');
                                              search.node().blur();
                                              updateSelection(null);
                                          }))
                             .onValue(function(key) {
                                 if (currentlyVisible == 0) return;
                                 search.node().blur();
                                 if (key === 'up') {
                                     var current = selected ? selected.prev : listElements[listElements.length - 1];
                                     while (current && !current.visible) {
                                         current = current.prev;
                                     }
                                 } else if (key === 'down') {
                                     var current = selected ? selected.next : listElements[0];
                                     while (current && !current.visible) {
                                         current = current.next;
                                     }
                                 }
                                 console.log('select', current ? current.def.fullName : 'NONE');
                                 if (current) updateSelection(current);
                             });
             }).onValue(function() {});

    }
});

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
