---
title: Building a Patch Network
id: network
level: 1
---

No matter if you [compiled](./setup.html#Compilation) your own version of RPD or [downloaded](./setup.html#Download) the version with default options, now you are ready to build a Patch network.

<!-- Here's an example of a very simple patch, just to give you an idea on how easy it is to build one:

```html
<div id="patch-target"></div>
<script>
    var targetElement = document.getElementById('patch-target');
    var patch = Rpd.render('svg', targetElement, { style: 'quartz' });
    var randomNode = patch.addNode('core/random', 'Random');    
    var numberNode = patch.addNode('core/number', 'Number');
    randomNode.outlets['out'].connect(numberNode.inlets['in']);
    randomNode.inlets['min'].receive(10);
    randomNode.inlets['max'].receive(Kefir.repeat(function() {
        return Kefir.sequentially(1000, [100, 1000, 10000]);
    })); // will sequence 100, 1000, 10000, 100, 1000, 1000, ... sending new value every second
</script>
```

But of course that's not everything RPD capable of — there are much, much more possibilities covered below, and they may help you build very complex Patches. -->

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
        // use SVG Renderer and Quartz Style to render into div#patch-target,
        // also configure Renderer to allow multiple connections to inlets
        // (only single connection is allowed by default)
        Rpd.render('svg', targetElement, { style: 'quartz',
                                           inletAcceptsMultipleLinks: true });

        // Network creation code
    </script>
</body>
```

Renderer options could belong to one particular options, but Renderers supplied with RPD tend to use a generalized set of options:

* `style` — the only required option, sets the [style](../examples.html#styles-and-renderers) used to visualize nodes; you need to ensure to [include this Style code](./setup.html#compilation-options) in your RPD version or else this option will fail;
* `valuesOnHover` — (`false`) show inlet/outlet value only when user hovers over its connector (values are always shown, by default);
* `nodeMovingAllowed` — (`true`) are nodes allowed to be dragged or should they be immovable;
* `renderNodeList` — (`true`) show the list of available node types, where the click on the type item add the node of this type to current patch;
* `nodeListCollapsed` — (`false`) if showing node list at all, should it be collapsed in the initial state;
* `inletAcceptsMultipleLinks` — (`false`) could several outlets connect to the same inlet;
* `effectTime` — (`1000`) milliseconds to show the value update effect on the connector
* `showTypes` — (`false`) show inlet/outlet types for debugging purposes;
* `showBoxes` — (`false`) show node bounding for debugging purposes;

Further on let's assume that you write subsequent code below those two lines:

```javascript
var targetElement = document.getElementById('patch-target');
Rpd.render('svg', targetElement, { style: 'quartz',
                                   inletAcceptsMultipleLinks: true });

// Creating a Patch, Adding Nodes, ...
```

### Creating a Patch

Patch is a collection and topology of connected Nodes.

And creating a Patch is super-easy:

```javascript
var patch = Rpd.addPatch();
```

or, a named Patch:

```javascript
var patch = Rpd.addPatch('My Patch');
```

### Adding Nodes

Adding nodes is also super-easy in a default form:

```javascript
var untitledCoreNode = patch.addNode('core/random');
var untitledCustomNode = patch.addNode('my-toolkit/my-node-type');
var titledCustomNode = patch.addNode('my-toolkit/my-node-type', 'My Node');
```

At least, you need to specify a type of the Node you want to create. Type determines how many inlets/outlets new Node will have, their names and types, and the way (algorithm) it will use to process incoming data before sending it to other nodes. Or, type may determine that this Node won't change the data and just pass it through, but visualize it in some way.

For example, all the Nodes with type `core/random` always have two inlets, `min` and `max` (both accept only numbers), and one outlet named `out`. You are free to add other inlets or outlets to any instance of any type, though. When one of the inlets gets new value, Node with `core/random` type generates new random number laying between the requested bounds and immediately sends it to the `out` outlet. Renderer of the `core/random` type ensures that last four generated numbers are also shown in the body of every such Node.

New nodes are positioned in the free space automatically, though the placing algorithm is intentionally not perfect, to keep it simple, so you have the ability to force-move the created node to the desired place if don't like what machine suggested for you:

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

<!-- TODO: embedded example -->

Node Types definition is [covered in details](./toolkits.html#defining-node-type) at the Toolkits page. As well as [writing a Renderer for a Node](./toolkits.html#writing-node-renderer).

### Connecting Nodes

Nodes process data that came inside through Inlets and then send processed data through their Outlets to Inlets of the other nodes. The connection between Outlet of one node and Inlet of another node is called Link. User may connect one Outlet to several Inlets, and also, if it's allowed by configuration (usually not), connect several Outlets to one Inlet.

<!-- TODO: some picture about how the process goes -->

Some nodes have no Inlets, and that's ok, since they probably have some initial state and/or default values for Inlets and/or hidden inlets (a bit later about it). Some nodes may have no outlets if they send nothing, and that's also completely ok!

Nodes may have any number of Inlets and any number of Outlets defined in their type and also may have any number of Inlets and any number of Outlets attached by you to the instance of the Node.

Type-defined Inlets and Outlets are accessible through `node.inlets` and `node.outlets` properties:

```javascript
```

User-defined Inlets and Outlets are _not_ stored this way, <!-- (since it's not allowed to mutate Node state from the code) --> but you may receive an instance of such just when you use `addInlet` or `addOutlet` method:

```javascript
```

You may notice that Inlets and Outlets also have their own types. Their type determines which data they may accept, connections of which type they allow, how they present the data to the user or how they transform it before sending it to the Node.

Same way as for the nodes, Channel (Inlets and Outlets together are called Channels in RPD) type may be defined just before Channel usage.

```javascript
```

Channel Types definition is [covered in details](./toolkits.html#defining-channel-type) at the Toolkits page. As well as [writing a Renderer for a Channel](./toolkits.html#writing-channel-renderer).

In UI, user commonly starts creating a Link from the Inlet and finishes it on the Outlet. That's same for your code. You get the Outlet instance (defined by type or added by you) and connect it to the Inlet instance (defined by type or added by you):

```javascript
```

#### Inlet properties

That's important to say that Inlets could have a lot of options:

```javascript
```

#### Outlet properties

### Sending Data

To send your own data to an Inlet, you may use its `receive` method. There's no requirement for this inlet to be connected to anything, if it is indeed connected, you'll just insert your update in it's established data flow.

```javascript
```

To send some data from an outlet, use it's `send` method. You might want it to be connected to something before. The data then will flow through all the connections until the end of the wire or until some Node on the way will interrupt it.

```javascript
```

When you send data to some Inlet, it is first transformed according to its type, if there was such transformation requested. So the Node may receive a bit different data than you've sent to the Inlet.

```javascript
```

Of course you may use `inlet.receive` or `outlet.send` in any moment after the corresponding Inlet or Outlet was created. If you want, use `setTimeout` to postpone the update or `setInterval` to send value each period of time. But I have a better suggestion for you.

You may shedule the updates using the Stream approach. Streams are sequences of data distributed over time, and they are the major part of Reactive Programming, so you may find more details on this topic in any documentation covering FRP. Using Streams provides truly a lot of possibilities and combinations, since data flows may be combined and transformed in a lot of ways independently of time when a data itself was produced.

But let me give just the basic example here, so you may either realise the full potential if you already know something about them, or head to FRP docs if you ever plan to use Streams and need complex workflows.

Out of the box, RPD uses [Kefir][kefir] library for Streams, since it's very tiny and neat <!-- laconic --> at the same time. Both Inlets and Outlets have `stream` method, which plugs given Kefir Stream into the flow:

```javascript
```

### Adding Sub-patches

### Adding Import/Export

[kefir]: http://rpominov.github.io/kefir
