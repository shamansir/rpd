;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

var d3 = d3_tiny || d3;

var renderUpdate = {
    'inlet/update': function(update) {
        return d3.select(document.createElement('span')).text([
            '<' + update.value + '>',
            ' -> ',
            update.inlet.alias + ' (' + update.inlet.node.def.title + ')',
        ].join('')).node();
    },
    'outlet/update': function(update) {
        return d3.select(document.createElement('span')).text([
            update.outlet.alias + ' (' + update.outlet.node.def.title + ')',
            ' -> ',
            '<' + update.value + '>'
        ].join('')).node();
    },
    'link/pass': function(update) {
        return d3.select(document.createElement('span')).text([
            update.link.outlet.alias + ' (' + update.link.outlet.node.def.title + ')',
            ' -> ',
            '<' + update.value + '>',
            ' -> ',
            update.link.inlet.alias + ' (' + update.link.inlet.node.def.title + ')'
        ].join('')).node();
    },
    'node/process': function(update) {
        return d3.select(document.createElement('span')).text([
            update.node.def.title,
            ' : ',
            update.inlets ? Object.keys(update.inlets).join(',') : '<Nothing>',
            ' -> ',
            update.outlets ? Object.keys(update.outlets).join(',') : '<Nothing>'
        ].join('')).node();
    }
}

var updateTitle = {
    'link/pass': 'Pass Value Thru the Link',
    'inlet/update': 'Inlet Receives',
    'outlet/update': 'Outlet Sends Value',
    'node/process': 'Node Processes Input'
}

var knownEvents = [
    'link/pass',
    'node/process',
    'inlet/update',
    'outlet/update'
];

var filterEvents = {
    'link/pass': true,
    'node/process': true,
    'inlet/update': true,
    'outlet/update': true
};

var UPDATES_LIMIT = 500;

Rpd.visualHistory = function(target, type) {
    var root = d3.select(target).classed('visual-history', true);
    var filter = root.append('ul').classed('filter', true);
    var item, checkbox;
    knownEvents.forEach(function(eventName) {
        item = filter.append('li').classed('item', true);
        item.append('span').text(eventName);
        checkbox = item.append('input').attr('type', 'checkbox');
        if (filterEvents[eventName]) checkbox.attr('checked', true);
        checkbox.on('click', function() {
            filterEvents[eventName] = !filterEvents[eventName];
        });
    });
    var counter = root.append('div').classed('counter', true);
    counter.text('0/0 Updates');
    var ul = root.append('ul').classed('list', true);
    var li, div, updateType;
    var updatesCount = 0;
    var updatesInList = 0;
    Rpd.events.onValue(function(update) {
        updateType = update.type;
        if (filterEvents[updateType]) return;
        if (updatesInList > UPDATES_LIMIT) {
            ul.selectAll('*').remove();
            updatesInList = 0;
        }
        counter.text(updatesInList + '/' + updatesCount + ' Updates');
        li = ul.append('li').attr('id', 'update-' + updatesCount);
        li.append('span').classed('update-type', true).text((updateTitle[updateType] || updateType) + ':');
        div = li.append('div').classed('update-details', true);
        if (renderUpdate[updateType]) {
            div.append(renderUpdate[updateType](update));
        } else {
            div.append('span').text('<Unknown>');
        }
        updatesCount++; updatesInList++;
    });
}

})(this);
