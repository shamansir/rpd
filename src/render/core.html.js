var nodes = {};

var CoreHtmlRenderer = {
    'node/add': function(root, update) {

    },
    'node/remove': function(root, update) {},
    'inlet/add': function(root, update) {},
    'inlet/remove': function(root, update) {},
    'inlet/update': function(root, update) {},
    'outlet/add': function(root, update) {},
    'outlet/remove': function(root, update) {},
    'outlet/update': function(root, update) {},
    'outlet/connect': function(root, update) {},
    'link/adapt': function(root, update) {},
    'link/error': function(root, update) {}
};

renderer('html', function(root, update) {

    console.log(root, update);
    CoreHtmlRenderer[update.type](root, update);

});
