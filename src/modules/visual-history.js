;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

var d3 = d3_tiny || d3;

var renderUpdate = {

}

var UPDATES_LIMIT = 500;

Rpd.visualHistory = function(target, type) {
    var ul = d3.select(target).classed('visual-history', true)
               .append('ul');
    var li, div, updateType;
    var updatesCount = 0;
    var updatesInList = 0;
    Rpd.events.onValue(function(update) {
        updateType = update.type;
        if (updatesInList > UPDATES_LIMIT) {
            ul.selectAll('*').remove();
            updatesInList = 0;
        }
        li = ul.append('li').attr('id', 'update-' + updatesCount);
        li.append('span').classed('update-type', true).text(updateType);
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
