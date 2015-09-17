Rpd.style('pd', 'html', function(config) {

var d3 = d3 || d3_tiny;

return {

    edgePadding: { horizontal: 20, vertical: 40 },
    boxPadding:  { horizontal: 20, vertical: 80 },

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

        return nodeElm;

    },

    createInlet: function(inlet, render) {
        return d3.select(document.createElement('td')).attr('class', 'rpd-inlet')
                 .call(function(td) {
                     td.append('span').attr('class', 'rpd-connector');
                     td.append('span').attr('class', 'rpd-name').text(inlet.name);
                     td.append('span').attr('class', 'rpd-value-holder')
                                     .append('span').attr('class', 'rpd-value');
                     if (config.showTypes) td.append('span').attr('class', 'rpd-type').text(inlet.type);
                 })
    },

    createOutlet: function(outlet, render) {
        return d3.select(document.createElement('td')).attr('class', 'rpd-outlet')
                 .call(function(td) {
                     td.append('span').attr('class', 'rpd-connector');
                     td.append('span').attr('class', 'rpd-name').text(outlet.name);
                     td.append('span').attr('class', 'rpd-value');
                     if (config.showTypes) td.append('span').attr('class', 'rpd-type').text(outlet.type);
                 });
    },

    createLink: function(link) {
        return d3.select(document.createElement('span'))
                 .attr('class', 'rpd-link')
                 .style('position', 'absolute')
                 .style('transform-origin', 'left top')
                 .style('-webkit-transform-origin', 'left top');
    }

};

});
