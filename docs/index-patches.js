function applyCodeExample1() {
    Rpd.renderNext('svg', document.getElementById('example-one'),
                   { style: 'compact-v',
                     nodeMovingAllowed: false });

    var rgPatch = Rpd.addPatch('Generate Random Numbers')
                     .resizeCanvas(800, 200);

    var rgMetroNode = rgPatch.addNode('util/metro', 'Metro')
                             .move(40, 10);

    var rgRandomNode = rgPatch.addNode('util/random', 'Random').move(130, 10);
    rgRandomNode.inlets['max'].receive(26);

    rgMetroNode.outlets['out'].connect(rgRandomNode.inlets['bang']);

    //rgMetroNode.inlets['period'].receive(3000);

    var logNode = rgPatch.addNode('util/log', 'Log').move(210, 60);
    rgRandomNode.outlets['out'].connect(logNode.inlets['what']);

    var multiplyTwo = rgPatch.addNode('core/basic', '* 2', {
        process: function(inlets) {
            return {
                'result': (inlets.multiplier || 0) * 2
            }
        }
    }).move(250, 10);
    var multiplierInlet = multiplyTwo.addInlet('util/number', 'multiplier');
    var resultOutlet = multiplyTwo.addOutlet('util/number', 'result');

    rgRandomNode.outlets['out'].connect(multiplierInlet);
}

applyCodeExample1();

var logoPatchAdded = false;
document.getElementById('planets').addEventListener('click', function() {
    if (logoPatchAdded) return;
    logoPatchAdded = true;
    applyRpdLogoPatch(document.getElementById('rpd-logo'),
                      document.getElementById('planets'),
                      document.getElementById('patch-target'));
});

var stringFromCharCode = String.fromCharCode;
var floor = Math.floor;
function fromCodePoint(_) {
    // https://github.com/mathiasbynens/String.fromCodePoint/blob/master/fromcodepoint.js
    var MAX_SIZE = 0x4000;
    var codeUnits = [];
    var highSurrogate;
    var lowSurrogate;
    var index = -1;
    var length = arguments.length;
    if (!length) {
        return '';
    }
    var result = '';
    while (++index < length) {
        var codePoint = Number(arguments[index]);
        if (
            !isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
            codePoint < 0 || // not a valid Unicode code point
            codePoint > 0x10FFFF || // not a valid Unicode code point
            floor(codePoint) != codePoint // not an integer
        ) {
            throw RangeError('Invalid code point: ' + codePoint);
        }
        if (codePoint <= 0xFFFF) { // BMP code point
            codeUnits.push(codePoint);
        } else { // Astral code point; split in surrogate halves
            // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
            codePoint -= 0x10000;
            highSurrogate = (codePoint >> 10) + 0xD800;
            lowSurrogate = (codePoint % 0x400) + 0xDC00;
            codeUnits.push(highSurrogate, lowSurrogate);
        }
        if (index + 1 == length || codeUnits.length > MAX_SIZE) {
            result += stringFromCharCode.apply(null, codeUnits);
            codeUnits.length = 0;
        }
    }
    return result;
}
