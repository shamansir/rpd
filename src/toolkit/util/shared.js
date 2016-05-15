function NodeList() {

}

NodeList.prototype.addCtrlSpaceAndArrows = function(search, clearingEvents, listElements, updateSelection) {
    for (var i = 0; i < listElements.length; i++) {
        listElements[i].visible = true;
        listElements[i].prev = (i > 0) ? listElements[i - 1] : listElements[listElements.length - 1];
        listElements[i].next = (i < listElements.length - 1) ? listElements[i + 1] : listElements[0];
    }

    // ctrl+space should focus on the search field and up/down arrows should
    // work for selection
    Kefir.merge([
            Kefir.fromEvents(document.body, 'keyup')
                 .filter(function(evt) {
                     // control / alt / cmd + space
                     return (evt.which == 32 || evt.keyCode == 32) && (evt.altKey || evt.metaKey || evt.ctrlKey);
                 }),
            Kefir.fromEvents(search.node(), 'click')
        ]).flatMap(function(switchedOn) {
             console.log('start!'); search.node().focus();
             if (listElements.length > 0) updateSelection(listElements[0]);
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
                                          clearingEvents.map(function() { return false; })/*,
                                          Kefir.fromEvents(search.node(), 'click')*/
                                      ]).take(1).onValue(function(doAdd) {
                                          if (doAdd && selected) {
                                              console.log('enter', 'add', selected.def.fullName);
                                          }
                                          console.log('clear selection');
                                          search.node().blur();
                                          updateSelection(null);
                                      }))
                         .onValue(function(key) {
                             if (currentlyVisible == 0) return;
                             search.node().blur();
                             if (key === 'up') {
                                 var current = selected ? selected.prev : listElements[listElements.length - 1];
                                 while (current && !current.visible) {
                                     current = current.prev;
                                 }
                             } else if (key === 'down') {
                                 var current = selected ? selected.next : listElements[0];
                                 while (current && !current.visible) {
                                     current = current.next;
                                 }
                             }
                             console.log('select', current ? current.def.fullName : 'NONE');
                             if (current) updateSelection(current);
                         });
         }).onValue(function() {});
}
