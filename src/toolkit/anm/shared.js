// Spread

// Spread is an iterator and a stream of values in one. To get an iterator from a spread,
// call `var next = spread.iterator()`—it returns a function `next`, which, with every
// call like `next()`, produces a next value until it's equal to `Spread.STOP`.
//
// To get a Kefir-compatible Stream of values from a Spread, call `var stream = spread.stream()`,
// the returned stream will end when the values will end.
//
// If another stream was passed to `spread.stream(<signal_stream>)`, this stream acts
// as a signal to emit next values asynchronously in the resulting stream. This way, for example,
// when spread.stream(Kefir.interval(50).take(10)).log() was called, values from the spread will be
// emitted every 50ms, 10 times (or less, if source spread will end before).
//
// To create a Spread, you need to provide a type of its values (any string) and
// a function which looks like:
//
// ```
// var spread = new Spread('any',
//     function() {
//         <initialize iteration>;
//         return function() {
//            <any code>;
//            return <next value or Spread.STOP>;
//         }
//     });
// ```

function Spread(type, iter) {
    this.type = type;
    this.iter_f = iter;
}
Spread.prototype.iterator = function() {
    return Spread._makeIterator(this.iter_f);
}
Spread.prototype.stream = function(signal) {
    return Spread._makeStream(this.iter_f, signal);
}
Spread.prototype.empty = function() {
    return this.is(Spread.EMPTY);
}
Spread.prototype.is = function(type) {
    return this.type === type;
}
Spread.prototype.toString = function() {
    return '[' + this.type + ']';
}
Spread._makeIterator = function(iter_f) { return iter_f(); }
Spread._makeStream = function(iter_f, signal) {
    var next = iter_f();
    if (signal) {
        return signal.map(next)
                     .takeWhile(function(v) { return (v !== Spread.STOP); });
    } else {
        return Kefir.stream(function(emitter) {
            var v;
            while ((v = next()) !== Spread.STOP) { emitter.emit(v); }
            emitter.end();
        });
    }
}
Spread.is = function(val, type) {
    if (!val) return false;
    if (!(val instanceof Spread)) return false;
    return val.is(type);
}
Spread.join = function(spreads, res_type, map_fn) {
    return new Spread(res_type, function() {

        // the only for-loops left in a code, instead of forEach (#212)

        for (var i = 0; i < spreads.length; i++) {
            if (!spreads[i] || spreads[i].empty()) return function() { return Spread.STOP; };
        }

        var iters = [],
            finished = [];

        for (i = 0; i < spreads.length; i++) {
            iters.push(spreads[i].iterator());
            finished.push(false);
        }

        var to_go = spreads.length;

        return function() {
            var result = [];
            for (var i = 0; i < iters.length; i++) {
                var next = iters[i]();
                if (next === Spread.STOP) {
                    if (!finished[i]) { to_go--; if (!to_go) return Spread.STOP; }
                    finished[i] = true;
                    iters[i] = spreads[i].iterator(); // replaces a value, so it's safe
                    next = iters[i](); // we ensured spreads are non-empty, so STOP won't be here
                }
                result.push(next);
            }
            return map_fn ? map_fn.apply(null, result) : result;
        }
    });
}
Spread.adapt = function(v, type) {
    if (typeof v === 'undefined') return Spread.empty();
    if (Array.isArray(v)) return Spread.fromArray(v, type);
    if (!(v instanceof Spread)) return Spread.fromValue(v, type);
    return v;
}
Spread.empty = function() {
    return new Spread(Spread.EMPTY, function() {
        return function() {
            return Spread.STOP;
        };
    })
}
Spread.fromValue = function(val, type) {
    return new Spread(type, function() {
        var done = false;
        return function() {
            if (done) return Spread.STOP;
            done = true;
            return val;
        }
    });
}
Spread.fromArray = function(arr, type) {
    return new Spread(type, function() {
        var i = 0, len = arr.length;
        return function() {
            if (i < arr.length) return arr[i++];
            return Spread.STOP;
        };
    });
}
Spread.of = function(val, type) {
    if (typeof val === 'undefined') return Spread.empty();
    if (Array.isArray(val)) return Spread.fromArray(val, type);
    return Spread.fromValue(val, type);
}

Spread.MAX_REPEATS = 1000;

Spread.STOP = '_STOP_';

Spread.EMPTY = 'Empty';
Spread.UNKNOWN  = 'Empty';

Spread.NUMBERS  = 'Numbers';
Spread.VECTORS  = 'Vectors';
Spread.COLORS   = 'Colors';
Spread.ELEMENTS = 'Elements';
Spread.FORCES   = 'Forces';

// Implementations

function minMaxSpread(a, b, count) {
    var min = Math.min(a, b) || 0,
        max = Math.max(a, b) || 0;
    var count = (count > 1) ? count : 1;
    return new Spread(Spread.NUMBERS, function() {
        if (min !== max) {
            var step = (max - min) / (count - 1);
            var value = min;
            var done = 0;
            return function() {
                if (done < count) {
                    var current = value;
                    value += step; done++;
                    return current;
                }
                return Spread.STOP;
            };
        } else {
            var to_do = count;
            return function() {
                if (!to_do) return Spread.STOP;
                to_do--; return min;
            }
        }
    });
}

// Vector

function Vector(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}
Vector.prototype.toString = function() {
    return '(' + this.x.toFixed(3) + ';' + this.y.toFixed(3) + ')';
}
