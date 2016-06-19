;(function(global) {

    function prettify(Rpd) {
        if (Rpd.PRETTIFIED) return;

        Rpd._.Patch.prototype.jasmineToString = function() {
            return Rpd.stringify.patch(this);
        }

        Rpd._.Node.prototype.jasmineToString = function() {
            return Rpd.stringify.node(this);
        }

        Rpd._.Inlet.prototype.jasmineToString = function() {
            return Rpd.stringify.inlet(this);
        }

        Rpd._.Outlet.prototype.jasmineToString = function() {
            return Rpd.stringify.outlet(this);
        }

        Rpd._.Link.prototype.jasmineToString = function() {
            return Rpd.stringify._link(this);
        }

        Rpd.PRETTIFIED = true;
    }

    if (typeof define === 'function' && define.amd) {
        define([], function() { return prettify; });
        global.prettify = prettify;
    } else if (typeof module === "object" && typeof exports === "object") {
        module.exports = prettify;
    } else {
        global.prettify = prettify;
    }

})(this);
