/* @flow */

import Rpd from '../../rpd';

const patch1: Rpd.Patch = Rpd.addPatch('Patch 1 Title');
const patch2: Rpd.Patch = Rpd.addPatch('Patch 2 Title', {});
const patch3: Rpd.Patch = Rpd.addPatch('Patch 3 Title', {
    handle: {
        'patch/open': function() {}
    }
});
const patch4: Rpd.Patch = Rpd.addPatch('Patch 4 Title', function() {
    return { };
});
const patch5: Rpd.Patch = Rpd.addPatch('Patch 5 Title', function() {
    return {
        handle: {
            'patch/open': function() {}
        }
    }
});

const patch6: Rpd.Patch = Rpd.addClosedPatch('Patch 6 Title');
const patch7: Rpd.Patch = Rpd.addClosedPatch('Patch 7 Title', {});
const patch8: Rpd.Patch = Rpd.addClosedPatch('Patch 8 Title', function() {
    return { };
});
const patch9: Rpd.Patch = Rpd.addClosedPatch('Patch 9 Title', {
    handle: {
        'patch/open': function() {}
    }
});

patch2.open(patch1);
patch3.close();

const node1 : Rpd.Node = patch1.addNode('core/any');
const node2 : Rpd.Node = patch2.addNode('core/any', 'Node 2');
const node3 : Rpd.Node = patch3.addNode('core/any', 'Node 3');
const node4 : Rpd.Node = patch4.addNode('core/any', 'Node 4', {});
const node5 : Rpd.Node = patch5.addNode('core/any', 'Node 5', {
    // TODO
});
const node6 : Rpd.Node = patch5.addNode('core/any', 'Node 6', function() {
    return {};
});
const node7 : Rpd.Node = patch5.addNode('core/any', 'Node 7', function() {
    return {
        // TODO
    };
});

node1.turnOn();
node1.turnOff();

patch4.project(node3);
patch5.removeNode(node5);

const inlet1: Rpd.Inlet = node1.addInlet('core/any', 'Inlet 1');
const inlet2: Rpd.Inlet = node1.addInlet('core/any', 'Inlet 2', {});
const inlet3: Rpd.Inlet = node1.addInlet('core/any', 'Inlet 3', {
    // TODO
});
const inlet4: Rpd.Inlet = node1.addInlet('core/any', 'Inlet 4', function() {
    return {};
});
const inlet5: Rpd.Inlet = node1.addInlet('core/any', 'Inlet 5', function() {
    return {
        // TODO
    };
});

const outlet1: Rpd.Outlet = node1.addOutlet('core/any', 'Outlet 1');
const outlet2: Rpd.Outlet = node1.addOutlet('core/any', 'Outlet 2', {});
const outlet3: Rpd.Outlet = node1.addOutlet('core/any', 'Outlet 3', {
    // TODO
});
const outlet4: Rpd.Outlet = node1.addOutlet('core/any', 'Outlet 4', function() {
    return {};
});
const outlet5: Rpd.Outlet = node1.addOutlet('core/any', 'Outlet 5', function() {
    return {
        // TODO
    };
});

// $ExpectError
patch2.inputs([ 'aaa' ]);
// $ExpectError
patch2.outputs([ 'aaa' ]);

patch2.inputs([ inlet1, inlet2 ]);
patch2.outputs([ outlet1, outlet2 ]);

// $ExpectError
patch2.inputs([ outlet1, outlet2 ]);
// $ExpectError
patch2.outputs([ inlet1, inlet2 ]);

node1.removeInlet(inlet1);
node1.removeInlet(inlet2);

// $ExpectError
node1.removeInlet(outlet1);
// $ExpectError
node1.removeOutlet(inlet1);

const bool: boolean = inlet3.allows(outlet1);
const link: Rpd.Link = outlet1.connect(inlet3);
outlet1.disconnect(link);

link.enable();
link.disable();
link.disconnect();

// $ExpectError
outlet1.disconnect();
// $ExpectError
outlet1.allows(inlet3);
// $ExpectError
inlet3.connect(outlet1);


