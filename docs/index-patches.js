function applyCodeExample1() {
    Rpd.renderNext('svg', document.getElementById('example-one'),
                   { style: 'compact-v',
                     nodeMovingAllowed: false });

    var rgPatch = Rpd.addPatch('Generate Random Numbers');

    var rgNode = rgPatch.addNode('util/random', 'Random');
    rgNode.inlets['max'].receive(500);
    rgNode.inlets['period'].receive(3000);

    var logNode = rgPatch.addNode('util/log', 'Log');
    rgNode.outlets['out'].connect(logNode.inlets['what']);

    var multiplyTwo = rgPatch.addNode('core/basic', '* 2', {
        process: function(inlets) {
            return {
                'result': (inlets.multiplier || 0) * 2
            }
        }
    });
    var multiplierInlet = multiplyTwo.addInlet('util/number', 'multiplier');
    var resultOutlet = multiplyTwo.addOutlet('util/number', 'result');

    rgNode.outlets['out'].connect(multiplierInlet);
}

function applyRpdLogoPatch(logoElm, patchElm) {

    //Rpd.renderNext('svg', patchElm, { style: 'quartz' });

    //Rpd.addPatch('test');

    //Rpd.addNode('core/basic', 'Foo');

    //alert('Rpd: ' + Rpd);
    //alert('applyRpdLogoPatch ' + logoElm + ' ' + patchElm);
}

applyCodeExample1();
applyRpdLogoPatch(document.getElementById('large-logo'),
                  document.getElementById('rpd-logo-patch'));
