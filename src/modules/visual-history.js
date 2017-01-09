;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

var d3 = d3_tiny || d3;

function spanWithText(text) {
    return d3.select(document.createElement('span')).text(text.join('')).node();
}

var renderUpdate = {
    'network/add-patch': function(update) {
        return spanWithText([
            ' + ',
            update.patch.title || '<Unnamed>'
        ]);
    },
    'patch/is-ready': function(update) {
        return spanWithText([
            update.patch.title || '<Unnamed>'
        ]);
    },
    'patch/open': function(update) {
        return spanWithText([
            ' o ',
            update.patch.title || '<Unnamed>'
        ]);
    },
    'patch/close': function(update) {
        return spanWithText([
            ' x ',
            update.patch.title || '<Unnamed>'
        ]);
    },
    'patch/add-node': function(update) {
        return spanWithText([
            update.patch.title || '<Unnamed>',
            ' + ',
            update.node.def.title + ' (' + update.node.type + ')'
        ]);
    },
    // patch/move-canvas,
    // patch/resize-canvas,
    // patch/set-inputs,
    // patch/set-outputs,
    // patch/refer,
    // patch/project,
    'patch/remove-node': function(update) {
        return spanWithText([
            update.patch.title || '<Unnamed>',
            ' - ',
            update.node.def.title + ' (' + update.node.type + ')'
        ]);
    },
    'node/turn-on': function(update) {
        return spanWithText([
            update.node.def.title
        ]);
    },
    'node/is-ready': function(update) {
        return spanWithText([
            update.node.def.title
        ]);
    },
    'node/process': function(update) {
        return spanWithText([
            update.node.def.title,
            ' : ',
            update.inlets ? Object.keys(update.inlets).join(',') : '<Nothing>',
            ' -> ',
            update.outlets ? Object.keys(update.outlets).join(',') : '<Nothing>'
        ]);
    },
    'node/turn-off': function(update) {
        return spanWithText([
            update.node.def.title
        ]);
    },
    'node/add-inlet': function(update) {
        return spanWithText([
            update.node.def.title,
            ' + ',
            update.inlet.alias + ' (' + update.inlet.type + ')'
        ]);
    },
    'node/remove-inlet': function(update) {
        return spanWithText([
            update.node.def.title,
            ' - ',
            update.inlet.alias + ' (' + update.inlet.type + ')'
        ]);
    },
    'node/add-outlet': function(update) {
        return spanWithText([
            update.node.def.title,
            ' + ',
            update.outlet.alias + ' (' + update.outlet.type + ')'
        ]);
    },
    'node/remove-outlet': function(update) {
        return spanWithText([
            update.node.def.title,
            ' - ',
            update.outlet.alias + ' (' + update.outlet.type + ')'
        ]);
    },
    'node/move': function(update) {
        return spanWithText([
            update.node.def.title,
            ' => ',
            update.position
        ]);
    },
    'inlet/update': function(update) {
        return spanWithText([
            '<' + update.value + '>',
            ' -> ',
            update.inlet.alias + ' (' + update.inlet.node.def.title + ')',
        ]);
    },
    'outlet/update': function(update) {
        return spanWithText([
            update.outlet.alias + ' (' + update.outlet.node.def.title + ')',
            ' -> ',
            '<' + update.value + '>'
        ]);
    },
    'outlet/connect': function(update) {
        return spanWithText([
            update.link.outlet.alias + ' (' + update.link.outlet.node.def.title + ')',
            ' => ',
            update.link.inlet.alias + ' (' + update.link.inlet.node.def.title + ')'
        ]);
    },
    'outlet/disconnect': function(update) {
        return spanWithText([
            update.link.outlet.alias + ' (' + update.link.outlet.node.def.title + ')',
            ' x=> ',
            update.link.inlet.alias + ' (' + update.link.inlet.node.def.title + ')'
        ]);
    },
    'link/enable': function(update) {
        return spanWithText([
            update.link.outlet.alias + ' (' + update.link.outlet.node.def.title + ')',
            ' => ',
            update.link.inlet.alias + ' (' + update.link.inlet.node.def.title + ')'
        ]);
    },
    'link/disable': function(update) {
        return spanWithText([
            update.link.outlet.alias + ' (' + update.link.outlet.node.def.title + ')',
            ' x=> ',
            update.link.inlet.alias + ' (' + update.link.inlet.node.def.title + ')'
        ]);
    },
    'link/pass': function(update) {
        return spanWithText([
            update.link.outlet.alias + ' (' + update.link.outlet.node.def.title + ')',
            ' -> ',
            '<' + update.value + '>',
            ' -> ',
            update.link.inlet.alias + ' (' + update.link.inlet.node.def.title + ')'
        ]);
    },
}

var updateTitle = {
    'network/add-patch': 'Add Patch to the Network',
    'patch/is-ready': 'Patch is Ready',
    'patch/open': 'Open Patch',
    'patch/close': 'Close Patch',
    'patch/move-canvas': 'Move Patch Canvas',
    'patch/resize-canvas': 'Resize Patch Canvas',
    'patch/set-inputs': 'Set Patch Inputs',
    'patch/set-outputs': 'Set Patch Outputs',
    // 'patch/project',
    // 'patch/refer',
    'patch/add-node': 'Add Node to Patch',
    'patch/remove-node': 'Remove Node from Patch',
    'node/turn-on': 'Turn Node On',
    'node/is-ready': 'Node is Ready',
    'node/process': 'Node Processes Input',
    'node/turn-off': 'Turn Node Off',
    'node/add-inlet': 'Add Inlet to the Node',
    'node/remove-inlet': 'Remove Inlet from the Node',
    'node/add-outlet': 'Add Outlet to the Node',
    'node/remove-outlet': 'Remove Outlet from the Node',
    'node/move': 'Move Node',
    'inlet/update': 'Inlet Receives',
    'outlet/update': 'Outlet Sends Value',
    'outlet/connect': 'Connect Outlet to Inlet',
    'outlet/disconnect': 'Disconnect Outlet from Inlet',
    'link/enable': 'Enable the Link',
    'link/disable': 'Disable the Link',
    'link/pass': 'Pass Value Thru the Link'
}

var knownEvents = Object.keys(updateTitle);

var filterEvents = {
    'link/pass': true,
    'node/process': true,
    'inlet/update': true,
    'outlet/update': true,
    'node/is-ready': true,
    'node/turn-on': true,
    'node/turn-off': true
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
    //counter.append('span').text('Clear');
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
