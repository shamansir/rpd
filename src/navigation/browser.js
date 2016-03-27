Rpd.navigation = (function() {

    var firstAddedPatch;
    var idToPatch = {};

    function onNewPatch(patch) {
        if (!firstAddedPatch) firstAddedPatch = patch;
        idToPatch[patch.id] = patch;
    }

    function Navigation() {
    }

    Navigation.prototype.enable = function() {
        Rpd.event['network/add-patch'].onValue(onNewPatch);
    }

    Navigation.prototype.disable = function() {
        Rpd.event['network/add-patch'].offValue(onNewPatch);
        firstAddedPatch = undefined;
    }

    Navigation.prototype.changePath = function(id) {
        console.log('changePath was called with ' + id);
        if (id) idToPatch[id].open();
    }

    Navigation.prototype.handlePath = function(path) {
        if (!path && firstAddedPatch) this.changePath(firstAddedPatch.id);
    }

    console.log('created changePath and returned it');

    return new Navigation();

})();
