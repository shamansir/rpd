var nodes = {};

var default_margin = 30;
var node_rects = [];

var HtmlRenderer = {

    'node/add': function(root, update) {

        var node = update.node;

        var nodeElm = quickElm('div', 'rpd-node');
        nodes[node.id] = { elm: nodeElm, inlets: {}, outlets: {}, inletsNum: 0, outletsNum: 0 };

        nodeElm.appendChild(quickElmVal('span', 'rpd-name', node.name));
        nodeElm.appendChild(quickElmVal('span', 'rpd-type', node.type));

        //var next_rect = findNextNodeRect(node);
        //nodeElm.style.left = next_rect[0] + 'px';
        //nodeElm.style.top = next_rect[1] + 'px';
        //nodeElm.style.width = next_rect[2] + 'px';
        //nodeElm.style.height = next_rect[3] + 'px';

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

        nodeData.inletsNum++;

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

        nodeData.outletsNum++;

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

    'outlet/connect': function(root, update) {

        var outlet = update.outlet;
        var inlet  = update.inlet;

        var inletElm  = nodes[inlet.node.id].inlets[inlet.id];
        var outletElm = nodes[outlet.node.id].outlets[outlet.id];

    },
    'link/adapt': function(root, update) {},
    'link/error': function(root, update) {}
};


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

function createArrow(x, y, degree) {
    var root = document.createElement('div');
    root.className = 'rpd-arrow';
    root.style.top = x ? (x + 'px') : '0';
    root.style.left = y ? (y + 'px') : '0';
    root.style.transform = 'rotateZ(' + deg + 'deg)';
    var wrapper = document.createElement('div');
    wrapper.appendChild(document.createElement('div'));
    wrapper.appendChild(document.createElement('div'));
    root.appendChild(wrapper);
    return root;
}

function rotateArrow(root, degree) {
    root.style.transform = 'rotateZ(' + deg + 'deg)';
}


renderer('html', function(root, update) {

    //console.log(root, update);
    HtmlRenderer[update.type](root, update);

});
