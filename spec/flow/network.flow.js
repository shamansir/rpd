/* @flow */

import Rpd from '../../rpd';

// no name
const patch1: Rpd.Patch = Rpd.addPatch('foo');
const patch2: Rpd.Patch = Rpd.addPatch('foo', 'The Patch');

const node1 : Rpd.Node = patch1.addNode('core/any');
const node2 : Rpd.Node = patch2.addNode('core/any', 'Name');

const inlet1: Rpd.Inlet = node1.addInlet('core/any', 'foobar');



