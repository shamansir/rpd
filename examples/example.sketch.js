var sketchConfig = {
    xspacing: 16,       // Distance between each horizontal location
    amplitude: 75.0,    // Height of wave
    period: 500.0       // How many pixels before the wave repeats
};

var w,  // Width of entire wave
    dx, // Value for incrementing x
    theta = 0.0, // Start angle at 0
    yvalues;  // Using an array to store height values for the wave

function setup() {
  var myCanvas = createCanvas(400, 300);
  myCanvas.parent('p5-canvas');
  recalcWaves(sketchConfig);
}

function draw() {
  background(0);
  calcWave(sketchConfig);
  renderWave(sketchConfig);
}

function recalcWaves(conf) {
  w = width+16;
  var xspacing = (conf.xspacing > 0) ? conf.xspacing : 10,
      period = (conf.period > 0) ? conf.period : 500;
  dx = (TWO_PI / conf.period) * xspacing;
  yvalues = new Array(floor(w/xspacing));
}

function calcWave(conf) {
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

function renderWave(conf) {
  noStroke();
  fill(255);
  // A simple way to draw the wave with an ellipse at each location
  for (var x = 0; x < yvalues.length; x++) {
    ellipse(x*conf.xspacing, height/2+yvalues[x], 16, 16);
  }
}
