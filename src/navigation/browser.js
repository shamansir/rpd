Rpd.navigation = (function() {

    var firstAddedPatch;
    var idToPatch = {};

    Rpd.event['network/add-patch'].onValue(function(patch) {
        if (!firstAddedPatch) firstAddedPatch = patch;
        idToPatch[patch.id] = patch;
    });

    function enable() {

    }

    function disable() {

    }

    function changePath(id) {
        if (id) idToPatch[id].open();
    }

    function handlePath(path) {
        if (!path && firstAddedPatch) changePath(firstAddedPatch.id);
    }

    return {
        enable: enable,
        disable: disable,
        changePath: changePath,
        handlePath: handlePath
    }

})();
