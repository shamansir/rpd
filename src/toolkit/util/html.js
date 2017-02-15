;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

Rpd.channelrenderer('util/boolean', 'html', {
    /* show: function(target, value) { }, */
    /* edit: function(target, inlet, valueIn) {
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
    } */
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

Rpd.channelrenderer('util/wholenumber', 'html', Rpd.allChannelRenderers['util/number']['html']);

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
        size: { width: 25 },
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

Rpd.noderenderer('util/comment', 'html', function() {
    var textElm;
    return {
        size: { width: 100, height: 150 },
        first: function(bodyElm) {
            textElm = document.createElement('span');
            bodyElm.appendChild(textElm);
        },
        always: function(bodyElm, inlets, outlets) {
            if (inlets.width) bodyElm.style.width = inlets.width + 'px';
            textElm.textContent = textElm.innerText = inlets.text || '<empty>';
        }
    }
});

Rpd.noderenderer('util/log', 'html', function() {
    var textElm;
    var capacity = 5;
    var savedValues = [];
    return {
        size: { width: 130, height: 30 },
        first: function(bodyElm) {
            textElm = document.createElement('span');
            bodyElm.appendChild(textElm);
        },
        always: function(bodyElm, inlets, outlets) {
            if (inlets.what) {
                if (savedValues.length > capacity) savedValues.shift();
                savedValues.push(inlets.what);
            }
            textElm.textContent = textElm.innerText = (savedValues.length > 0) ? ('...' + savedValues.join(', ') + '.') : '...';
        }
    }
});

Rpd.noderenderer('util/sum-of-three', 'html', {
    size: { width: null, height: 80 },
    always: function(bodyElm, inlets, outlets) {
        bodyElm.innerHTML = '∑ (' + (inlets.a || '?') + ', '
                                  + (inlets.b || '?') + ', '
                                  + (inlets.c || '?') + ') = ' + (outlets.sum || '?');
    }
});

var toHexColor = RpdUtils.toHexColor;

Rpd.noderenderer('util/color', 'html', function() {
    var colorElm;
    return {
        size: { width: 30, height: 30 },
        first: function(bodyElm) {
            colorElm = document.createElement('span');
            colorElm.classList.add('rpd-util-color-display');
            bodyElm.appendChild(colorElm);
        },
        always: function(bodyElm, inlets, outlets) {
            colorElm.style.backgroundColor = toHexColor(outlets.color);
        }
    }
});

Rpd.noderenderer('util/bang', 'html', function() {
    var bangElm;
    return {
        size: { width: 30, height: 25 },
        first: function(bodyElm) {
            bangElm = document.createElement('span');
            var bangClicks = Kefir.fromEvents(bangElm, 'click');
            bodyElm.appendChild(bangElm);
            bangClicks.onValue(function() {
                bangElm.classList.add('rpd-util-bang-fresh');
            });
            bangClicks.delay(500).onValue(function() {
                bangElm.classList.remove('rpd-util-bang-fresh');
            });
            return { 'trigger':
                { valueOut: bangClicks.map(function() { return {}; }) }
            };
        }
    }
});

Rpd.noderenderer('util/metro', 'html', function() {
    var metroElm;
    return {
        size: { width: 30, height: 25 },
        first: function(bodyElm) {
            metroElm = document.createElement('span');
            bodyElm.appendChild(metroElm);
        },
        always: function(bodyElm, inlets, outlets) {
            if (outlets.bang) {
                outlets.bang.onValue(function() {
                    metroElm.classList.add('rpd-util-metro-fresh');
                }).delay(500).onValue(function() {
                    metroElm.classList.remove('rpd-util-metro-fresh');
                });
            }
        }
    }
});

var d3 = d3 || d3_tiny;

var NodeList = RpdUtils.NodeList;
var getNodeTypesByToolkit = RpdUtils.getNodeTypesByToolkit;

Rpd.noderenderer('util/nodelist', 'html', {
    first: function(bodyElm) {

        var patch = this.patch;

        var nodeTypes = Rpd.allNodeTypes,
            nodeDescriptions = Rpd.allNodeDescriptions,
            toolkitIcons = Rpd.allToolkitIcons,
            nodeTypeIcons = Rpd.allNodeTypeIcons;

        var nodeTypesByToolkit = getNodeTypesByToolkit(nodeTypes);

        var nodeList = new NodeList({
            getPatch: function() { return patch; },
            buildList: function() {
                var listElements = [];

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

                                          li.append('span').attr('class', 'rpd-nodelist-icon').text(nodeTypeIcons[nodeType] || String.fromCharCode(160));
                                          li.append('span').attr('class', 'rpd-nodelist-fulltypename')
                                            .call(function(span) {
                                                span.append('span').attr('class', 'rpd-nodelist-toolkit').text(nodeTypeDef.toolkit);
                                                span.append('span').attr('class', 'rpd-nodelist-separator').text('/');
                                                span.append('span').attr('class', 'rpd-nodelist-typename').text(nodeTypeDef.name);
                                            })
                                          if (nodeDescriptions[nodeType]) {
                                              li.append('span').attr('class', 'rpd-nodelist-description')
                                                               .attr('title', nodeDescriptions[nodeType])
                                                               .text(nodeDescriptions[nodeType]);
                                          }

                                          listElements.push(elmData);

                                      })
                                });
                            });

                      });
                  });

                return listElements;
            },
            createSearchInput: function() {
                return d3.select(bodyElm).append('input').attr('type', 'text');
            },
            createClearSearchButton: function() {
                return d3.select(bodyElm).append('a').attr('href', '#').text('x');
            },
            clearSearchInput: function(searchInput) { searchInput.node().value = ''; },
            recalculateSize: function() {},
            markSelected: function(elmData) { elmData.element.classed('rpd-nodelist-selected', true); },
            markDeselected: function(elmData) { elmData.element.classed('rpd-nodelist-selected', false); },
            markAdding: function(elmData) { elmData.element.classed('rpd-nodelist-add-effect', true); },
            markAdded: function(elmData) { elmData.element.classed('rpd-nodelist-add-effect', false); },
            setVisible: function(elmData) { elmData.element.style('display', 'list-item'); },
            setInvisible: function(elmData) { elmData.element.style('display', 'none'); }
        });

        nodeList.addOnClick();
        nodeList.addSearch();
        nodeList.addCtrlSpaceAndArrows();

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

})(this);
