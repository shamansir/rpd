Rpd.history = (function() {

    var limit = 50;

    var undoRedoMap = {
        'network/add-patch': function(update, stack) {
            return { type: 'network/remove-patch',
                     patch: update.patch };
        }
    };

    function History() {
        this.reset();
        Rpd.events.filter(function(update) {
            return undoRedoMap[update.type];
        }).onValue(function(update) {
            if (this.stack.length > limit) {
                this.stack.shift();
            }
            this.stack.push(update);
        }.bind(this));
    }

    History.prototype.reset = function() {
        this.stack = [];
        this.position = 0;
    }

    History.prototype.undo = function() {
        if (this.position === 0) return;
        var lastAction = this.stack.pop();
        var reversedAction = undoRedoMap[lastAction.type](lastAction, this.stack);
        Rpd.events[reversedAction.type].emit(reversedAction);
    }

    History.prototype.redo = function() {
        if (this.position === 0) return;
        var lastAction = this.stack.pop();
        Rpd.events[lastAction.type].emit(lastAction);
    }

    History.prototype.getRecordCount = function() {
        return this.stack.length;
    }

    return new History();

})();
