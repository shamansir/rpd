Rpd.history = (function() {

    var limit = 3;

    var undoRedoMap = {
        'network/add-patch': function(update, stack) {
            return { type: 'network/remove-patch',
                     patch: update.patch };
        }
    };

    function checkStackLimit(stack) {
        if (stack.length > limit) stack.shift();
    }

    function History() {
        this.reset();
        Rpd.events.filter(function(update) {
            return undoRedoMap[update.type];
        }).onValue(function(update) {
            checkStackLimit(this.undoStack);
            this.undoStack.push(update);
        }.bind(this));
    }

    History.prototype.reset = function() {
        this.undoStack = [];
        this.redoStack = [];
        this.position = 0;
    }

    History.prototype.undo = function() {
        var lastAction = this.undoStack.pop();
        if (!lastAction) return;
        var reversedAction = undoRedoMap[lastAction.type](lastAction, this.undoStack);
        Rpd.events[reversedAction.type].emit(reversedAction);
        checkStackLimit(this.redoStack);
        this.redoStack.push(lastAction);
    }

    History.prototype.redo = function() {
        var lastAction = this.redoStack.pop();
        Rpd.events[lastAction.type].emit(lastAction);
    }

    History.prototype.getUndoRecordCount = function() {
        return this.undoStack.length;
    }

    History.prototype.getRedoRecordCount = function() {
        return this.redoStack.length;
    }

    return new History();

})();
