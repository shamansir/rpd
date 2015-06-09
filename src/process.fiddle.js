Kefir.DEPRECATION_WARNINGS = false;

console.log('------------------');

var NO_VALUE = '__NONE__';
function I(v) { return function() { return v }; }

var inletAdd = Kefir.emitter(),
    outletAdd = Kefir.emitter();

var process_f = function() { console.log('process', arguments[0], arguments[1]); return {}; };
var inlets =
    inletAdd.flatMap(function(inlet) {
        var updates = inlet.update.map(function(value) {
            return { inlet: inlet, alias: inlet.alias, value: value };
        });
        //if (myself.def.tune) updates = myself.def.tune(updates);
        return updates;
    });
/*inlets = inlets.scan(function(values, update) {
    var alias = update.alias,
        inlet = update.inlet;
    if (!values) {
        var cur_values = {};
        cur_values[alias] = update.value;
        return { prev: {}, cur: cur_values, source: inlet };
    } else {
        if (values.cur[alias]) values.prev[alias] = values.cur[alias];
        values.cur[alias]  = update.value;
        values.source = inlet;
        return values;
    }
}, null);*/
/* inlets = inlets.filter(function(updates) {
    return updates && !updates.source.cold;
});
var outlets = outletAdd.scan(function(outlets, outlet) {
    outlets[outlet.alias] = outlet;
    return outlets;
}, {}); */
var ready = Kefir.emitter();
ready.onValue(function() { console.log('!! ready'); });
var process = Kefir.combine([
        inletAdd.flatMap(function(inlet) {
            var updates = inlet.update.map(function(value) {
                console.log('upd');
                return { inlet: inlet, value: value };
            });
            //if (myself.def.tune) updates = myself.def.tune(updates);
            return updates;
        }) ],
        [ outletAdd.scan(function(outlets, outlet) {
            outlets[outlet.alias] = outlet.alias;
            return outlets;
          }, {}) ]);
process.bufferBy(ready).take(1).flatten()
       .concat(process)
       .scan(function(data, update) {
           console.log(update[1]);
           var inlet = update[0].inlet;
           data.inlets.prev[inlet.alias] = data.inlets.cur[inlet.alias];
           data.inlets.cur[inlet.alias] = update[0].value;
           if (update[1]) data.outlets = update[1];
           return data;
       }, { inlets: { prev: {}, cur: {} }, outlets: {} }).changes()
       .onValue(function(data) {
            //var inlets_vals = value[0] || { prev: {}, cur: {} }; var outlets = value[1] || {};
            //var outlets_vals = process_f(inlets_vals.cur, inlets_vals.prev);
            var outlets_vals = process_f(data.inlets.cur, data.inlets.prev);
            console.log('outlets', data.outlets, outlets_vals);
        });

var firstUpdates = Kefir.emitter();
var secondUpdates = Kefir.emitter();
inletAdd.emit({ alias: 'first', cold: false, update: firstUpdates });
inletAdd.emit({ alias: 'second', cold: false, update: secondUpdates });
firstUpdates.emit(1);
secondUpdates.emit(2.5);
outletAdd.emit({ alias: 'foo' });
outletAdd.emit({ alias: 'bar' });
firstUpdates.emit(1.5);
ready.emit();
secondUpdates.emit(2);
firstUpdates.emit(3);
outletAdd.emit({ alias: 'baz' });
