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

But nodes also could have options you may find useful. These options are passed as an object:

```javascript

```

*

Actually, you may define a new type for a Node just before creating one. Having a Renderer for a Node type is completely optional:

```javascript
```

Node Types definition is [covered in details](./toolkits.html#defining-node-type) at the Toolkits page. As well as [writing a Renderer for a Node](./toolkits.html#writing-node-renderer).

### Connecting Nodes

### Sending Data

### Adding Sub-patches

### Adding Import/Export
