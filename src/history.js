Rpd.history = (function() {

    var limit = 3;

    var undoMap = {
        'patch/add-node': function(update) {
            update.patch.removeNode(update.node);
        }
    };

    var redoMap = {
        'patch/add-node': function(update) {
            update.patch.addNode(update.node.type, update.node.def.title, update.node.def);
        }
    };

    function checkStackLimit(stack) {
        if (stack.length > limit) stack.shift();
    }

    function History() {
        this.reset();
        Rpd.events.filter(function(update) {
            return undoMap[update.type] || redoMap[update.type];
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
        var reversedAction = undoMap[lastAction.type];
        if (reversedAction) {
            reversedAction(lastAction);
            checkStackLimit(this.redoStack);
            this.redoStack.push(lastAction);
        }
    }

    History.prototype.redo = function() {
        var lastAction = this.redoStack.pop();
        var repeatingAction = redoMap[lastAction.type];
        if (repeatingAction) {
            repeatingAction(lastAction);
        }
    }

    History.prototype.getUndoRecordCount = function() {
        return this.undoStack.length;
    }

    History.prototype.getRedoRecordCount = function() {
        return this.redoStack.length;
    }

    return new History();

})();
