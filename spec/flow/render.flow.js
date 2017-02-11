/* @flow */

import Rpd from '../../rpd';

let twoDivs: Array<HTMLElement> = [ document.createElement('div'),
                                    document.createElement('div') ];

Rpd.renderNext('html', '#some-id');
Rpd.renderNext('html', document.createElement('div'));
Rpd.renderNext([ 'html', 'svg' ], '#some-id');
Rpd.renderNext('svg', twoDivs);
Rpd.renderNext('html', '#some-id', {});
Rpd.renderNext('html', '#some-id', {
    // TODO
});
Rpd.renderNext('html', '#some-id', {});
Rpd.renderNext('html', '#some-id', {
    valuesOnHover: true
});
Rpd.stopRendering();

Rpd.addPatch('Foobar').render('html', '#some-id');
Rpd.addPatch('Foobar').render('html', document.createElement('div'));
Rpd.addPatch('Foobar').render([ 'html', 'svg' ], '#some-id');
Rpd.addPatch('Foobar').render('svg', twoDivs);
Rpd.addPatch('Foobar').render('html', '#some-id', {})
Rpd.addPatch('Foobar').render('html', '#some-id', {
    valuesOnHover: true
});
Rpd.addPatch('Foobar').render('html', '#some-id', function() {
    return {};
});
Rpd.addPatch('Foobar').render('html', '#some-id', function() {
    return {
        title: 'Foobar',
        handle: {
            'patch/open': function() {}
        }
    };
});
const patch : Rpd.Patch = Rpd.addPatch('Foobar');
patch.moveCanvas(10, 20)
     .open(Rpd.addPatch())
     .resizeCanvas(100, 200)
     .close();
patch.addNode('core/any').move(10, 20).turnOff();
