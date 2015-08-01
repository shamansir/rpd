Rpd.import.json = function() {

}

Rpd.export.json = function() {
    /* var json = {
        patches: {}
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
    });  */

    var json = { commands: {} };
    var commands = json.commands;

    Rpd.events.filter(function(update) {
                   return update.type === 'inlet/update' ||
                          update.type === 'outlet/update';
               })
              .onValue(function(update) {
                  if (spec[update.type]) commands.push(spec[update.type](update));
              });

    return json;
}
