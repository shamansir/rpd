/* @flow */

import Rpd from '../../rpd';

Rpd.renderNext('html', '#some-id');
Rpd.renderNext('html', document.body);
Rpd.renderNext([ 'html', 'svg' ], '#some-id');
//Rpd.renderNext('svg', [ document.body, document.body ]);
Rpd.renderNext('html', '#some-id', {});
Rpd.renderNext('html', '#some-id', {
    // TODO
});
Rpd.renderNext('html', '#some-id', function() {
    return {};
});
Rpd.renderNext('html', '#some-id', function() {
    return {
        // TODO
    };
});
Rpd.stopRendering();

Rpd.addPatch('Foobar').render('html', '#some-id');
Rpd.addPatch('Foobar').render('html', document.body);
Rpd.addPatch('Foobar').render([ 'html', 'svg' ], '#some-id');
//Rpd.addPatch('Foobar').render('svg', [ document.body, document.body ]);
Rpd.addPatch('Foobar').render('html', '#some-id', {})
Rpd.addPatch('Foobar').render('html', '#some-id', {
    // TODO
});
Rpd.addPatch('Foobar').render('html', '#some-id', function() {
    return {};
});
Rpd.addPatch('Foobar').render('html', '#some-id', function() {
    return {
        // TODO
    };
});
const patch : Rpd.Patch = Rpd.addPatch('Foobar');
patch.moveCanvas(10, 20)
     .open(Rpd.addPatch())
     .resizeCanvas(100, 200)
     .close();
patch.addNode('core/any').move(10, 20).turnOff();
