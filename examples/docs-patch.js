function applyRpdLogoPatch(logoNode, planetsSvgNode, patchTargetNode) {
    var logoBox = logoNode.getBoundingClientRect();

    var animationWidth = 500,
        animationHeight = logoBox.height;

    var widthRequiredForNodes = 300;

    var topMargin = 20, bottomMargin = 20;

    d3.select(planetsSvgNode)
      .style('position', 'absolute')
      .style('left', logoBox.left + 'px').style('top', logoBox.top + 'px')

    d3.select(patchTargetNode)
      .style('position', 'relative')
      .style('left', (logoBox.left - widthRequiredForNodes) + 'px').style('top', (logoBox.top - topMargin) + 'px')

    <!-- ****** Register Patch Types ****** -->

    Rpd.nodetype('docs/logo-anim', {
        inlets: {
            'test': { type: 'core/any' }
        }
    });

    Rpd.noderenderer('docs/logo-anim', 'svg', {
        size: { width: animationWidth + 10, height: animationHeight },
        first: function() {

        },
        always: function() {

        }
    });

    <!-- ****** Building Patch Network ****** -->

    Rpd.renderNext('svg', patchTargetNode,
                   { style: 'compact-v', nodeMovingAllowed: false });

    var patch = Rpd.addPatch('Docs Patch');

    //patch.moveCanvas(logoBox.left - widthRequiredForNodes, logoBox.top);
    patch.resizeCanvas(widthRequiredForNodes + animationWidth + 10,
                       animationHeight + topMargin + bottomMargin);

    patch.addNode('core/basic', 'Basic');

    var animNode = patch.addNode('docs/logo-anim', 'Animation');

    animNode.move(widthRequiredForNodes - 5, 10);

    <!-- ****** Animation with D3 ****** -->

    attachPlanetsAnimation(planetsSvgNode, logoNode,
                           {}, animationWidth, animationHeight);
}

function attachPlanetsAnimation(planetsNode, logoNode, config, width, height) {

    var LOGO_SUN_REF = '#Oval-1';
    var LOGO_NEPTUNE_REF = '#Oval-2';
    var LOGO_TEXT_REF = '#RPD-text';

    var planets = [
            { name: 'Sun', size: 109.3, colors: [ '#fda42b', '#f96e22', '#f00e1a' ] },      /*0*/
            { name: 'Mercury', size: 0.3829, colors: [ '#b5adaa', '#535355', '#232323' ] }, /*1*/
            { name: 'Venus', size: 0.9499, colors: [ '#cdc8c2', '#615d41', '#525355' ] },   /*2*/
            { name: 'Earth', size: 1.0, colors: [ '#314051', '#b79a76', '#e8f1e2' ] },      /*3*/
            { name: 'Mars', size: 0.5320, colors: [ '#ed955f', '#b3734a', '#163c6a' ] },    /*4*/
            { name: 'Jupiter', size: 10.97, colors: [ '#f0eff4', '#935f51', '#cbbaa1' ] },  /*5*/
            { name: 'Saturn', size: 9.140, colors: [ '#dfceb0', '#b99a7d', '#d7c4d2' ] },   /*6*/
            { name: 'Uranus', size: 3.981, colors: [ '#cef4f5', '#acd3d8', '#49696d' ] },   /*7*/
            { name: 'Neptune', size: 3.865, colors: [ '#466aff', '#3948bf', '#1e2051' ] }   /*8*/
            //{ name: "Pluto", size: 0.186 }     /*9*/
        ];

    // Configuration

    var spaceColor = '#003c66'; // #09046a

    var delay = 0,
        duration = 5000,
        shapeShiftEasing = 'cubic-in',
        colorShiftEasing = 'quad-out';

    var textHideDuration = 100,
        textHideEasing = 'quad-in';

    var hideDuration = 2000;

    var shadowXOffset = 1.5, //1.5,
        shadowYOffset = 0.5, //0.5,
        shadowSizeFactor = 1.15, //1.15,
        shadowColor = 'rgb(50, 80, 80)',
        shadowOpacity = 0.1;

    var withSunBurn = true,
        sunBurnSize = 1.22;

    function addPlanets(root, logoRef, config, width, height) {

        // Load required values from the shapes of original logo

        var sunInitial, neptuneInitial, textInitial;

        var logoWidth, logoHeight,
            logoViewBoxWidth, logoViewBoxHeight;

        d3.select(logoRef).call(function(logoRef) {
            sunInitial = logoRef.select(LOGO_SUN_REF);
            neptuneInitial = logoRef.select(LOGO_NEPTUNE_REF);
            textInitial = logoRef.select(LOGO_TEXT_REF);

            logoWidth = parseInt(logoRef.attr('width'));
            logoHeight = parseInt(logoRef.attr('height'));

            var viewBox = logoRef.attr('viewBox').split(' ');
            logoViewBoxWidth = viewBox[2];
            logoViewBoxHeight = viewBox[3];
        });

        // Bulding planets' gradients

        var defs = d3.select(root).append('defs');

        var gradients = [];
        var stop_distribution = ['0%', '60%', '100%'];

        defs.selectAll('radialGradient')
            .data(planets)
            .enter().append('radialGradient')
            .attr('id', function(planet) { return 'gradient-' + planet.name; })
            .classed('planet-gradient', true)
            .attr('gradientUnits', 'objectBoundingBox')
            .attr('cx', '0')
            .attr('cy', '0')
            .attr('r', '100%')
            .each(function() {
                d3.select(this).selectAll('stop')
                  .data(function(planet) { return planet.colors; })
                  .enter().append('stop')
                  .attr('offset', function(color, i) { return stop_distribution[i]; })
                  .attr('stop-color', 'black')
                  .attr('stop-opacity', 1)
            });

        if (withSunBurn) {
            defs.append('radialGradient')
                .attr('id', 'sun-burn-gradient')
                .attr('gradientUnits', 'objectBoundingBox')
                .attr('cx', '50%').attr('cy', '50%')
                .attr('fx', '50%').attr('fy', '50%')
                .attr('r', '50%')
                .call(function(gradient) {
                   gradient.append('stop')
                      .attr('offset', '0%')
                      .attr('stop-color', spaceColor)
                      .attr('stop-opacity', 0);
                    gradient.append('stop')
                      .attr('offset', '72%')
                      .attr('stop-color', '#f00e1a')
                      .attr('stop-opacity', 0)
                    gradient.append('stop')
                      .attr('offset', '85%')
                      .attr('stop-color', '#f00e1a')
                    gradient.append('stop')
                      .attr('offset', '90%')
                      .attr('stop-color', '#f96e22')
                    gradient.append('stop')
                      .attr('offset', '93%')
                      .attr('stop-color', '#fda42b')
                    gradient.append('stop')
                      .attr('offset', '100%')
                      .attr('stop-color', spaceColor)
                      .attr('stop-opacity', 0)
                    gradient.append('stop')
                      .attr('offset', '100%')
                      .attr('stop-color', spaceColor)
                      .attr('stop-opacity', 0);
                });
        }

        // Prepare data for planet's animation

        var startValues = planets.map(function(planet) {
            return {
               x: (planet.name !== 'Neptune') ? (sunInitial.attr('cx') / logoViewBoxWidth * logoWidth)
                                              : (neptuneInitial.attr('cx') / logoViewBoxWidth * logoWidth),
               y: (planet.name !== 'Neptune') ? (sunInitial.attr('cy') / logoViewBoxHeight * logoHeight)
                                              : (neptuneInitial.attr('cy') / logoViewBoxHeight * logoHeight),
               r: (planet.name !== 'Neptune') ? (sunInitial.attr('r') / logoViewBoxWidth * logoWidth)
                                              : (neptuneInitial.attr('r') / logoViewBoxWidth * logoWidth),
               strokeWidth: (planet.name !== 'Neptune') ? 0 : (neptuneInitial.attr('stroke-width') / logoViewBoxWidth * logoWidth),
               strokeColor: (planet.name !== 'Neptune') ? 'rgba(66, 66, 66, 1)' : 'white'
           };
        });

        var step = width / (planets.length - 1);
        var proportion = logoHeight / planets[5].size * 0.47; //0.6; //* 0.85;

        var endValues = planets.map(function(planet, i) {
            return {
                x: (planets.length - i/* + 1*/ - 1) * step,
                y: startValues[i].y,
                r: (planet.size * proportion) / 2,
                strokeWidth: 0.75,
                strokeColor: (planet.name !== 'Neptune') ? startValues[i].strokeColor : 'white'
            };
        });

        var planetOffset = step / 2/*(neptuneInitial.attr('cx') / logoViewBoxWidth * logoWidth) + 7*/;

        function startValue(name) { return function(planet, i) { return startValues[i][name]; } };
        function startValueAnd(name, f) { return function(planet, i) { return f(startValues[i][name]); } };
        function endValue(name) { return function(planet, i) { return endValues[i][name]; } };
        function endValueAnd(name, f) { return function(planet, i) { return f(endValues[i][name]); } };

        var universe = d3.select(root).append('g').attr('id', 'universe');

        // Add background

        d3.select(universe.node()).append('rect')
          .attr('width', width).attr('height', height)
          .attr('fill', 'white')
          .attr('fill-opacity', 0);

        // Add planets in their initial state

        d3.select(universe.node()).selectAll('g')
          .data(planets)
          .enter().append('g').classed('planet', true)
          .attr('id', function(planet) { return planet.name; })
          .call(function(group) {
              group.append('circle').classed('back', true)
                   .attr('cx', startValue('x'))
                   .attr('cy', startValue('y'))
                   .attr('r', startValue('r'))
                   .attr('fill', 'white')
                   .attr('fill-opacity', 0);
              group.append('circle').classed('front', true)
                   .attr('cx', startValue('x'))
                   .attr('cy', startValue('y'))
                   .attr('r', startValue('r'))
                   .attr('fill', function(planet) { return 'url(#gradient-' + planet.name + ')'; })
                   .attr('stroke', startValue('strokeColor'))
                   .attr('stroke-width', startValue('strokeWidth'));
          });

        if (withSunBurn) {
            d3.select(root).select('g.planet#Sun')
              .append('circle')
              .attr('id', 'sun-burn')
              .attr('cx', startValue('x'))
              .attr('cy', startValue('y'))
              .attr('r', startValueAnd('r', function(r) { return r * sunBurnSize; }))
              .attr('fill', 'url(#sun-burn-gradient)')
              .attr('fill-opacity', 0);
        }

        // Add "Horizon" line

        d3.select(universe.node()).insert('line', 'g.planet#' + planets[1].name)
          .attr('id', 'horizon')
          .attr('x1', 0).attr('y1', height / 2)
          .attr('x2', width).attr('y2', height / 2)
          .attr('stroke', 'white')
          .attr('stroke-opacity', 0)
          .attr('stroke-width', 2.5);

        // Return function which makes everything move

        return function() {

            // Hide initial shapes

            sunInitial.transition().delay(delay).duration(hideDuration)
                      .attr('fill-opacity', 0);
            neptuneInitial.transition().delay(delay).duration(hideDuration)
                      .attr('fill-opacity', 0)
                      .attr('stroke-opacity', 0);

            // Make "horizon" appeared

            d3.select(root).select('g#universe line#horizon')
              .transition().delay(delay).duration(duration * 0.75).ease(shapeShiftEasing)
              .attr('stroke-opacity', 0.3)
              .attr('stroke-width', 3)
              .transition().duration(duration * 0.25).ease(shapeShiftEasing)
              .attr('stroke-opacity', 0.1)
              .attr('stroke-width', 1.5);

            // Make background change color to something spacey

            d3.select(root).select('g#universe > rect')
              .transition().delay(delay).duration(duration).ease(shapeShiftEasing)
              .attr('fill-opacity', 1)
              .attr('fill', spaceColor);

            // Move shapes of the planets

            d3.select(root).selectAll('g.planet > circle.front')
              .transition().duration(duration).delay(delay).ease(shapeShiftEasing)
              .attr('r', endValue('r'))
              .attr('cx', endValueAnd('x', function(x) { return x + planetOffset; }))
              .attr('cy', endValue('y'))
              .attr('stroke', endValue('strokeColor'))
              .attr('stroke-width', endValue('strokeWidth'));

            // Move shadows of the planets

            d3.select(root).selectAll('g.planet > circle.back')
              //.transition('foo').duration(duration).ease(shadowColorEasing)
              .transition().delay(delay).duration(duration).ease(shapeShiftEasing)
              .attr('fill', shadowColor)
              .attr('fill-opacity', shadowOpacity)
              .attr('r', endValueAnd('r', function(r) { return r * shadowSizeFactor; }))
              .attr('cx', endValueAnd('x', function(x) { return x + planetOffset + shadowXOffset; }))
              .attr('cy', endValueAnd('y', function(y) { return y + shadowYOffset; }));

            // Animate planet's gradients

            d3.select(defs.node()).selectAll('radialGradient.planet-gradient')
              .each(function(planet, i) {
                  d3.select(this).selectAll('stop').each(function() {
                      d3.select(this)
                        .transition().delay(delay).duration(duration).ease(colorShiftEasing)
                        .attr('stop-color', function(toColor) { return toColor; });
                  });
              });

            // ...And burning sun

            if (withSunBurn) {
                d3.select(root).select('g.planet#Sun #sun-burn')
                       .transition().delay(delay).duration(duration).ease(shapeShiftEasing)
                       .attr('r', endValueAnd('r', function(r) { return r * sunBurnSize; }))
                       .attr('cx', endValueAnd('x', function(x) { return x + planetOffset; }))
                       .attr('cy', endValue('y'))
                       .attr('fill-opacity', 0.8);
            }

        };
    }

    d3.select('#rpd-logo path').attr('fill-opacity', 1);

    d3.select('#rpd-logo path')
      .transition().duration(textHideDuration).ease(textHideEasing)
      .attr('fill-opacity', 0)
      .each('end', function() {
          var animate = addPlanets(planetsNode, logoNode, config, width, height);
          animate();
      });

}
