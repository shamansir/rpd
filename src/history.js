Rpd.history = (function() {

    var limit = 3;

    var undoMap = {
        'patch/add-node': function(update) {
            update.patch.removeNode(update.node);
        },
        'patch/remove-node': function(update) {
            update.patch.addNode(update.node.type, update.node.def.title, update.node.def);
        },
        'patch/open': function(update) {
            update.patch.close();
        },
        'patch/close': function(update) {
            update.patch.open(update.parent);
        },
        'node/add-inlet': function(update) {
            update.node.removeInlet(update.inlet);
        },
        'node/add-outlet': function(update) {
            update.node.removeOutlet(update.outlet);
        },
        'node/remove-inlet': function(update) {
            update.node.addInlet(update.inlet.type, update.inlet.alias, update.inlet.def);
        },
        'node/remove-outlet': function(update) {
            update.node.addOutlet(update.outlet.type, update.outlet.alias, update.outlet.def);
        },
        'outlet/connect': function(update) {
            update.outlet.disconnect(update.link);
        },
        'outlet/disconnect': function(update) {
            update.outlet.connect(update.inlet);
        },
        'link/enable': function(update) {
            update.link.disable();
        },
        'link/disable': function(update) {
            update.link.enable();
        }
    };

    var redoMap = {
        'patch/add-node': function(update) {
            update.patch.addNode(update.node.type, update.node.def.title, update.node.def);
        },
        'patch/remove-node': function(update) {
            update.patch.removeNode(update.node);
        },
        'patch/open': function(update) {
            update.patch.open(update.parent);
        },
        'patch/close': function(update) {
            update.patch.close();
        },
        'node/add-inlet': function(update) {
            update.node.addInlet(update.inlet.type, update.inlet.alias, update.inlet.def);
        },
        'node/add-outlet': function(update) {
            update.node.addOutlet(update.outlet.type, update.outlet.alias, update.outlet.def);
        },
        'node/remove-inlet': function(update) {
            update.node.removeInlet(update.inlet);
        },
        'node/remove-outlet': function(update) {
            update.node.removeOutlet(update.outlet);
        },
        'outlet/connect': function(update) {
            update.outlet.connect(update.inlet);
        },
        'outlet/disconnect': function(update) {
            update.outlet.disconnect(update.link);
        },
        'link/enable': function(update) {
            update.link.enable();
        },
        'link/disable': function(update) {
            update.link.disable();
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
        if (!lastAction) return;
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
