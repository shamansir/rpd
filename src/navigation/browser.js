Rpd.navigation = (function() {

    var SEPARATOR = ':';

    function Navigation() {
        this.onNewPatch = function(patch) {
            if (!this.firstAddedPatch) this.firstAddedPatch = patch;
            this.idToPatch[patch.id] = patch;
            this.idToOpenness[patch.id] = false;
        }.bind(this);

        this.onOpenedPatch = function(patch) {
            if (this.handlingPathLock) return;
            if (this.openedPatches.indexOf(patch.id) < 0) {
                this.openedPatches.push(patch.id);
            }
            this.idToOpenness[patch.id] = true;
            this.changePath(this.openedPatches.join(SEPARATOR));
        }.bind(this);

        this.onClosedPatch = function(patch) {
            if (this.handlingPathLock) return;
            var pos = this.openedPatches.indexOf(patch.id);
            if (pos >= 0) this.openedPatches.splice(pos, 1);
            this.idToOpenness[patch.id] = false;
            this.changePath(this.openedPatches.join(SEPARATOR));
        }.bind(this);
    }

    Navigation.prototype.reset = function() {
        this.lastPath = '';

        this.idToPatch = {};
        this.idToOpenness = {};

        this.firstAddedPatch = undefined;
        this.handlingPathLock = false;

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
        this.lastPath = path;
        //window.location.hash = path;
    }

    Navigation.prototype.handlePath = function(path) {
        this.handlingPathLock = true;
        if (!path && this.firstAddedPatch) {
            path = this.firstAddedPatch.id;
            this.changePath(path);
        }
        var idList = path.split(SEPARATOR);
        var lenBefore = idList.length;
        idList = idList.filter(function(patchId) {
            return patchId && this.idToPatch[patchId];
        }.bind(this));
        //var newPath = idList.join(SEPARATOR);
        var openedPatchId;
        this.openedPatches.forEach(function(patchId) {
            if ((idList.indexOf(patchId) < 0) && this.idToOpenness[patchId]) {
                this.idToPatch[patchId].close();
                this.idToOpenness[patchId] = false;
            }
        }.bind(this));
        idList.forEach(function(patchId) {
            if (!this.idToOpenness[patchId]) {
                this.idToPatch[patchId].open();
                this.idToOpenness[patchId] = true;
            }
        }.bind(this));
        this.openedPatches = idList;
        if (lenBefore !== idList.length) {
            this.changePath(idList.join(SEPARATOR));
        }
        this.handlingPathLock = false;
    }

    return new Navigation();

})();
