// source: https://gist.github.com/shamansir/a4459a588a12d4178197

var d3_tiny = (function() {

function modify(s, v, each) {
    var f = (typeof v === 'function') ? v : function() { return v; };
    var sel = s.selection;
    for (var i = 0, il = sel.length; i < il; i++) {
        each(sel[i], f.bind(sel[i])(i));
    };
    return s;
};

function Selection(v, root, all) {
    root = root || document;
    if (typeof v === 'string') selection = (all ? Array.prototype.slice.call(root.querySelectorAll(v), 0)
                                                : [ root.querySelector(v) ]);
    else if (v instanceof Node) selection = [ v ];
    else if (Array.isArray(v)) selection = v;
    else selection = [ v ];
    this.namespace = ((selection.length === 1) && (selection[0])) ? selection[0].namespaceURI : null;
    this.selection = selection;
};

Selection.prototype.attr = function(attr, val) {
    if ((typeof val === 'undefined') && (this.selection.length === 1)) return this.selection[0].getAttribute(attr);
    return modify(this, val, function(subj, s_val) { subj.setAttributeNS(null, attr, s_val); });
};

Selection.prototype.property = function(prop, val) {
    if ((typeof val === 'undefined') && (this.selection.length === 1)) return this.selection[0][prop];
    return modify(this, val, function(subj, s_val) { subj[prop] = s_val; });
};

Selection.prototype.style = function(prop, val) {
    if (prop[0] === '-') prop = prop.slice(1);
    prop = prop.replace(/-([a-z])/g, function(g) { return g[1].toUpperCase(); });
    return modify(this, val, function(subj, style) { subj.style[prop] = style; });
};

Selection.prototype.text = function(val) {
    return modify(this, val, function(subj, text) { subj.innerText = subj.textContent = text; });
}

Selection.prototype.classed = function(name, val) {
    if (typeof name === 'object') {
        var spec = name;
        return modify(this, Object.keys(spec), function(subj, list) {
            for (var i = 0, il = list.length; i < il; i++) { subj.classList.toggle(list[i], spec[list[i]]); }
        });
    } else {
        return modify(this, val, function(subj, flag) { subj.classList.toggle(name, flag); });
    }
}

Selection.prototype.select = function(v) { return new Selection(v, this.selection[0]); };

Selection.prototype.selectAll = function(v) { return new Selection(v, this.selection[0], true); };

Selection.prototype.append = function(name) {
    var selection = [];
    modify(this, (typeof name === 'string') ? document.createElementNS(this.namespace, name) : name,
                 function(subj, elm) { subj.appendChild(elm); selection.push(elm); });
    return new Selection(selection);
};

Selection.prototype.remove = function() {
    return modify(this, function() { return null; }, function(subj) {
        subj.parentElement.removeChild(subj);
    });
};

Selection.prototype.node = function(i) { return this.selection[i || 0]; }

Selection.prototype.on = function(event, handler) {
    return modify(this, function() { return handler; },
                  function(subj, handler) { subj.addEventListener(event, handler) });
};

Selection.prototype.data = function(val) {
    if (!val) return this.node().__data__;
    return modify(this, val, function(subj, data) { subj.__data__ = data; });
}

Selection.prototype.call = function(fn) {
    fn(this); return this;
}

return { 'ns': { 'prefix': { 'svg': 'http://www.w3.org/2000/svg', 'html': 'http://www.w3.org/1999/xhtml' } },
         'select': function(v, root) { return new Selection(v, root); },
         'selectAll': function(v, root) { return new Selection(v, root, true); } };

})();
