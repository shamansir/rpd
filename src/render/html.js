var nodes = {};

var links = {};

// ========= HtmlRenderer =========

var HtmlRenderer = {

    'model/new': function(root, update) {

        if (root.classList) root.classList.add('rpd-model');

    },

    'node/add': function(root, update) {

        var node = update.node;

        var nodeBox = quickElm('div', 'rpd-node-box');
        var nodeElm = quickElm('div', 'rpd-node');
        var bodyElm = quickElm('div', 'rpd-body');
        nodes[node.id] = { box: nodeBox, elm: nodeElm, body: bodyElm,
                           inlets: {}, outlets: {},
                           inletsNum: 0, outletsNum: 0 };

        var titleElm = quickElm('div', 'rpd-title');
        titleElm.appendChild(quickElmVal('span', 'rpd-name', node.name));
        titleElm.appendChild(quickElmVal('span', 'rpd-type', node.type));
        nodeElm.appendChild(titleElm);
        nodeElm.appendChild(bodyElm);

        if (nodeElm.classList) nodeElm.classList.add('rpd-'+node.type.replace('/','-'));

        applyNextNodeRect(node, nodeBox);

        nodeBox.appendChild(nodeElm);

        root.appendChild(nodeBox);

    },

    'node/remove': function(root, update) {},

    'inlet/add': function(root, update) {

        var inlet = update.inlet;

        var nodeData = nodes[inlet.node.id];
        var nodeBodyElm = nodeData.body;

        var inletElm = quickElm('div', 'rpd-inlet');
        var valueElm = quickElm('span', 'rpd-value rpd-stale');
        inletElm.appendChild(valueElm);

        nodeData.inlets[inlet.id] = { elm: inletElm, valueElm: valueElm };

        inletElm.appendChild(quickElmVal('span', 'rpd-name', inlet.name));
        inletElm.appendChild(quickElmVal('span', 'rpd-type', inlet.type));

        if (inletElm.classList) inletElm.classList.add('rpd-'+inlet.type.replace('/','-'));

        nodeBodyElm.appendChild(inletElm);

        nodeData.inletsNum++;

    },

    'inlet/remove': function(root, update) {},

    'inlet/update': function(root, update) {

        var inlet = update.inlet;

        var nodeData = nodes[inlet.node.id];
        var inletData = nodeData.inlets[inlet.id];

        var valueElm = inletData.valueElm;
        valueElm.innerText = valueElm.textContent = update.value;
        valueUpdateEffect(inletData, valueElm);

    },

    'outlet/add': function(root, update) {

        var outlet = update.outlet;

        var nodeData = nodes[outlet.node.id];
        var nodeBodyElm = nodeData.body;

        var outletElm = quickElm('div', 'rpd-outlet');
        var valueElm = quickElm('span', 'rpd-value rpd-stale');
        outletElm.appendChild(valueElm);

        nodeData.outlets[outlet.id] = { elm: outletElm, valueElm: valueElm };

        outletElm.appendChild(quickElmVal('span', 'rpd-name', outlet.name));
        outletElm.appendChild(quickElmVal('span', 'rpd-type', outlet.type));

        if (outletElm.classList) outletElm.classList.add('rpd-'+outlet.type.replace('/','-'));

        nodeBodyElm.appendChild(outletElm);

        nodeData.outletsNum++;

    },

    'outlet/remove': function(root, update) {},

    'outlet/update': function(root, update) {

        var outlet = update.outlet;

        var nodeData = nodes[outlet.node.id];
        var outletData = nodeData.outlets[outlet.id];

        var valueElm = outletData.valueElm;
        valueElm.innerText = valueElm.textContent = update.value;
        valueUpdateEffect(outletData, valueElm);

    },

    'outlet/connect': function(root, update) {

        var link = update.link;
        var outlet = link.outlet;
        var inlet  = link.inlet;

        var outletElm = nodes[outlet.node.id].outlets[outlet.id].elm;
        var inletElm  = nodes[inlet.node.id].inlets[inlet.id].elm;

        var linkElm = createLink(outletElm, inletElm);

        links[link.id] = { elm: linkElm };

        root.appendChild(linkElm);

    },
    'link/adapt': function(root, update) {},
    'link/error': function(root, update) {}
};

// ========= utils =========

function quickElm(type, cls) {
    var elm = document.createElement(type);
    elm.className = cls;
    return elm;
}

function quickElmVal(type, cls, value) {
    var elm = document.createElement(type);
    elm.className = cls;
    elm.innerText = elm.textContent = value;
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

function createLink(outletElm, inletElm) {
    var a = outletElm.getBoundingClientRect();
    var b = inletElm.getBoundingClientRect();

    var distance = Math.sqrt(((a.left - b.left) * (a.left - b.left)) +
                             ((a.top  - b.top ) * (a.top  - b.top )));
    var angle = Math.atan2(b.top - a.top, b.left - a.left);

    var linkElm = quickElm('span','rpd-link');
    linkElm.style.position = 'absolute';
    linkElm.style.width = Math.floor(distance) + 'px';
    linkElm.style.left = a.left + 'px';
    linkElm.style.top = a.top + 'px';
    linkElm.style.transformOrigin = 'left top';
    linkElm.style.transform = 'rotateZ(' + angle + 'rad)';
    return linkElm;
}

function rotateLink(root, degree) {
    // TODO:
}

var default_width = 100,
    default_height = 50,
    default_x_margin = 30;
    default_y_margin = 20,
    default_limits = [ 1000, 1000 ];

var node_rects = [];

function applyNextNodeRect(node, nodeElm, limits) {
    var width = node.def.minWidth || default_width,
        height = node.def.minHeight || default_height,
        limits = limits || default_limits;
    /*var w_sum = 0, h_sum = 0;
    for (var i = 0, il = node_rects.length; i < il; i++) {
        node_rects[i]
    } TODO */
    var new_rect;
    if (node_rects.length) {
        var last_rect = node_rects[node_rects.length-1];
        new_rect = [ last_rect[0], last_rect[1] + last_rect[3] + default_y_margin, width, height ];
    } else {
        new_rect = [ 0, 0, width, height ];
    }
    nodeElm.style.left = new_rect[0] + 'px';
    nodeElm.style.top = new_rect[1] + 'px';
    nodeElm.style.minWidth = new_rect[2] + 'px';
    nodeElm.style.minHeight = new_rect[3] + 'px';
    node_rects.push(new_rect);
}

// ========= registration =========

renderer('html', function(root, update) {

    //console.log(root, update);
    HtmlRenderer[update.type](root, update);

});
