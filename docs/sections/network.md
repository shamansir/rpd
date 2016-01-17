---
title: Building a Patch Network
id: network
level: 1
---

No matter if you [compiled](./setup.html#Compilation) your own version of RPD or [downloaded](./setup.html#Download) the version with default options, now you are ready to build a Patch network.

### Setup Rendering

You have to have some target DOM element to render your Patch into. So, first
there should be one accessible to the RPD code. It could be a `div`:

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

Further on let's assume that you write subsequent code below these two lines.

### Creating a Patch



### Adding Nodes

### Connecting Nodes

### Sending Data

### Adding Subpatches

### Adding Import/Export
