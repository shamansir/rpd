Rpd.history = (function() {

    var limit = 50;

    function History() {
        this.reset();
    }

    History.prototype.reset = function() {
        this.stack = [];
    }

    History.prototype.undo = function() {

    }

    History.prototype.redo = function() {

    }

    History.prototype.getRecordCount = function() {
        return this.stack.length;
    }

    return new History();

})();
