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
  var selection;
  if (typeof v === 'string') selection = (all ? Array.prototype.slice.call(root.querySelectorAll(v), 0)
                                              : [ root.querySelector(v) ]);
  else if (v instanceof Node) selection = [ v ];
  else if (Array.isArray(v)) selection = v;
  else selection = [ v ];
  this.selection = selection;
};

Selection.prototype.attr = function(attr, val) {
  if (!val && (this.selection.length === 1)) return this.selection[0][attr];
  return modify(this, val, function(subj, s_val) { subj[attr] = s_val; });
};

Selection.prototype.property = Selection.prototype.attr;

Selection.prototype.style = function(prop, val) {
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
  modify(this, (typeof name === 'string') ? document.createElement(name) : name,
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

return { 'select': function(v, root) { return new Selection(v, root); },
         'selectAll': function(v, root) { return new Selection(v, root, true); } };

})();
