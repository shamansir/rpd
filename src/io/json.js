Rpd.import.json = function() {

}

Rpd.export.json = function() {
    var json = {
        nodes: {}
    };

    var spec = {
        'patch/add-node': function(update) {
            var node = update.node;
            json.nodes[node.id] = {
                type: node.type,
                name: node.name
            }
        }
    };

    Rpd.events.onValue(function(update) {
        if (spec[update.type]) spec[update.type](update);
    });

    return json;
}
