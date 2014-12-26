var nodes = {};

var CoreHtmlRenderer = {

    'node/add': function(root, update) {

        var node = update.node;

        var nodeElm = quickElm('div', 'rpd-node');
        nodes[node.id] = { elm: nodeElm, inlets: {}, outlets: {} };

        nodeElm.appendChild(quickElmVal('span', 'rpd-name', node.name));
        nodeElm.appendChild(quickElmVal('span', 'rpd-type', node.type));

        root.appendChild(nodeElm);

    },

    'node/remove': function(root, update) {},

    'inlet/add': function(root, update) {

        var inlet = update.inlet;

        var nodeData = nodes[inlet.node.id];
        var nodeElm = nodeData.elm;

        var inletElm = quickElm('div', 'rpd-inlet');
        var valueElm = quickElm('span', 'rpd-value rpd-stale');
        inletElm.appendChild(valueElm);

        nodeData.inlets[inlet.id] = { elm: inletElm, valueElm: valueElm };

        inletElm.appendChild(quickElmVal('span', 'rpd-name', inlet.name));
        inletElm.appendChild(quickElmVal('span', 'rpd-type', inlet.type));

        nodeElm.appendChild(inletElm);

    },

    'inlet/remove': function(root, update) {},

    'inlet/update': function(root, update) {

        var inlet = update.inlet;

        var nodeData = nodes[inlet.node.id];
        var inletData = nodeData.inlets[inlet.id];

        var valueElm = inletData.valueElm;
        valueElm.innerText = update.value;
        valueUpdateEffect(inletData, valueElm);

    },

    'outlet/add': function(root, update) {

        var outlet = update.outlet;

        var nodeData = nodes[outlet.node.id];
        var nodeElm = nodeData.elm;

        var outletElm = quickElm('div', 'rpd-outlet');
        var valueElm = quickElm('span', 'rpd-value rpd-stale');
        outletElm.appendChild(valueElm);

        nodeData.outlets[outlet.id] = { elm: outletElm, valueElm: valueElm };

        outletElm.appendChild(quickElmVal('span', 'rpd-name', outlet.name));
        outletElm.appendChild(quickElmVal('span', 'rpd-type', outlet.type));

        nodeElm.appendChild(outletElm);

    },

    'outlet/remove': function(root, update) {},

    'outlet/update': function(root, update) {

        var outlet = update.outlet;

        var nodeData = nodes[outlet.node.id];
        var outletData = nodeData.outlets[outlet.id];

        var valueElm = outletData.valueElm;
        valueElm.innerText = update.value;
        valueUpdateEffect(outletData, valueElm);

    },

    'outlet/connect': function(root, update) {},
    'link/adapt': function(root, update) {},
    'link/error': function(root, update) {}
};

renderer('html', function(root, update) {

    console.log(root, update);
    CoreHtmlRenderer[update.type](root, update);

});


function quickElm(type, cls) {
    var elm = document.createElement(type);
    elm.className = cls;
    return elm;
}

function quickElmVal(type, cls, value) {
    var elm = document.createElement(type);
    elm.className = cls;
    elm.innerText = value;
    return elm;
}

function valueUpdateEffect(storage, valueElm) {
    if (valueElm.classList) {
        valueElm.classList.remove("rpd-stale");
        valueElm.classList.add("rpd-fresh");
        if (storage.removeTimeout) clearTimeout(storage.removeTimeout);
        storage.removeTimeout = setTimeout(function() {
            valueElm.classList.remove("rpd-fresh");
            valueElm.classList.add("rpd-stale");
            storage.removeTimeout = null;
        }, 1000);
    }
}
