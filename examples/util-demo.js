function buildUtilDemoPatch(renderer, target, conf) {

    var model = Rpd.addPatch().render(renderer, target, conf);

    var genA = model.addNode('core/basic', 'Generate A');
    var outA = genA.addOutlet('util/number', 'A');

    var genA = model.addNode('core/basic', 'Generate B');
    var outB = genA.addOutlet('util/number', 'B');

    var sumOfThree = model.addNode('util/sum-of-three', 'Sum1').move(200, 20);
    var inA = sumOfThree.inlets['a'];
    var inB = sumOfThree.inlets['b'];

    outA.connect(inA);
    outB.connect(inB);

    /* var sumOfThreeBody = new Rpd.Node('demo/sum-of-three-with-body', 'Sum2');
    var inABody = sumOfThreeBody.inlets['a'];
    var inBBody = sumOfThreeBody.inlets['b'];

    outA.connect(inABody);
    outB.connect(inBBody); */

    outA.stream(Kefir.repeat(function() {
        return Kefir.sequentially(400, [1, 2, 3]); }));
    outB.stream(Kefir.repeat(function() {
        return Kefir.sequentially(800, [4, 5, 6]); }));
    // outC.send(5);

    var log = model.addNode('util/log');
    log.move(375, 100);
    sumOfThree.outlets['sum'].connect(log.inlets['what']);

    var nodeList = model.addNode('util/nodelist');
    nodeList.move(550, 30);

    model.addNode('util/color').move(270, 200);

    var bounded = model.addNode('util/bounded-number');
    bounded.inlets['max'].receive(255);
    bounded.move(60, 240);

    var comment = model.addNode('util/comment');
    comment.inlets['text'].receive('connect bounded number node \'out\' to any inlet of color node');
    comment.inlets['width'].receive(130);
    comment.move(150, 230);

    // Flag Generator

    var metro1 = model.addNode('util/metro').move(50, 370);
    var metro2 = model.addNode('util/metro').move(50, 460);
    metro1.inlets['period'].receive(2000);
    metro2.inlets['period'].receive(3000);

    var random1 = model.addNode('util/random').move(200, 350);
    random1.inlets['max'].receive(25);
    var random2 = model.addNode('util/random').move(200, 480);
    random2.inlets['max'].receive(25);

    var letter1 = model.addNode('util/letter').move(350, 350);
    var letter2 = model.addNode('util/letter').move(350, 440);

    metro1.outlets['out'].connect(random1.inlets['bang']);
    metro2.outlets['out'].connect(random2.inlets['bang']);

    random1.outlets['out'].connect(letter1.inlets['code']);
    random2.outlets['out'].connect(letter2.inlets['code']);

    Rpd.nodetype('user/maybe-flag', {
        title: 'May be a flag?',
        inlets: {
            'letterA': { type: 'core/any' },
            'letterB': { type: 'core/any' }
        },
        outlets: {
            'out': { type: 'core/any' },
            'code': { type: 'core/any' }
        },
        process: function(inlets) {
            if (!inlets.letterA || !inlets.letterB) return;
            return { 'code': String.fromCharCode(inlets.letterA.charCodeAt(0) - 32) + String.fromCharCode(inlets.letterB.charCodeAt(0) - 32),
                     'out' : fromCodePoint(55356) + fromCodePoint(inlets.letterA.charCodeAt(0) - 97 + 56806) +
                             fromCodePoint(55356) + fromCodePoint(inlets.letterB.charCodeAt(0) - 97 + 56806) };
        }
    });

    var d3 = d3 || d3_tiny;

    Rpd.noderenderer('user/maybe-flag', 'svg', function() {
        var textElm;
        return {
            first: function(bodyElm) {
                textElm = d3.select(bodyElm).append('text')
                            .style('text-anchor', 'middle');
            },
            always: function(bodyElm, inlets, outlets) {
                if (!outlets) return;
                //console.log(inlets, outlets);
                textElm.text(outlets.out + ' (' + outlets.code + ')');
            }
        }
    });

    //fromCodePoint(55356) + fromCodePoint('e'.charCodeAt(0) - 97 + 56806);

    var maybeFlag = model.addNode('user/maybe-flag', 'Maybe<Flag>').move(570, 400);
    letter1.outlets['letter'].connect(maybeFlag.inlets['letterA']);
    letter2.outlets['letter'].connect(maybeFlag.inlets['letterB']);

}

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
