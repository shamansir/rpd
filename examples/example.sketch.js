var sketchConfig = {
  wavescount: 5,      // Number of waves
  xspacing: 16,       // Distance between each horizontal location
  amplitude: 75.0,    // Height of wave
  period: 500.0,      // How many pixels before the wave repeats
  startcolor: { r: 255, g: 255, b: 255 }, // Color of the first wave
  endcolor: { r: 255, g: 255, b: 255 }    // Color of the last wave
};

var w,  // Width of entire wave
    dx, // Value for incrementing x
    theta = 0.0, // Start angle at 0
    yvalues,  // Using an array to store height values for the wave
    start, // start color in p5 format
    end;  // end color in p5 format

function setup() {
  var myCanvas = createCanvas(400, 300);
  myCanvas.parent('p5-canvas');
  updateWithConfig(sketchConfig);
}

function draw() {
  background(0);
  calcWaves(sketchConfig);
  renderWaves(sketchConfig);
}

function updateWithConfig(conf) {
  w = width+16;
  var xspacing = (conf.xspacing > 0) ? conf.xspacing : 10,
      period = (conf.period > 0) ? conf.period : 500;
  dx = (TWO_PI / conf.period) * xspacing;
  yvalues = new Array(floor(w/xspacing));
  start = conf.startcolor ? color(conf.startcolor.r, conf.startcolor.g, conf.startcolor.b)
                          : color(255, 255, 255);
  end = conf.endcolor ? color(conf.endcolor.r, conf.endcolor.g, conf.endcolor.b)
                      : color(255, 255, 255);
}

function calcWaves(conf) {
  // Increment theta (try different values for
  // 'angular velocity' here
  theta += 0.02;

  // For every x value, calculate a y value with sine function
  var x = theta;
  for (var i = 0; i < yvalues.length; i++) {
    yvalues[i] = sin(x)*conf.amplitude;
    x+=dx;
  }
}

function renderWaves(conf) {
  noStroke();
  var yspan = (height - 40) / conf.wavescount;
  var colorspan = 1 / conf.wavescount;
  for (var i = 0, y = 20; i < conf.wavescount; i++, y += yspan) {
    fill(lerpColor(start, end, colorspan * i));
    for (var x = 0; x < yvalues.length; x++) {
      ellipse(x*conf.xspacing, y+yvalues[x], 14, 14);
    }
  }
}
