;(function(global) {

    function prettify(Rpd) {
        if (Rpd.PRETTIFIED) return;

        Rpd._.Patch.prototype.jasmineToString = function() {
            return '[ Patch' + (this.name ? ' ' + this.name : '') + ' ]';
        }

        Rpd._.Node.prototype.jasmineToString = function() {
            return '[ Node (' + this.type + ')' +
                      ' \'' + this.name + '\'' +
                      ' #' + this.id +
                      ' ]';
        }

        Rpd._.Inlet.prototype.jasmineToString = function() {
            return '[ Inlet (' + this.type + ')' +
                      ' \'' + (this.alias || this.name) + '\'' +
                      ' #' + this.id +
                      (this.hidden ? ' (hidden)' : '') +
                      (this.cold ? ' (cold)' : '') +
                      ' ]';
        }

        Rpd._.Outlet.prototype.jasmineToString = function() {
            return '[ Outlet (' + this.type + ')' +
                      ' \'' + (this.alias || this.name) + '\'' +
                      ' #' + this.id +
                      ' ]';
        }

        Rpd._.Link.prototype.jasmineToString = function() {
            return '[ Link (' + this.type + ')' +
                      ' \'' + this.name + '\'' +
                      ' #' + this.id +
                      ' ' + this.inlet.jasmineToString() + ' ->'
                      ' ' + this.outlet.jasmineToString() +
                      ' ]';
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
