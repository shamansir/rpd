;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

function stopPropagation(event) {
    event.stopPropagation();
    return event;
}

var d3 = d3 || d3_tiny;

function svgNode(name) { return document.createElementNS(d3.ns.prefix.svg, name); }
function htmlNode(name) { return document.createElementNS(d3.ns.prefix.html, name); }

// FIXME: some nodes below are written with d3 / d3_tiny usage, some are not

/* ========================= util/number ========================= */

Rpd.channelrenderer('util/number', 'svg', {
    /* show: function(target, value) { }, */
    edit: function(target, inlet, valueIn) {
        var foElm = svgNode('foreignObject');
        foElm.setAttributeNS(null, 'width', 20);
        foElm.setAttributeNS(null, 'height', 30);
        var valInput = htmlNode('input');
        valInput.type = 'number';
        //valInput.style.position = 'absolute';
        valueIn.onValue(function(val) {
            valInput.value = val;
        });
        foElm.appendChild(valInput);
        target.appendChild(foElm);
        return Kefir.fromEvents(valInput, 'change')
                    .map(function() {
                        return valInput.value;
                    });
    }
});

/* ========================= util/wholenumber ========================= */

Rpd.channelrenderer('util/wholenumber', 'svg', Rpd.allChannelRenderers['util/number']['svg']);

/* ========================= util/random ========================= */

Rpd.noderenderer('util/random', 'svg', function() {
    return {
        size: { width: 40 }
    }
});

/* ========================= util/comment ========================= */

Rpd.noderenderer('util/comment', 'svg', function() {
    var textElm;
    return {
        size: { width: 100, height: 150 },
        first: function(bodyElm) {
            textElm = d3.select(bodyElm).append('text');
        },
        always: function(bodyElm, inlets, outlets) {
            if (inlets.width) textElm.attr('width', inlets.width);
            textElm.text(inlets.text || '<empty>');
        }
    }
});

/* ========================= util/log ========================= */

Rpd.noderenderer('util/log', 'svg', function() {
    var textElm;
    var capacity = 5;
    var savedValues = [];
    return {
        size: { width: 140, height: 30 },
        first: function(bodyElm) {
            textElm = d3.select(bodyElm).append('text');
        },
        always: function(bodyElm, inlets, outlets) {
            if (inlets.what) {
                if (savedValues.length > capacity) savedValues.shift();
                savedValues.push(inlets.what);
            }
            textElm.text((savedValues.length > 0) ? ('...' + savedValues.join(', ') + '.') : '...');
        }
    }
});

/* ========================= util/letter ========================= */

Rpd.noderenderer('util/letter', 'svg', function() {
    var textElm;
    return {
        first: function(bodyElm) {
            textElm = d3.select(bodyElm).append('text');
        },
        always: function(bodyElm, inlets, outlets) {
            textElm.text(outlets.letter);
        }
    }
});

/* ========================= util/bang ========================= */

Rpd.noderenderer('util/bang', 'svg', {
    size: { width: 30, height: 25 },
    first: function(bodyElm) {
        var circle = d3.select(svgNode('circle'))
                       .attr('r', 9).attr('fill', 'black')
                       .style('cursor', 'pointer')
                       .style('pointer-events', 'all');
        d3.select(bodyElm).append(circle.node());
        var circleClicks = Kefir.fromEvents(circle.node(), 'click');
        circleClicks.onValue(function() {
            circle.classed('rpd-util-bang-fresh', true);
        });
        circleClicks.delay(500).onValue(function() {
            circle.classed('rpd-util-bang-fresh', false);
        });
        return { 'trigger':
            { valueOut: circleClicks.map(function() { return {}; }) }
        };
    }
});

/* ========================= util/metro ========================= */

Rpd.noderenderer('util/metro', 'svg', function() {
    var circle;
    return {
        size: { width: 30, height: 25 },
        first: function(bodyElm) {
            circle = d3.select(svgNode('circle'))
                       .attr('r', 9).attr('fill', 'black')
                       .style('cursor', 'pointer')
                       .style('pointer-events', 'all');
            d3.select(bodyElm).append(circle.node());
        },
        always: function(bodyElm, inlets, outlets) {
            if (outlets.bang) {
                outlets.bang.onValue(function() {
                    circle.classed('rpd-util-metro-fresh', true);
                }).delay(500).onValue(function() {
                    circle.classed('rpd-util-metro-fresh', false);
                });
            }
        }
    }
});

/* ========================= util/palette ========================= */

/* Rpd.noderenderer('util/palette', 'svg', function() {
    var cellSide = 12;
    return {
        size: { width: 365, height: 60 },
        first: function(bodyElm) {
            var paletteChange = Kefir.emitter();
            var lastSelected, paletteGroups = [];
            d3.select(bodyElm)
              .append('g').attr('transform', 'translate(5, 0)')
              .call(function(target) {
                PALETTES.forEach(function(palette, i) {
                    target.append('g')
                          .attr('class', 'rpd-util-palette-variant')
                          .attr('transform', 'translate(' + (i * 14) + ', ' +
                                                            (-1 * (palette.length / 2 * cellSide)) + ')')
                          .call((function(palette) { return function(paletteGroup) {
                              palette.forEach(function(color, i) {
                                  paletteGroup.append('rect').attr('rx', 4)
                                              .attr('x', 0).attr('y', i * cellSide)
                                              .attr('width', cellSide).attr('height', cellSide)
                                              .attr('fill', color);
                              });
                              Kefir.fromEvents(paletteGroup.node(), 'click').onValue(function() {
                                  if (lastSelected) lastSelected.attr('class', 'rpd-util-palette-variant')
                                  paletteGroup.attr('class', 'rpd-util-palette-variant rpd-util-palette-active-variant');
                                  lastSelected = paletteGroup;
                                  paletteChange.emit(palette);
                              });
                              paletteGroups.push(paletteGroup);
                          } })(palette));
                });
            });
            lastSelected = paletteGroups[0];
            paletteGroups[0].attr('class', 'rpd-util-palette-variant rpd-util-palette-active-variant');
            return { 'selection': { valueOut: paletteChange } };
        }
    };
}); */

/* ========================= util/sum-of-three ========================= */

Rpd.noderenderer('util/sum-of-three', 'svg', function() {
    var textElement;
    return {
        //contentRule: 'replace',
        size: { width: 120, height: null },
        first: function(bodyElm) {
            textElement = svgNode('text');
            bodyElm.appendChild(textElement);
        },
        always: function(bodyElm, inlets, outlets) {
            textElement.innerHTML = '∑ (' + (inlets.a || '?') + ', '
                                          + (inlets.b || '?') + ', '
                                          + (inlets.c || '?') + ') = ' + (outlets.sum || '?');
        }
    }
});

/* ========================= util/knob & util/knobs ========================= */

var adaptToState = RpdUtils.adaptToState;

var defaultKnobConf = {
    speed: 1.5,
    radius: 13,
    width: 40, // radius * 2 + margin
    height: 40,
    //showIntTicks: false,
    //stickToInts: false,
    showGhost: true,
    adaptAngle: null,
    adaptValue: null
};

function createKnob(state, conf) {
    var lastValue = 0;
    //var state = { min: 0, max: 100 };

    var adaptAngle = conf.adaptAngle || function(s, v) { return v * 360; };

    return {
        init: function(parent, valueIn) {
            var hand, handGhost, face, text;
            var submit = Kefir.emitter();
            d3.select(parent)
              .call(function(bodyGroup) {
                  face = bodyGroup.append('circle').attr('r', conf.radius)
                                  .style('fill', 'rgba(200, 200, 200, .2)')
                                  .style('stroke-width', 2)
                                  .style('stroke', '#000');
                  handGhost = bodyGroup.append('line')
                                  .style('visibility', 'hidden')
                                  .attr('x1', 0).attr('y1', 0)
                                  .attr('x2', 0).attr('y2', conf.radius - 1)
                                  .style('stroke-width', 2)
                                  .style('stroke', 'rgba(255,255,255,0.1)');
                  hand = bodyGroup.append('line')
                                  .attr('x1', 0).attr('y1', 0)
                                  .attr('x2', 0).attr('y2', conf.radius)
                                  .style('stroke-width', 2)
                                  .style('stroke', '#000');
                  text = bodyGroup.append('text')
                                  .style('text-anchor', 'middle')
                                  .style('fill', '#fff')
                                  .text(0);
              });
            Kefir.fromEvents(parent, 'mousedown')
                 .map(stopPropagation)
                 .flatMap(function() {
                     if (conf.showGhost) handGhost.style('visibility', 'visible');
                     var values =
                        Kefir.fromEvents(document.body, 'mousemove')
                             //.throttle(16)
                             .takeUntilBy(Kefir.fromEvents(document.body, 'mouseup'))
                             .map(stopPropagation)
                             .map(function(event) {
                                 var faceRect = face.node().getBoundingClientRect();
                                 return { x: event.clientX - (faceRect.left + conf.radius),
                                          y: event.clientY - (faceRect.top + conf.radius) };
                             })
                             .map(function(coords) {
                                 var value = ((coords.y * conf.speed * -1) + 180) / 360;
                                 if (value < 0) {
                                     value = 0;
                                 } else if (value > 1) {
                                     value = 1;
                                 }
                                 return value;
                            });
                     values.last().onValue(function(val) {
                         lastValue = val;
                         handGhost.attr('transform', 'rotate(' + adaptAngle(state, lastValue) + ')')
                                  .style('visibility', 'hidden');
                         submit.emit(lastValue);
                     });
                     return values;
                 })
                 .merge(valueIn || Kefir.never())
                 .onValue(function(value) {
                     var valueText = adaptToState(state, value);
                     text.text(conf.adaptValue ? conf.adaptValue(valueText) : valueText);
                     hand.attr('transform', 'rotate(' + adaptAngle(state, value) + ')');
                 });
            return submit.merge(valueIn ? valueIn : Kefir.never());
        }
    }
}

function initKnobInGroup(knob, nodeRoot, id, count, width) {
    var submit;
    d3.select(nodeRoot).append('g')
      .attr('transform', 'translate(' + ((id * width) + (width / 2) - (count * width / 2)) + ',0)')
      .call(function(knobRoot) {
          knob.root = knobRoot;
          submit = knob.init(knobRoot.node());
      });
    return submit;
}

Rpd.noderenderer('util/knob', 'svg', function() {
    var state = { min: 0, max: 100 };
    var knob = createKnob(state, defaultKnobConf);

    return {
        size: { width: defaultKnobConf.width,
                height: defaultKnobConf.height },
        first: function(bodyElm, configurationIn) {
            var submit = knob.init(bodyElm,
                                   configurationIn.filter(function(c) { return c.hasOwnProperty('knob'); })
                                                  .map(function(c) { return c.knob; }));
            return {
                'knob': { valueOut: submit }
            };
        },
        always: function(bodyElm, inlets, outlets) {
            state.min = inlets.min || 0;
            state.max = inlets.max || 0;
        }
    };
});

Rpd.noderenderer('util/dial', 'svg', function() {
    // TODO: make it "sticky", so the hand would stick to int positions
    var state = { min: 0, max: 100 };
    var myKnobConf = {
        speed: defaultKnobConf.speed,
        radius: defaultKnobConf.radius,
        width: defaultKnobConf.width,
        height: defaultKnobConf.height,
        adaptValue: function(value) { return Math.floor(value); }
    };
    var knob = createKnob(state, myKnobConf);
    return {
        size: { width: myKnobConf.width,
                height: myKnobConf.height },
        first: function(bodyElm, configurationIn) {
            var submit = knob.init(bodyElm,
                                   configurationIn.filter(function(c) { return c.hasOwnProperty('dial'); })
                                                  .map(function(c) { return c.dial; }));
            return {
                'dial': { valueOut: submit }
            };
        },
        always: function(bodyElm, inlets, outlets) {
            state.min = inlets.min || 0;
            state.max = inlets.max || 0;
        }
    };
});

var DEFAULT_KNOB_COUNT = 4;

Rpd.noderenderer('util/knobs', 'svg', function() {
    var count = DEFAULT_KNOB_COUNT;
    var state = { min: 0, max: 100 };
    var knobs = [];
    for (var i = 0; i < count; i++) {
        knobs.push(createKnob(state, defaultKnobConf));
    }
    var nodeRoot;

    return {
        size: { width: count * defaultKnobConf.width, height: defaultKnobConf.height },
        //pivot: { x: 0, y: 0.5 },
        first: function(bodyElm) {
            var valueOut = Kefir.pool();
            nodeRoot = bodyElm;
            valueOut = Kefir.combine(
                knobs.map(function(knob, i) {
                    return initKnobInGroup(knob, nodeRoot, i, count, defaultKnobConf.width)
                           .merge(Kefir.constant(0));
                           // knob.init() returns stream of updates,
                           // so Kefir.combine will send every change
                })
            );
            return {
                'submit': { valueOut: valueOut }
            };
        },
        always: function(bodyElm, inlets, outlets) {
            state.min = inlets.min || 0;
            state.max = inlets.max || 0;
        }
    };
});

/* ========================= util/color ========================= */

var toHexColor = RpdUtils.toHexColor;

Rpd.noderenderer('util/color', 'svg', function() {
    var colorElm;
    return {
        size: { width: 50, height: 50 },
        first: function(bodyElm) {
            colorElm = svgNode('rect');
            colorElm.setAttributeNS(null, 'width', '30');
            colorElm.setAttributeNS(null, 'height', '30');
            colorElm.setAttributeNS(null, 'rx', '5');
            colorElm.setAttributeNS(null, 'ry', '5');
            colorElm.setAttributeNS(null, 'transform', 'translate(-15,-15)');
            colorElm.classList.add('rpd-util-color-display');
            bodyElm.appendChild(colorElm);
        },
        always: function(bodyElm, inlets, outlets) {
            colorElm.setAttributeNS(null, 'fill', toHexColor(outlets.color));
        }
    }
});

/* ========================= util/mouse-pos[-by-bang] ========================= */

// define separately to use for both `util/mouse-pos` and `util/mouse-pos-by-bang`
function mousePosNodeRenderer() {
    var radius = 20;
    var dirLine, dirCircle, posText, center;
    var xPosStream = Kefir.fromEvents(document.body, 'mousemove').throttle(16).map(function(evt) { return evt.x; });
    var yPosStream = Kefir.fromEvents(document.body, 'mousemove').throttle(16).map(function(evt) { return evt.y; });
    return {
        size: { width: radius * 2 + 10, height: radius * 2 + 10 },
        first: function(bodyElm) {
            var dirGroup = svgNode('g');
            dirCircle = svgNode('circle');
            dirLine = svgNode('line');
            posText = svgNode('text');

            dirLine.setAttributeNS(null, 'x1', 0);
            dirLine.setAttributeNS(null, 'y1', 0);
            dirLine.setAttributeNS(null, 'x2', 0);
            dirLine.setAttributeNS(null, 'y2', -radius);
            //dirLine.setAttributeNS(null, 'strokeWidth', 1);

            dirCircle.setAttributeNS(null, 'r', radius);

            dirGroup.appendChild(dirCircle);
            dirGroup.appendChild(dirLine);
            bodyElm.appendChild(dirGroup);
            bodyElm.appendChild(posText);

            return {
                x: { 'default': 0, valueOut: xPosStream },
                y: { 'default': 0, valueOut: yPosStream }
            }
        },
        always: function(bodyElm, inlets, outlets) {
            if (Number.isNaN(inlets.x) || Number.isNaN(inlets.y) || !inlets.y) return;
            var center = dirCircle.getBoundingClientRect();
            var angle = Math.atan2(inlets.y - (center.top + radius),
                                   inlets.x - (center.left + radius));
            dirLine.setAttributeNS(null, 'x2', Math.cos(angle) * radius);
            dirLine.setAttributeNS(null, 'y2', Math.sin(angle) * radius);
            posText.innerHTML = posText.innerText = '<' + inlets.x + ':' + inlets.y + '>';
        }
    }
}

Rpd.noderenderer('util/mouse-pos', 'svg', mousePosNodeRenderer);
Rpd.noderenderer('util/mouse-pos-by-bang', 'svg', mousePosNodeRenderer);

/* ========================= util/nodelist ========================= */

var NodeList = RpdUtils.NodeList;
var getNodeTypesByToolkit = RpdUtils.getNodeTypesByToolkit;

var nodeListSize = { width: 180, height: 300 };

var lineHeight = 22;  // find font-size?
var iconWidth = 11;
var inputWidth = nodeListSize.width - 40;
var inputHeight = 45;

Rpd.noderenderer('util/nodelist', 'svg', {
    size: nodeListSize,
    first: function(bodyElm) {

        var patch = this.patch;

        var nodeTypes = Rpd.allNodeTypes,
            nodeDescriptions = Rpd.allNodeDescriptions,
            toolkitIcons = Rpd.allToolkitIcons,
            nodeTypeIcons = Rpd.allNodeTypeIcons;

        var nodeTypesByToolkit = getNodeTypesByToolkit(nodeTypes);

        var bodyGroup = d3.select(bodyElm)
                           .append('g')
                           .attr('transform', 'translate(' + (-1 * nodeListSize.width / 2) + ','
                                                           + (-1 * nodeListSize.height / 2) + ')');
        var searchGroup = bodyGroup.append('g').classed('rpd-nodelist-search', true)
                                               .attr('transform', 'translate(12,12)');

        var nodeListSvg;

        var tookitElements = {},
            listElementsIdxByType = {};

        var nodeList = new NodeList({
            getPatch: function() { return patch; },
            buildList: function() {
                var listElements = [];

                var bodyRect = bodyGroup.node().getBoundingClientRect();

                var foreignDiv = bodyGroup.append(svgNode('foreignObject'))
                                       .append(htmlNode('div'))
                                       .style('width', (nodeListSize.width - 20) + 'px')
                                       .style('height', (nodeListSize.height - inputHeight) + 'px')
                                       .style('overflow-y', 'scroll')
                                       .style('position', 'fixed').style('left', 10 + 'px')
                                                                  .style('top', inputHeight + 'px');

                nodeListSvg = foreignDiv.append(svgNode('svg'))
                                        .classed('rpd-nodelist-list', true)
                                        .attr('width', (nodeListSize.width - 12) + 'px');
                var lastY = 0;

                nodeListSvg.append('g')
                  .call(function(g) {
                      Object.keys(nodeTypesByToolkit).forEach(function(toolkit) {

                          var toolkitGroup = g.append('g').classed('rpd-nodelist-toolkit', true)
                                              .attr('transform', 'translate(0,' + lastY + ')')
                           .call(function(g) {
                                if (toolkitIcons[toolkit]) g.append('text').attr('class', 'rpd-nodelist-toolkit-icon').text(toolkitIcons[toolkit]);
                                g.append('text').attr('class', 'rpd-nodelist-toolkit-name').text(toolkit)
                           });

                          tookitElements[toolkit] = toolkitGroup;

                          lastY += lineHeight;

                          g.append('g').classed('rpd-nodelist-nodetypes', true)
                           .call(function(g) {
                                nodeTypesByToolkit[toolkit].types.forEach(function(nodeTypeDef) {
                                    var nodeType = nodeTypeDef.fullName;
                                    g.append('g').classed('rpd-nodelist-nodetype', true)
                                      .attr('transform', 'translate(0,' + lastY + ')')
                                     .call(function(g) {

                                          var hasDescription = nodeDescriptions[nodeType] ? true : false;

                                          var elmData = { def: nodeTypeDef,
                                                          element: g,
                                                          hasDescription: hasDescription,
                                                          initialY: lastY };

                                          g.data(elmData);

                                          g.append('rect').attr('class', 'rpd-nodelist-item-bg')
                                                          .attr('x', 0).attr('y', -5).attr('rx', 5).attr('ry', 5)
                                                          .attr('width', nodeListSize.width - 20)
                                                          .attr('height', (hasDescription ? (lineHeight * 1.5) : lineHeight) - 5);
                                          g.append('text').attr('class', 'rpd-nodelist-icon').text(nodeTypeIcons[nodeType] || ' ')
                                                          .attr('x', (iconWidth / 2)).attr('y', 5);
                                          g.append('text').attr('class', 'rpd-nodelist-fulltypename')
                                                          .attr('transform', 'translate(' + (iconWidth + 4) + ',0)')
                                                          .text(nodeTypeDef.toolkit + '/' + nodeTypeDef.name)
                                          if (hasDescription) {
                                              lastY += (lineHeight * 0.5);
                                              g.select('rect').attr('title', nodeDescriptions[nodeType]);
                                              g.append('text').attr('class', 'rpd-nodelist-description')
                                                              .attr('transform', 'translate(3,' + (lineHeight * 0.6) + ')')
                                                              .text(nodeDescriptions[nodeType]);
                                          }

                                          listElements.push(elmData);

                                          listElementsIdxByType[nodeType] = listElements.length - 1;

                                          lastY += lineHeight;

                                      });
                                });
                           });

                      });
                  });

                nodeListSvg.attr('height', lastY + 'px');

                return listElements;
            },
            recalculateSize: function(listElements) {
                var lastY = 0;

                Object.keys(nodeTypesByToolkit).forEach(function(toolkit) {
                    tookitElements[toolkit].attr('transform', 'translate(0,' + lastY + ')');

                    lastY += lineHeight;

                    var elmDataIdx, elmData;

                    nodeTypesByToolkit[toolkit].types.forEach(function(nodeTypeDef) {
                        elmDataIdx = listElementsIdxByType[nodeTypeDef.fullName];
                        elmData = listElements[elmDataIdx];

                        if (elmData.visible) {
                            elmData.element.attr('transform', 'translate(0,' + lastY + ')');
                            lastY += lineHeight;
                            if (elmData.hasDescription) lastY += (lineHeight * 0.5);
                        }

                    });

                });

                nodeListSvg.attr('height', lastY + 'px');
            },
            createSearchInput: function() {
                var foElm = svgNode('foreignObject');
                foElm.setAttributeNS(null, 'width', inputWidth);
                foElm.setAttributeNS(null, 'height', 20);
                var input = htmlNode('input');
                input.setAttribute('type', 'text');
                input.style.width = inputWidth + 'px';
                foElm.appendChild(input);
                searchGroup.append(foElm);
                return d3.select(input);
            },
            createClearSearchButton: function() {
                searchGroup.append('rect').attr('transform', 'translate(' + (nodeListSize.width - 32) + ',7)')
                           .attr('width', 12).attr('height', 12).attr('rx', 5);
                return searchGroup.append('text').text('x')
                                  .attr('transform', 'translate(' + (nodeListSize.width - 26) + ',12)');
            },
            clearSearchInput: function(searchInput) { searchInput.node().value = ''; },
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

})(this);
