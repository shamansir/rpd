Rpd.navigation = (function() {

    var SEPARATOR = ':';

    function Navigation() {
        this.onNewPatch = function(patch) {
            if (!this.firstAddedPatch) this.firstAddedPatch = patch;
            this.idToPatch[patch.id] = patch;
            this.idToOpeness[patch.id] = false;
        }.bind(this);

        this.onOpenedPatch = function(patch) {
            if (this.lockOpenedPatches) return;
            if (this.openedPatches.indexOf(patch.id) < 0) {
                this.openedPatches.push(patch.id);
            }
            this.idToOpeness[patch.id] = true;
        }.bind(this);

        this.onClosedPatch = function(patch) {
            if (this.lockOpenedPatches) return;
            var pos = this.openedPatches.indexOf(patch.id);
            if (pos >= 0) this.openedPatches.splice(pos, 1);
            this.idToOpeness[patch.id] = false;
        }.bind(this);
    }

    Navigation.prototype.reset = function() {
        this.idToPatch = {};
        this.idToOpeness = {};

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
        var idList = path.split(SEPARATOR);
        var openedPatchId;
        for (var i = 0; i < idList.length; i++) {
            for (var j = 0; j < this.openedPatches.length; j++) {
                var openedPatchId = this.openedPatches[j];
                if ((openedPatchId !== idList[i]) &&
                    this.idToOpeness[openedPatchId]) {
                    this.idToPatch[openedPatchId].close();
                    this.idToOpeness[openedPatchId] = false;
                }
            }
        }
        for (var i = 0; i < idList.length; i++) {
            if (!this.idToOpeness[idList[i]]) {
                this.idToPatch[idList[i]].open();
                this.idToOpeness[idList[i]] = true;
            }
        }
        this.openedPatches = idList;
        this.lockOpenedPatches = false;
    }

    return new Navigation();

})();
