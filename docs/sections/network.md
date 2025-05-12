---
title: Building a Patch Network
id: network
level: 1
---

No matter, have you [compiled](./setup.html#Compilation) your own customized version of RPD, or have you [downloaded](./setup.html#Download) the version with default options, you are ready to build a Patch network. Just ensure that you've included all the required Styles, Toolkits and Modules into your page, this process is also covered in the [Setup section](./setup.html).

<!-- Here's an example of a very simple patch, just to give you an idea on how easy it is to build one:

```html
<div id="patch-target"></div>
<script>
    var targetElement = document.getElementById('patch-target');
    var patch = Rpd.render('svg', targetElement, { style: 'quartz' });
    var randomNode = patch.addNode('util/random', 'Random');
    var numberNode = patch.addNode('util/number', 'Number');
    randomNode.outlets['random'].connect(numberNode.inlets['in']);
    randomNode.inlets['min'].receive(10);
    randomNode.inlets['max'].receive(Kefir.repeat(function() {
        return Kefir.sequentially(1000, [100, 1000, 10000]);
    })); // will sequence 100, 1000, 10000, 100, 1000, 1000, ... sending new value every second
</script>
```

But of course that's not everything RPD capable of — there are much, much more possibilities covered below, and they may help you build very complex Patches. -->

> NB: All the updates inside the Network are based on purely functional code, so there are no actual data modifications performed, only signals are sent. Among other useful things, it allows to easily record and restore things. Your code could be imperative, if you decide, but you should not modify the Network inner structure if you plan to share the code with others.

### Setup Rendering

You have to have some target DOM element to render your Patch into. So, first,
there should be the one accessible to the RPD code. It could be a `div`:

```html
<body>
    <div id="patch-target"></div>
</body>
```

Anywhere below (or when `body.onload` or `document.onDocumentReady` event was fired), you may start writing the code to build the RPD network:

```html
<body>
    <div id="patch-target"></div>
    <script>
        var targetElement = document.getElementById('patch-target');
        // use SVG Renderer with Quartz Style to render into div#patch-target,
        // also configure Renderer to allow multiple connections to inlets
        // (only single connection is allowed by default)
        Rpd.renderNext('svg', targetElement, { style: 'quartz',
                                               inletAcceptsMultipleLinks: true });

        // Network creation code
    </script>
</body>
```

The `renderNext` method assumes that everything later on, unless it meets another `renderNext` definition, will be rendered to the specified target and following specified options. You also may want to render a particular patch to a particular target with particular renderer, there's a `patch.render` method existing specially for that, and it accepts exactly the same arguments, but you need to create a Patch to use it, and we haven't covered it yet.

### Rendering Configuration

Options passed to `renderNext` or `patch.render` could belong to one particular Renderer, but Renderers supplied with RPD tend to use a generalized set of options:

* `style` — the only required option, sets the [style](./setup.html#styles-and-renderers) used to visualize nodes; you need to ensure to [include this Style code](./setup.html#compilation-options) in your RPD version or else this option will fail;
* `fullPage` — (`false`) if `true`, network takes the full page, so the target element will be resized to match browser window size when it was resized by user;
* `nodeMovingAllowed` — (`true`) are nodes allowed to be dragged or should they be immovable;
* `inletAcceptsMultipleLinks` — (`false`) could several outlets connect to the same inlet;
* `linkForm` — (`'line'`) connect inlets to outlets with straight lines or nice curves (set to `'curve'`), curves could not be rendered with HTML renderer, also only certain styles support them (_`quartz`_, _`compact`_, _`compact-v`_); _`black-white`_ is the only style that supports `pipe` form of the link;
* `valuesOnHover` — (`false`) show inlet/outlet value only when user hovers over its connector (values are always shown, by default);
* `closeParent` — (`false`) when user opens a projected sub-patch, automatically close its parent patch;
* `effectTime` — (`1000`) milliseconds to show the value update effect on the connector
* `showTypes` — (`false`) show inlet/outlet types for debugging purposes;
* `showBoxes` — (`false`) show node bounding for debugging purposes;
* `logErrors` — (`true`) write all the happening system-wide errors to the console, if it exists;

Further on let's assume that you write subsequent code below those two lines:

```javascript
var targetElement = document.getElementById('patch-target');
Rpd.renderNext('svg', targetElement, { style: 'quartz',
                                       inletAcceptsMultipleLinks: true });

// Creating a Patch, Adding Nodes, ...
```

> NB: When `fullPage` is set to `false`, Renderer is usually unaware of the required canvas height, so you need to call `patch.resizeCanvas` for every new Patch, as soon as possible after the corresponding `Rpd.renderNext` or `patch.render` call.

### Creating a Patch

> NB: If you what to know what exactly all the terms like _Patch_, _Node_, _Inlet_, _Outlet_, _Link_ mean in context of RPD, see [Terminology sub-section on the Main page](../index.html#terminology).

Patch is a collection and topology of connected Nodes.

And creating a Patch is super-easy:

```javascript
var patch = Rpd.addPatch();
```

or, a named Patch:

```javascript
var patch = Rpd.addPatch('My Patch');
```

<!-- TODO: closed patches and canvases -->

### Adding Nodes

Adding nodes is also super-easy in a default form:

```javascript
var untitledUtilNode = patch.addNode('util/random');
var untitledCustomNode = patch.addNode('my-toolkit/my-node-type');
var titledCustomNode = patch.addNode('my-toolkit/my-node-type', 'My Node');
```

At least, you need to specify a type of the Node you want to create. Type determines how many inlets/outlets new Node will have, their names and types, and the way (algorithm) it will use to process incoming data before sending it to other nodes. Or, type may determine that this Node won't change the data and just pass it through, but visualize it in some way.

For example, all the Nodes with type `util/random` always have two inlets, `min` and `max` (both accept only numbers), and one outlet named `random`. You are free to add other inlets or outlets to any instance of any type, though. When one of the inlets gets new value, Node with `util/random` type generates new random number laying between the requested bounds and immediately sends it to the `random` outlet. Renderer of the `util/random` type ensures that last four generated numbers are also shown in the body of every such Node.

New nodes are positioned in the free space automatically, though the placing algorithm is intentionally not perfect, to keep it simple, so you have the ability to force-move the created node to the desired place if you don't like what machine suggested for you:

```javascript
patch.addNode('my-toolkit/my-node-type')
     .move(100 /* x */, 150 /* y */); // in pixels for HTML, or SVG units
```

<!-- But nodes also could have options you may find useful. These options are passed as an object:

```javascript

```

* -->

Actually, you may define a new type for a Node anywhere above the place it is created. Having a Renderer for a Node type is absolutely optional:

```javascript
var patch = Rpd.addPatch('My Patch');
Rpd.nodetype('custom/type', {
    inlets: { 'in': { type: 'core/any' } },
    outlets: { 'out': { type: 'core/any' } }
});
patch.addNode('custom/type').move(20, 20);
```

> NB: I really know how could it be tempting to name your Outlet `out`, just like in this example, but please avoid that in any case, may be only excluding the cases when your Inlet is called `in`. Always try to find a better alias for an Outlet, especially when it's just a single Outlet of the Node. If there's no documentation for a Toolkit (and there's none for the moment), user should be able to imagine the alias without inspecting code or variable. At least to try. Usually output inlets are named similarly to the type, or if they produce something processed, alias represents how exactly values are transformed, like `random` Outlet of type `util/number` in `util/random` Node.

<!-- TODO: embedded example -->

For a complete list of properties could be used to define a Node, see [Node Definition](./api.html#node-definition) in [API section](./api.html). Also see [Defining Node Type](./toolkits.html#defining-node-type) and [Writing a Renderer for a Node](./toolkits.html#writing-node-renderer) chapters in [Toolkits section](./toolkits.html) if you want to create bundles of your Node types, called _Toolkits_.

### Connecting Nodes

Nodes process data that came inside through Inlets and then send processed data through their Outlets to Inlets of the other nodes. The connection between Outlet of one node and Inlet of another node is called Link. User may connect one Outlet to several Inlets, and also, if it's allowed by configuration (usually not), connect several Outlets to one Inlet. But this rules are controlled only by Renderer, in the code you may connect outlets to inlets as many times as you want, so you should control existing connections by yourself.

<!-- TODO: some picture about how the process goes -->

Some nodes have no Inlets, and that's ok, since they probably have some initial state and/or default values for Inlets and/or hidden inlets (a bit later about it). Some nodes may have no outlets if they send nothing, and that's also completely ok!

Nodes may have any number of Inlets and any number of Outlets defined in their type and also may have any number of Inlets and any number of Outlets attached by you to the instance of the Node.

Type-defined Inlets and Outlets are accessible through `node.inlets` and `node.outlets` properties:

```javascript
var knob = patch.addNode('util/knob', 'Number');
var color = patch.addNode('util/color', 'Color');
knob.outlets['number'].connect(color.inlets['r']);
```

Disconnecting is also very easy:

```javascript
var link = knob.outlets['number'].connect(color.inlets['r']);
...
link.disconnect();
```

Also, you may temporary disable the link and then enable it later, when you don't want to remove the connection completely. When link is disabled, it skips all the updates coming through, but still exists. So this way link will be shown to the user, but will be greyed out:

```javascript
var link = knob.outlets['number'].connect(color.inlets['r']);
...
link.disable();
...
link.enable();
```

There is also a possibility to create custom Nodes just in place by adding Inlets and Outlets of any type to a `core/basic` Node:

```javascript
// through redefining Node instance:
var myNode = patch.addNode('core/basic', 'My Node', {
    inlets: {
        foo: { type: 'core/any', 'default': 0 },
        bar: { type: 'core/any' }
    },
    outlets: {
        out: { type: 'core/any' }
    }
    process: function(inlets) {
        return { out: (inlets.foo || 0) + (inlets.bar || 0) }
    }
});
knob.outlets['number'].connect(myNode.inlets['foo']);

// through adding inlets/outlets to the instance
var myNode = patch.addNode('core/basic', 'My Node', {
    process: function(inlets) {
        return { out: (inlets.foo || 0) + (inlets.bar || 0) }
    }
});
var fooInlet = myNode.addInlet('core/any', 'foo', { 'default': 0 });
var barInlet = myNode.addInlet('core/any', 'bar');
var outlet = myNode.addOutlet('core/any', 'out');
knob.outlets['number'].connect(fooInlet);
```

Actually, you also may add Inlets and Outlets to any instance of the Node of any type using `node.addInlet`/`node.addOutlet`, but it probably has no sense, since such Nodes usually have inner processing logic hardly bound to what is inside.

<!-- Inlets and Outlets which were added directly to the instance and not through the Type Definition (the way Toolkits usually define them), are _not_ stored this way,but you may receive an instance of such just when you use `addInlet` or `addOutlet` method:

```javascript
var myRandomGeneratorNode = patch.addNode('core/basic', 'My Random 0-255', {
    process: function() {
        if (inlets.bang) {
            return { 'random': Math.floor(Math.random() * 256) };
        }
    }
});
var randomOutlet = myRandomGeneratorNode.addOutlet('util/number', 'random');
var bangInlet = myRandomGeneratorNode.addInlet('util/bang', 'bang');
// send bang signal every second to the inlet
bangInlet.stream(Kefir.interval(1000, {}));
var colorNode = patch.addNode('util/color', 'Color');
var alphaInlet = color.addInlet('util/wholenumber', 'a');
randomOutlet.connect(alphaInlet);
```

On the other hand, code above works exactly same way as the next one, the only difference is in the fact that Inlets and Outlets in this example are defined before the specific Node instance was created:

```javascript
var myRandomGeneratorNode = patch.addNode('core/basic', 'My Random 0-255', {
    inlets: { 'bang': { type: 'util/bang' } },
    outlets: { 'random': { type: 'util/number' } },
    process: function(inlets) {
        if (inlets.bang) {
            return { 'random': Math.floor(Math.random() * 256) }
        }
    }
});
var randomOutlet = myRandomGeneratorNode.outlets['random'];
var bangInlet = myRandomGeneratorNode.inlets['bang'];
// send bang signal every second to the inlet
bangInlet.stream(Kefir.interval(1000, {}));
// clone `inlets` definition not to modify inlets for all instances
// of that type, but just for this particular instance
colorTypeInlets = Object.create(Rpd.allNodeTypes['util/color'].inlets);
colorTypeInlets['a'] = { type: 'util/wholenumber', 'default': 255 };
var colorNode = patch.addNode('util/color', 'Color', {
    inlets: colorTypeInlets
});
var alphaInlet = colorNode.inlets['a'];
randomOutlet.connect(alphaInlet);
``` -->

In UI, user commonly starts creating a Link from the Outlet and finishes it on the Inlet. That's same for your code. You get the Outlet instance (defined by type or added by you) and connect it to the Inlet instance (defined by type or added by you).

<!-- Once again, if you want to know all the properties Node types or instances could have, see [Node Definition](./api.html#node-definition) in [API section](./api.html). -->

You may notice that Inlets and Outlets also have their own types. Their type determines which data they may accept, connections of which type they allow, how they present the data to the user or how they transform it before sending it to the Node.

Same way as for the Nodes, Channel (Inlets and Outlets together are called Channels in RPD) type may be defined just before Channel usage.

```javascript
var customNode = patch.addNode('custom/node-type', 'Foo');
Rpd.channeltype('custom/channel-type', {
    accept: function(value) {
        return (value >= 0) && (value <= 255);
    }
});
customNode.addInlet('custom/channel-type', 'foo');
customNode.addOutlet('custom/channel-type', 'bar');
Rpd.nodetype('custom/another-node-type', {
    inlets: {
        'in': { type: 'custom/channel-type' }
    }
});
```

Node types and Channel Types may intersect, for example there is `util/color` Channel which operates with objects in a form of `{ r: 255, g: 255, b: 255 }` and `util/color` Node, which has Inlets `r`, `g` and `b` of type `util/wholenumber` and outputs color in the Outlet of type `util/color`. Also, the Node includes rectangle filled with current color in its body.

For a complete list of properties could be used to define an Inlet or Outlet, see [Channel Definition](./api.html#channel-definition) in [API section](./api.html). As well as [Writing a Renderer for a Channel](./toolkits.html#writing-channel-renderer). Also see [Defining Channel Type](./toolkits.html#defining-node-type) and [Writing a Renderer for a Channel](./toolkits.html#writing-channel-renderer) chapters in [Toolkits section](./toolkits.html) if you want to create bundles of your Node and/or Channel types, called _Toolkits_.

### Sending Data

To send your own data to an Inlet, you may use its `receive` method. There's no requirement for this inlet to be connected to anything, but if it is indeed connected, you'll just insert your update in it's established data flow.

```javascript
var randomNode = patch.addNode('util/random');
randomNode.inlets['max'].receive(256);
var colorNode = patch.addNode('util/color', 'Color');
randomNode.outlets['random'].connect(colorNode.inlets['g']);

randomNode.inlets['bang'].receive({}); // trigger generating random number
setTimeout(function() {
    // trigger generating random number once again after a second
    randomNode.inlets['bang'].receive({});
}, 1000);
```

To send some data from an outlet, use it's `send` method. You might want it to be connected to something before. The data then will flow through all the connections until the end of the wire or until some Node on the way will interrupt it.

```javascript
// override the output and send 1000 from Random Generator Node
randomNode.outlets['random'].send(1000);
```

> NB: When you send data to some Inlet, data is first transformed according to Inlet type, if there was such transformation requested. So the Node may receive and may want to receive a bit different data than you've sent to the Inlet. On the other hand, Outlets usually do not transform data and just send them out. So, the law is, always prefer sending data to the Inlets of the Node, since Inlets insert data into the Node processing flow, as it expects it to be received. Or, even better in the cases you do same thing several times, find or define a transformation Node type which will send the data you want and will be re-usable.

Of course you may use `inlet.receive` or `outlet.send` in any moment after the corresponding Inlet or Outlet was created. If you want, use `setTimeout` to postpone the update or `setInterval` to send value each period of time. But I have a better suggestion for you.

You may schedule the updates using the Stream approach. Streams are sequences of data distributed over time, and they are the major part of Reactive Programming, so you may find more details on this topic in any documentation covering FRP. Using Streams provides truly a lot of possibilities and combinations, since data flows may be combined and transformed in a lot of ways independently of time when a data itself was produced.

But let me give just the basic example here, so you may either realise the full potential if you already know something about them, or head to FRP docs if you ever plan to use Streams and need complex workflows.

Out of the box, RPD uses [Kefir][kefir] library for Streams, since it's very tiny and neat <!-- laconic --> at the same time. Both Inlets and Outlets have `stream` method, which plugs given Kefir Stream into the flow:

```javascript
randomNode.inlets['bang'].stream(Kefir.interval(1000, {}));
randomNode.outlets['random'].stream(Kefir.sequentially(1000, [1, 2, 3]));
```

Streams allow you to do really powerful things:

```javascript
// set red component of the color using the mouse X position
colorNode.inlets['r'].stream(
    Kefir.fromEvents(document.body, 'mousemove').throttle(10)
         .map(function(event) {
             return { x: event.clientX, y: event.clientY };
         })
         .map(function(position) {
             return position.x % 255;
         });
);
```

### Adding Sub-patches

<!-- IN PROGRESS -->

### Adding Import/Export

Currently, there are only JSON and Plain Modules included with RPD distribution. Both may save Networks to `*.json` and `*.txt` (Plain Text) files correspondingly and restore them back from these files.

To add JSON export, just ensure to [include the Module into your version of RPD](./setup.html), then call this:

```javascript
var finalize = Rpd.export.json('Name of the Patch');

var patch = Rpd.addPatch(...);
patch.addNode(...);
...
...

console.log(finalize());
```

And you'll get the full restorable log of actions in JSON format in the console. Flush it to the file and read it back with:

```javascript
var jsonContent = JSON.parse(readFile('my-file.json'));

Rpd.import.json(jsonContent);
```

To do the same, but with Plain Text format, just change `Rpd.export.json` and `Rpd.import.json` to `Rpd.export.plain` and `Rpd.import.plain`, and you're done!

[kefir]: https://rpominov.github.io/kefir
