var RpdUtils = (function() {

function adaptToState(state, value) {
    return Math.floor((state.min + ((state.max - state.min) * value)) * 100) / 100;
}

function numberToHex(num) { return (num > 15) ? num.toString(16) : '0' + num.toString(16); }

function toHexColor(color) {
    return '#' + numberToHex(color.r || 0)
               + numberToHex(color.g || 0)
               + numberToHex(color.b || 0);
}

function getNodeTypesByToolkit(nodeTypes) {
    return Object.keys(nodeTypes).reduce(function(byToolkit, nodeType) {
        var slashPos = nodeType.indexOf('/');
        var toolkit = (slashPos < 0) ? toolkit : nodeType.substring(0, slashPos);
        var typeName = (slashPos < 0) ? '' : nodeType.substring(slashPos + 1);
        if (!byToolkit[toolkit]) byToolkit[toolkit] = { icon: '', types: [] };
        byToolkit[toolkit].types.push({ toolkit: toolkit,
                                        fullName: nodeType, name: typeName,
                                        data: nodeTypes[nodeType] });
        return byToolkit;
    }, {})
}

function NodeList(conf) {
    this.listElements = [];

    this.selected = null;

    this.markSelected = conf.markSelected;
    this.markDeselected = conf.markDeselected;
    this.markAdding = conf.markAdding;
    this.markAdded = conf.markAdded;
    this.recalculateSize = conf.recalculateSize;

    this.setVisible = conf.setVisible;
    this.setInvisible = conf.setInvisible;

    this.getPatch = conf.getPatch;

    // create text input, search field, to let user filter results
    this.searchInput = conf.createSearchInput();
    // create a button which is able to clear this field
    this.clearSearchButton = conf.createClearSearchButton();

    var listElements = conf.buildList();

    var search = this.searchInput,
        clearSearch = this.clearSearchButton;

    this.clearingEvents = Kefir.fromEvents(this.clearSearchButton.node(), 'click')
        .onValue(function() {
            this.selectNothing();
            conf.clearSearchInput(this.searchInput);
        }.bind(this));

    // make the list of elements double-linked and looped,
    // so easy navigation with up/down arrow keys will be possible
    for (var i = 0; i < listElements.length; i++) {
        listElements[i].visible = true;
        listElements[i].prev = (i > 0) ? listElements[i - 1] : listElements[listElements.length - 1];
        listElements[i].next = (i < listElements.length - 1) ? listElements[i + 1] : listElements[0];
    }

    this.listElements = listElements;

    this.currentlyVisible = listElements.length;
}

NodeList.prototype.select = function(elmData) {
    if (this.selected) this.markDeselected(this.selected);
    this.selected = elmData;
    if (this.selected) this.markSelected(elmData);
}

NodeList.prototype.selectNothing = function() {
    this.select(null);
}

NodeList.prototype.addOnClick = function() {
    var nodeList = this;

    var listElements = this.listElements;

    listElements.forEach(function(elmData) {
        var li = elmData.element;
        Kefir.fromEvents(li.node(), 'click')
             .onValue(function() {
                 // add the node when corresponding element was clicked with mouse
                 nodeList.select(elmData);
                 nodeList.addNode(elmData);
             });
    });

}

NodeList.prototype.addNode = function(elmData) {
    this.markAdding(elmData);
    setTimeout(function() {
        this.markAdded(elmData);
    }.bind(this), 1000);
    this.getPatch().addNode(elmData.def.fullName);
}

NodeList.prototype.addSearch = function() {
    var nodeList  = this;

    var search = this.searchInput;

    // make seach field hide filtered results when user changes search request
    Kefir.fromEvents(search.node(), 'input')
         .merge(this.clearingEvents)
         .throttle(500)
         .map(function() { return search.node().value; })
         .onValue(function(searchString) {
             var visibleBefore = nodeList.currentlyVisible;
             nodeList.currentlyVisible = 0;
             nodeList.listElements.forEach(function(elmData) {
                 var index = elmData.def.fullName.indexOf(searchString);
                 if (index >= 0) { nodeList.setVisible(elmData); }
                 else { nodeList.setInvisible(elmData); };
                 elmData.visible = (index >= 0);
                 if (elmData.visible) nodeList.currentlyVisible++;
             });
             nodeList.recalculateSize(nodeList.listElements,
                            visibleBefore, nodeList.currentlyVisible);
         });
}

NodeList.prototype.addCtrlSpaceAndArrows = function() {
    var nodeList = this;

    var listElements = this.listElements;

    var search = this.searchInput,
        clearSearch = this.clearSearchButton;

    var clearingEvents = this.clearingEvents;

    // ctrl+space should focus on the search field and up/down arrows should
    // work for selection
    Kefir.merge([
            Kefir.fromEvents(document.body, 'keyup')
                 .filter(function(evt) {
                     // (control / alt / cmd) + space // TODO: double space (#63)?
                     return (evt.which == 32 || evt.keyCode == 32) && (evt.altKey || evt.metaKey || evt.ctrlKey);
                 }),
            Kefir.fromEvents(search.node(), 'click')
        ]).flatMap(function(switchedOn) {
             //console.log('start!');
             search.node().focus();
             if (listElements.length > 0) nodeList.select(listElements[0]);
             return Kefir.fromEvents(document.body, 'keyup')
                         .map(function(evt) { return evt.which || evt.keyCode; })
                         .filter(function(key) { return (key === 38) || (key === 40); })
                         .map(function(key) { return (key === 38) ? 'up' : 'down'; })
                         .takeUntilBy(Kefir.merge([
                                          Kefir.fromEvents(document.body, 'keyup')
                                               .filter(function(evt) {
                                                   return (evt.which == 13 || evt.keyCode == 13); // key == enter
                                               }).map(function() { return true; }),
                                          Kefir.fromEvents(document.body, 'keyup').filter(function(evt) {
                                              return (evt.which == 27 || evt.keyCode == 27); // key === escape
                                          }).map(function() { return false; }),
                                          Kefir.fromEvents(document.body, 'click').filter(function(evt) {
                                              return evt.target !== search.node();
                                          }).map(function() { return false; }),
                                          nodeList.clearingEvents.map(function() { return false; })/*,
                                          Kefir.fromEvents(search.node(), 'click')*/
                                      ]).take(1).onValue(function(doAdd) {
                                          if (doAdd && nodeList.selected) {
                                              nodeList.addNode(nodeList.selected);
                                          }
                                          search.node().blur();
                                          nodeList.selectNothing();
                                      }))
                         .onValue(function(key) {
                             if (nodeList.currentlyVisible == 0) return;
                             search.node().blur();
                             if (key === 'up') {
                                 var current = nodeList.selected ? nodeList.selected.prev : listElements[listElements.length - 1];
                                 while (current && !current.visible) {
                                     current = current.prev;
                                 }
                             } else if (key === 'down') {
                                 var current = nodeList.selected ? nodeList.selected.next : listElements[0];
                                 while (current && !current.visible) {
                                     current = current.next;
                                 }
                             }
                             if (current) nodeList.select(current);
                         });
         }).onValue(function() {});
}

return {
    'adaptToState': adaptToState,
    'numberToHex': numberToHex,
    'toHexColor': toHexColor,
    'getNodeTypesByToolkit': getNodeTypesByToolkit,
    'NodeList': NodeList
};

})();
