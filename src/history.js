Rpd.history = (function() {

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
            update.outlet.connect(update.link.inlet);
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

    function checkStackLimit(stack, limit) {
        if (stack.length > limit) stack.shift();
    }

    function stackInfo(alias, stack) {
        console.log(alias);
        stack.forEach(function(item) {
            console.log(item.type, item);
        })
    }

    var DEFAULT_LIMIT = 50;

    function History() {
        this.limit = DEFAULT_LIMIT;
        this.reset();
        Rpd.events.filter(function(update) {
            return undoMap[update.type];
        }).onValue(function(update) {
            if (this.lockUndoStack) return;
            checkStackLimit(this.undoStack, this.limit);
            this.undoStack.push(update);
        }.bind(this));
    }

    History.prototype.reset = function() {
        this.undoStack = [];
        this.redoStack = [];
        this.lockUndoStack = false;
    }

    History.prototype.undo = function() {
        console.log('UNDO');
        var lastAction = this.undoStack.pop();
        console.log('last action', lastAction.type);
        if (!lastAction) return;
        var reversedAction = undoMap[lastAction.type];
        if (reversedAction) {
            this.lockUndoStack = true;
            reversedAction(lastAction);
            this.lockUndoStack = false;
            checkStackLimit(this.redoStack, this.limit);
            this.redoStack.push(lastAction);
        }
    }

    History.prototype.redo = function() {
        console.log('REDO');
        var lastAction = this.redoStack.pop();
        if (!lastAction) return;
        console.log('last action', lastAction.type);
        var repeatingAction = redoMap[lastAction.type];
        if (repeatingAction) {
            repeatingAction(lastAction);
        }
    }

    History.prototype.changeLimit = function(limit) {
        this.limit = limit;
    }

    History.prototype.getUndoRecordCount = function() {
        return this.undoStack.length;
    }

    History.prototype.getRedoRecordCount = function() {
        return this.redoStack.length;
    }

    return new History();

})();
