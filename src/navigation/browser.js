Rpd.navigation = (function() {

    var SEPARATOR = ':';

    var firstAddedPatch;
    var idToPatch;

    var openedPatches;

    var lockOpenedPatches;

    var openedPatchesStream,
        closedPatchesStream;

    function onNewPatch(patch) {
        if (!firstAddedPatch) firstAddedPatch = patch;
        idToPatch[patch.id] = patch;
    }

    function onOpenedPatch(patch) {
        if (openedPatches.indexOf(patch.id) < 0) {
            openedPatches.push(patch.id);
        }
    }

    function onClosedPatch(patch) {
        if (lockOpenedPatches) return;
        var pos = openedPatches.indexOf(patch.id);
        if (pos >= 0) openedPatches.splice(pos, 1);
    }

    function Navigation() {
    }

    Navigation.prototype.enable = function() {
        Rpd.event['network/add-patch'].onValue(onNewPatch);
        openedPatchesStream = Rpd.events.filter(function(event) { return event.type === 'patch/open'; })
                                        .map(function(event) { return event.patch; });
        openedPatchesStream.onValue(onOpenedPatch);
        closedPatchesStream = Rpd.events.filter(function(event) { return event.type === 'patch/close'; })
                                        .map(function(event) { return event.patch; });
        closedPatchesStream.onValue(onClosedPatch);

        idToPatch = {};

        firstAddedPatch = undefined;
        lockOpenedPatches = false;

        opened = [];
        closed = [];
        openedPatches = [];
    }

    Navigation.prototype.disable = function() {
        Rpd.event['network/add-patch'].offValue(onNewPatch);
        openedPatchesStream.offValue(onOpenedPatch);
        closedPatchesStream.offValue(onClosedPatch);
    }

    Navigation.prototype.changePath = function(path) {
        //window.location.hash = path;
    }

    Navigation.prototype.handlePath = function(path) {
        if (!path && firstAddedPatch) {
            path = firstAddedPatch.id;
            this.changePath(path);
        }
        lockOpenedPatches = true;
        var id = path;
        for (var i = 0; i < openedPatches.length; i++) {
            if (openedPatches[i] !== id) {
                idToPatch[openedPatches[i]].close();
            }
        }
        openedPatches = [ id ];
        lockOpenedPatches = false;
        idToPatch[id].open();
    }

    return new Navigation();

})();
