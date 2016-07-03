function applyCodeExample1() {
    Rpd.renderNext('svg', document.getElementById('example-one'),
                   { style: 'compact-v' });

    var patch = Rpd.addPatch('Generate Random Numbers').resizeCanvas(800, 110);

    // add Metro Node, it may generate `bang` signal with the requested time interval
    var metroNode = patch.addNode('util/metro', 'Metro').move(40, 10);

    // add Random Generator Node that will generate random numbers on every `bang` signal
    var randomGenNode = patch.addNode('util/random', 'Random').move(130, 20);
    randomGenNode.inlets['max'].receive(26); // set maximum value of the generated numbers

    // add Log Node, which will log last results of the Random Generator Node
    var logRandomNode = patch.addNode('util/log', 'Log').move(210, 60);
    randomGenNode.outlets['out'].connect(logRandomNode.inlets['what']);

    // define the type of the node which multiplies the incoming value on two
    var multiplyTwoNode = patch.addNode('core/basic', '* 2', {
        process: function(inlets) {
            return {
                'result': (inlets.multiplier || 0) * 2
            }
        }
    }).move(240, 10);
    var multiplierInlet = multiplyTwoNode.addInlet('util/number', 'multiplier');
    var resultOutlet = multiplyTwoNode.addOutlet('util/number', 'result');

    // connect Random Generator output to the multiplying node
    var logMultiplyNode = patch.addNode('util/log', 'Log').move(370, 20);
    resultOutlet.connect(logMultiplyNode.inlets['what']);

    // connect Random Generator output to the multiplying node
    randomGenNode.outlets['out'].connect(multiplierInlet);

    // finally connect Metro node to Random Generator, so the sequence starts
    metroNode.outlets['out'].connect(randomGenNode.inlets['bang']);
}

function applyCodeExample2() {
    Rpd.renderNext('svg', document.getElementById('example-two'),
                   { style: 'compact-v' });

    var patch = Rpd.addPatch('Generate Canvas Shapes').resizeCanvas(800, 180);

    Rpd.channeltype('my/vector', {
      show: function(val) {
      	return '<' + Math.floor(val.x) + ':' + Math.floor(val.y) + '>';
      }
    });

    Rpd.nodetype('my/vector', {
      inlets: {
        x: { type: 'util/number', default: 0 },
        y: { type: 'util/number', default: 0 }
      },
      outlets: {
        out: { type: 'my/vector' }
      },
      process: function(inlets) {
        return { out: { x: inlets.x, y: inlets.y } };
      }
    });

    Rpd.channeltype('my/angle', {
      allow: [ 'util/number '],
      accept: function(v) { return (v >= 0) && (v <= 360); },
      show: function(v) { return v + '˚'; }
    });

    var defaultConfig = {
      count: 7,
      from: { r: 0, g: 0, b: 0 },
      to: { r: 255, g: 0, b: 0 },
      shift: { x: 25, y: 0 },
      rotate: 15
    };

    Rpd.nodetype('my/scene', {
      inlets: {
        from: { type: 'util/color', default: defaultConfig.from },
        to: { type: 'util/color', default: defaultConfig.to },
        count: { type: 'util/number', default: defaultConfig.count,
                 adapt: function(v) { return Math.floor(v); } },
        shift: { type: 'my/vector', default: defaultConfig.shift },
        rotate: { type: 'my/angle', default: defaultConfig.rotate },
      },
      process: function() {}
    });

    var SVG_XMLNS = 'http://www.w3.org/2000/svg';

    function lerp(v1, v2, pos) {
      return (v1 + ((v2 - v1) * pos));
    }

    Rpd.noderenderer('my/scene', 'svg', function() {
      var width = 100, height = 100;

      var context;
      var particles = [];
      var lastCount = 0;
      var config = defaultConfig;

      function draw() {
        if (context) {
          context.save();
          context.fillStyle = '#fff';
          context.fillRect(0, 0, width, height);
          context.fillStyle = '#000';
          particles.forEach(function(particle, i) {
            context.fillStyle = 'rgb(' +
              Math.floor(lerp(config.from.r, config.to.r, 1 / (particles.length - 1) * i)) + ',' +
              Math.floor(lerp(config.from.g, config.to.g, 1 / (particles.length - 1) * i)) + ',' +
    		  Math.floor(lerp(config.from.b, config.to.b, 1 / (particles.length - 1) * i)) + ')';
            context.fillRect(0, 0, 15, 15);
            context.translate(config.shift.x, config.shift.y);
            context.rotate(config.rotate * Math.PI / 180);
          });
          context.restore();
        }
        requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);

      return {
        size: { width: width + 10, height: height + 10 },
        pivot: { x: 0, y: 0 },

        first: function(bodyElm) {
          var group = document.createElementNS(SVG_XMLNS, 'g');
          group.setAttributeNS(null, 'transform', 'translate(5, 5)');
          var foreign = document.createElementNS(SVG_XMLNS, 'foreignObject');
          canvas = document.createElement('canvas');
          canvas.setAttributeNS(null, 'width', width + 'px');
          canvas.setAttributeNS(null, 'height', height + 'px');
          canvas.style.position = 'fixed';
          foreign.appendChild(canvas);
          group.appendChild(foreign);
          bodyElm.appendChild(group);

          context = canvas.getContext('2d');
        },

        always: function(bodyElm, inlets) {
          if (!isNaN(inlets.count) && (inlets.count != lastCount)) {
            particles = [];
            for (var i = 0; i < inlets.count; i++) {
              particles.push({});
            }
            lastCount = inlets.count;
          }
          if (inlets.from) config.from = inlets.from;
          if (inlets.to) config.to = inlets.to;
          if (inlets.shift) config.shift = inlets.shift;
          if (!isNaN(inlets.rotate)) config.rotate = inlets.rotate;
        }

      };
    });

    var scene = patch.addNode('my/scene').move(570, 5);
    var color1 = patch.addNode('util/color').move(120, 5);
    var color2 = patch.addNode('util/color').move(100, 80);
    var vec = patch.addNode('my/vector').move(305, 90);
    var knob1 = patch.addNode('util/knob').move(25, 5);
    var knob2 = patch.addNode('util/knob').move(490, 110);
    var knob3 = patch.addNode('util/knob').move(210, 105);
    var knob4 = patch.addNode('util/knob').move(400, 110);

    knob1.inlets['max'].receive(255);
    knob2.inlets['max'].receive(180);
    knob4.inlets['max'].receive(15);
    vec.inlets['x'].receive(25);

    knob1.outlets['number'].connect(color1.inlets['r']);
    knob3.outlets['number'].connect(vec.inlets['y']);
    color1.outlets['color'].connect(scene.inlets['from']);
    color2.outlets['color'].connect(scene.inlets['to']);
    vec.outlets['out'].connect(scene.inlets['shift']);
}

applyCodeExample1();
applyCodeExample2();

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
