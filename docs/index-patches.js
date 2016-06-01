function applyCodeExample1() {
    Rpd.renderNext('svg', document.getElementById('example-one'),
                   { style: 'compact-v',
                     nodeMovingAllowed: false });

    var rgPatch = Rpd.addPatch('Generate Random Numbers');

    var rgMetroNode = rgPatch.addNode('util/random', 'Random');

    var rgRandomNode = rgPatch.addNode('util/random', 'Random');
    rgRandomNode.inlets['max'].receive(500);

    rgMetroNode.outlets['out'].connect(rgRandomNode.inlets['bang']);

    //rgMetroNode.inlets['period'].receive(3000);

    //var logNode = rgPatch.addNode('util/log', 'Log');
    //rgNode.outlets['out'].connect(logNode.inlets['what']);

    var multiplyTwo = rgPatch.addNode('core/basic', '* 2', {
        process: function(inlets) {
            return {
                'result': (inlets.multiplier || 0) * 2
            }
        }
    });
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
