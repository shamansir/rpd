/* @flow */

import Rpd from '../../rpd';
import Kefir from 'kefir';

const patch : Rpd.Patch = Rpd.addPatch('Foo');
const node1 : Rpd.Node = patch.addNode('core/any');
const node2 : Rpd.Node = patch.addNode('core/any');

const outlet: Rpd.Outlet = node1.addOutlet('core/any', 'foo4');
const inlet: Rpd.Inlet = node2.addInlet('core/any', 'foo1');

// $ExpectError
outlet.stream(2);
// $ExpectError
outlet.stream({});
// $ExpectError
outlet.stream('AA');

outlet.stream(Kefir.never());
outlet.stream(Kefir.later(100, 'a'));
outlet.stream(Kefir.sequentially(100, [ 2, 3 ]));
outlet.stream(Kefir.constant(0));
outlet.toDefault();

inlet.receive(2);
inlet.receive({});

// $ExpectError
inlet.stream(2);
// $ExpectError
inlet.stream({});
// $ExpectError
inlet.stream('AA');

inlet.stream(Kefir.never());
inlet.stream(Kefir.later(100, 'a'));
inlet.stream(Kefir.sequentially(100, [ 2, 3 ]));
inlet.stream(Kefir.constant(0));
inlet.toDefault();

inlet.receive(2);
inlet.receive({});
