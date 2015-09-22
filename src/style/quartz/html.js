Rpd.style('quartz', 'html', function(config) {

var d3 = d3 || d3_tiny;

return {

    defaultContentSize: { width: 100, height: 40 },

    edgePadding: { horizontal: 30, vertical: 20 },
    boxPadding:  { horizontal: 20, vertical: 30 },

    createRoot: function(patch, parent) {
        return {
            element: d3.select(document.createElement('div'))
                       .classed('rpd-patch', true).node()
        };
    },

    createNode: function(node, render, description) {

        var nodeElm = d3.select(document.createElement('table'))
                        .attr('class', 'rpd-node');

        // node header: node title and remove button
        nodeElm.append('thead').attr('class', 'rpd-title')
               // remove button
               .call(function(thead) {
                   thead.append('tr').attr('class', 'rpd-remove-button')
                        .append('th')/*.attr('colspan', '3')*/.text('x');
               })
               // node name, and type, if requested
               .call(function(thead) {
                    thead.append('tr').attr('class', 'rpd-header')
                         .append('th').attr('colspan', 3)
                         .call(function(th) {
                             if (config.showTypes) th.append('span').attr('class', 'rpd-type').text(node.type);
                             th.append('span').attr('class', 'rpd-name').text(node.name);
                             // add description to be shown on hover
                             th.attr('title', description ? (description + ' (' + node.type + ')') : node.type);
                         });

               });

        // node content
        nodeElm.append('tbody').attr('class', 'rpd-content')
               .call(function(tbody) {
                   tbody.append('tr')
                        // inlets placeholder
                        .call(function(tr) {
                            tr.append('td').attr('class', 'rpd-inlets')
                              .append('table')
                              .append('tbody')
                              .append('div').attr('class', 'rpd-inlets-target'); // -> node/add-inlet
                        })
                        // node body
                        .call(function(tr) {
                            tr.append('td').attr('class', 'rpd-body')
                              .append('table')
                              .append('tbody').append('tr').append('td')
                              .append('div').attr('class', 'rpd-process-target'); // -> node/process
                        })
                        // outlets placeholder
                        .call(function(tr) {
                            tr.append('td').attr('class', 'rpd-outlets')
                              .append('table')
                              .append('tbody')
                              .append('div').attr('class', 'rpd-outlets-target'); // -> node/add-outlet
                        })
               });

        return {
            element: nodeElm.node(),
            size: render.size ? { width: render.size.width || 30, height: render.size.height || 20 }
                              : { width: 30, height: 20 }
        };

    },

    createInlet: function(inlet, render) {
        return {
            element:
                d3.select(document.createElement('tr'))
                  .attr('class', 'rpd-inlet')
                  .call(function(tr) {
                      tr.append('td').attr('class', 'rpd-connector');
                      tr.append('td').attr('class', 'rpd-value-holder')
                                     .append('span').attr('class', 'rpd-value');
                      tr.append('td').attr('class', 'rpd-name').text(inlet.name);
                      if (config.showTypes) tr.append('td').attr('class', 'rpd-type').text(inlet.type);
                  }).node()
        };
    },

    createOutlet: function(outlet, render) {
        return {
            element:
                d3.select(document.createElement('tr'))
                  .attr('class', 'rpd-outlet')
                  .call(function(tr) {
                      tr.append('td').attr('class', 'rpd-connector');
                      tr.append('td').attr('class', 'rpd-value');
                      if (config.showTypes) tr.append('td').attr('class', 'rpd-type').text(outlet.type);
                      tr.append('td').attr('class', 'rpd-name').text(outlet.name);
                  }).node()
        };
    },

    createLink: function(link) {
        var linkElm = d3.select(document.createElement('span'))
                        .attr('class', 'rpd-link')
                        .style('position', 'absolute')
                        .style('transform-origin', 'left top')
                        .style('-webkit-transform-origin', 'left top');
        return {
            element: linkElm.node(),
            rotate: function(x0, y0, x1, y1) {
                var distance = Math.sqrt(((x0 - x1) * (x0 - x1)) +
                                         ((y0 - y1) * (y0 - y1)));
                var angle = Math.atan2(y1 - y0, x1 - x0);
                linkElm.style('left', x0 + 'px').style('top', y0 + 'px')
                       .style('width', Math.floor(distance) + 'px')
                       .style('transform', 'rotateZ(' + angle + 'rad)')
                       .style('-webkit-transform', 'rotateZ(' + angle + 'rad)');
            }
        }
    }

};

});
