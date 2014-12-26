var nodes = {};

var CoreHtmlRenderer = {

    'node/add': function(root, update) {

        var node = update.node;

        var nodeElm = document.createElement('div');
        nodes[node.id] = { elm: nodeElm, inlets: {}, outlets: {} };
        nodeElm.className = 'rpd-node';

        var nameElm = document.createElement('span');
        nameElm.className = 'rpd-name';
        nameElm.innerText = node.name;
        nodeElm.appendChild(nameElm);

        var typeElm = document.createElement('span');
        typeElm.className = 'rpd-type';
        typeElm.innerText = node.type;
        nodeElm.appendChild(typeElm);

        root.appendChild(nodeElm);

    },

    'node/remove': function(root, update) {},

    'inlet/add': function(root, update) {

        var inlet = update.inlet;

        var nodeData = nodes[inlet.node.id];
        var nodeElm = nodeData.elm;

        var inletElm = document.createElement('div');
        var valueElm = document.createElement('span');
        nodeData.inlets[inlet.id] = { elm: inletElm, valueElm: valueElm };
        inletElm.className = 'rpd-inlet';
        valueElm.className = 'rpd-value';
        inletElm.appendChild(valueElm);

        var nameElm = document.createElement('span');
        nameElm.className = 'rpd-name';
        nameElm.innerText = inlet.name;
        inletElm.appendChild(nameElm);

        var typeElm = document.createElement('span');
        typeElm.className = 'rpd-type';
        typeElm.innerText = inlet.type;
        inletElm.appendChild(typeElm);

        nodeElm.appendChild(inletElm);

    },

    'inlet/remove': function(root, update) {},

    'inlet/update': function(root, update) {

        var inlet = update.inlet;

        var nodeData = nodes[inlet.node.id];
        var inletData = nodeData.inlets[inlet.id];

        var valueElm = inletData.valueElm;
        if (valueElm.classList) valueElm.classList.add("rpd-update");
        // TODO: remove by timeout
        valueElm.innerText = update.value;

    },

    'outlet/add': function(root, update) {

        var outlet = update.outlet;

        var nodeData = nodes[outlet.node.id];
        var nodeElm = nodeData.elm;

        var outletElm = document.createElement('div');
        var valueElm = document.createElement('span');
        nodeData.outlets[outlet.id] = { elm: outletElm, valueElm: valueElm };
        outletElm.className = 'rpd-inlet';
        valueElm.className = 'rpd-value';
        outletElm.appendChild(valueElm);

        var nameElm = document.createElement('span');
        nameElm.className = 'rpd-name';
        nameElm.innerText = outlet.name;
        outletElm.appendChild(nameElm);

        var typeElm = document.createElement('span');
        typeElm.className = 'rpd-type';
        typeElm.innerText = outlet.type;
        outletElm.appendChild(typeElm);

        nodeElm.appendChild(outletElm);

    },

    'outlet/remove': function(root, update) {},

    'outlet/update': function(root, update) {

        var outlet = update.outlet;

        var nodeData = nodes[outlet.node.id];
        var outletData = nodeData.outlets[outlet.id];

        var valueElm = outletData.valueElm;
        valueElm.innerText = update.value;

    },

    'outlet/connect': function(root, update) {},
    'link/adapt': function(root, update) {},
    'link/error': function(root, update) {}
};

renderer('html', function(root, update) {

    console.log(root, update);
    CoreHtmlRenderer[update.type](root, update);

});
