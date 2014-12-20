renderer('html', function(root, node) {

    if (node.type == 'core/empty') {
        var node_elm = document.createElement('span');
        node_elm.innerText = node.name;
        root.appendChild(node_elm);
    }

});
