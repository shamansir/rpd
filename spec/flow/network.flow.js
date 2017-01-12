/* @flow */

import Rpd from '../../rpd';

const patch1: Rpd.Patch = Rpd.addPatch('Patch 1 Title');
const patch2: Rpd.Patch = Rpd.addPatch('Patch 2 Title', {});
const patch3: Rpd.Patch = Rpd.addPatch('Patch 3 Title', {
    handle: {
        'patch/open': function() {}
    }
});

const patch4: Rpd.Patch = Rpd.addClosedPatch('Patch 4 Title');
const patch5: Rpd.Patch = Rpd.addClosedPatch('Patch 5 Title', {});
const patch6: Rpd.Patch = Rpd.addClosedPatch('Patch 6 Title', {
    handle: {
        'patch/open': function() {}
    }
});

patch2.open(patch1);
patch3.close();

const node1 : Rpd.Node = patch1.addNode('core/any');
const node2 : Rpd.Node = patch2.addNode('core/any', 'Name');
const node3 : Rpd.Node = patch3.addNode('core/any', 'Name');
const node4 : Rpd.Node = patch4.addNode('core/any', 'Name', {});
const node5 : Rpd.Node = patch5.addNode('core/any', 'Name', {
    // TODO
});

node1.turnOn();
node1.turnOff();

patch4.project(node3);
patch5.removeNode(node5);

const inlet1: Rpd.Inlet = node1.addInlet('core/any', 'foobar');



