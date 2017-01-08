;(function(global) {
  "use strict";

var Rpd = global.Rpd;
if (typeof Rpd === "undefined" && typeof require !== "undefined") {
    Rpd = require('rpd');
}

Rpd.visualHistory = function(target, type) {
    Rpd.events.onValue(function(v) {
        console.log(v);
    });
}

})(this);
