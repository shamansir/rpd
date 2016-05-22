function buildUtilDemoPatch(renderer, target, conf) {

    var model = Rpd.addPatch().render(renderer, target, conf);

    var genA = model.addNode('core/basic', 'Generate A');
    var outA = genA.addOutlet('util/number', 'A');

    var genA = model.addNode('core/basic', 'Generate B');
    var outB = genA.addOutlet('util/number', 'B', { 'default': 1 });

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

    var nodeList = model.addNode('util/nodelist');
    nodeList.move(550, 30);

    model.addNode('util/color').move(270, 200);

    var bounded = model.addNode('util/bounded-number');
    bounded.inlets['max'].receive(255);
    bounded.move(60, 240);

    var comment = model.addNode('util/comment');
    comment.inlets['text'].receive('connect bounded number node \'out\' to any inlet of color node');
    comment.inlets['width'].receive(130);
    comment.move(180, 340);

}
