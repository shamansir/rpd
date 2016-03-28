Rpd.navigation = (function() {

    var SEPARATOR = ':';

    function Navigation() {
        this.onNewPatch = function(patch) {
            if (!this.firstAddedPatch) this.firstAddedPatch = patch;
            this.idToPatch[patch.id] = patch;
        }.bind(this);

        this.onOpenedPatch = function(patch) {
            if (this.lockOpenedPatches) return;
            if (this.openedPatches.indexOf(patch.id) < 0) {
                this.openedPatches.push(patch.id);
            }
        }.bind(this);

        this.onClosedPatch = function(patch) {
            if (this.lockOpenedPatches) return;
            var pos = this.openedPatches.indexOf(patch.id);
            if (pos >= 0) this.openedPatches.splice(pos, 1);
        }.bind(this);
    }

    Navigation.prototype.reset = function() {
        this.idToPatch = {};

        this.firstAddedPatch = undefined;
        this.lockOpenedPatches = false;

        this.openedPatches = [];
    }

    Navigation.prototype.enable = function() {
        this.reset();
        Rpd.event['network/add-patch'].onValue(this.onNewPatch);
        this.openedPatchesStream = Rpd.events.filter(function(event) { return event.type === 'patch/open'; })
                                             .map(function(event) { return event.patch; });
        this.openedPatchesStream.onValue(this.onOpenedPatch);
        this.closedPatchesStream = Rpd.events.filter(function(event) { return event.type === 'patch/close'; })
                                             .map(function(event) { return event.patch; });
        this.closedPatchesStream.onValue(this.onClosedPatch);
    }

    Navigation.prototype.disable = function() {
        Rpd.event['network/add-patch'].offValue(this.onNewPatch);
        this.openedPatchesStream.offValue(this.onOpenedPatch);
        this.closedPatchesStream.offValue(this.onClosedPatch);
    }

    Navigation.prototype.changePath = function(path) {
        //window.location.hash = path;
    }

    Navigation.prototype.handlePath = function(path) {
        if (!path && this.firstAddedPatch) {
            path = this.firstAddedPatch.id;
            this.changePath(path);
        }
        this.lockOpenedPatches = true;
        var id = path;
        for (var i = 0; i < this.openedPatches.length; i++) {
            if (this.openedPatches[i] !== id) {
                this.idToPatch[this.openedPatches[i]].close();
            }
        }
        this.openedPatches = [ id ];
        this.lockOpenedPatches = false;
        this.idToPatch[id].open();
        // FIXME: move here lockOpenedPatches = false;
    }

    return new Navigation();

})();
