Rpd.style('pd', 'html', function(config) {

var d3 = d3 || d3_tiny;

return {

    edgePadding: { horizontal: 20, vertical: 40 },
    boxPadding:  { horizontal: 20, vertical: 80 },

    createRoot: function(patch, parent) {
        return { element: d3.select(document.createElement('div'))
                            .classed('rpd-patch', true).node() };
    },

    createNode: function(node, render, description) {

        var nodeElm = d3.select(document.createElement('table'))
                        .attr('class', 'rpd-node');

        // inlets placehoder
        nodeElm.append('tr').attr('class', 'rpd-inlets')
               .append('td')
               .append('table').append('tbody').append('tr')
               .append('div').attr('class', 'rpd-inlets-target'); // -> node/add-inlet

        // remove button
        nodeElm.append('tr').attr('class', 'rpd-remove-button')
               .append('td').text('x');

        // node content
        nodeElm.append('tr').attr('class', 'rpd-content')
                .call(function(tr) {
                    tr.append('td').attr('class', 'rpd-title').classed('rpd-header', true)
                      .call(function(td) {
                          td.append('span').attr('class', 'rpd-name').text(node.name);
                          if (config.showTypes) td.append('span').attr('class', 'rpd-type').text(node.type);
                          // add description to be shown on hover
                          td.attr('title', description ? (description + ' (' + node.type + ')') : node.type);
                      })
                    tr.append('td').attr('class', 'rpd-body')
                      .append('div')
                      .append('table').append('tbody').append('tr').append('td')
                      .append('div').attr('class', 'rpd-process-target'); // -> node/process
                })

        // outlets placeholder
        nodeElm.append('tr').attr('class', 'rpd-outlets')
               .append('td')
               .append('table').append('tbody').append('tr')
               .append('div').attr('class', 'rpd-outlets-target'); // -> node/add-outlet

        return {
            element: nodeElm.node(),
            size: render.size ? { width: render.size.width || 100, height: render.size.height || 40 }
                              : { width: 100, height: 40 }
        };

    },

    createInlet: function(inlet, render) {
        return {
            element:
                d3.select(document.createElement('td')).attr('class', 'rpd-inlet')
                  .call(function(td) {
                      td.append('span').attr('class', 'rpd-connector');
                      td.append('span').attr('class', 'rpd-name').text(inlet.name);
                      td.append('span').attr('class', 'rpd-value-holder')
                                       .append('span').attr('class', 'rpd-value');
                      if (config.showTypes) td.append('span').attr('class', 'rpd-type').text(inlet.type);
                  }).node()
        }
    },

    createOutlet: function(outlet, render) {
        return {
            element:
                d3.select(document.createElement('td')).attr('class', 'rpd-outlet')
                  .call(function(td) {
                      td.append('span').attr('class', 'rpd-connector');
                      td.append('span').attr('class', 'rpd-name').text(outlet.name);
                      td.append('span').attr('class', 'rpd-value');
                      if (config.showTypes) td.append('span').attr('class', 'rpd-type').text(outlet.type);
                  }).node();
       }
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
