---
title: API
id: api
level: 1
---

### Contents

When you want to let user work with some existing Node Network or to load and build it from file (for which there is `io` module), you may use Network Building API, including these methods:

* [`Rpd`](#rpd)
    * [`Rpd.addPatch(name) → Patch`](#rpd-addpatch)
    * [`Rpd.addClosedPatch(name) → Patch`](#rpd-addclosedpatch)
* [`Patch`](#patch)
    * [`patch.addNode(type, [title, definition]) → Node`](#patch-addnode)
    * [`patch.removeNode(node)`](#patch-removenode)
    * [`patch.inputs(list)`](#patch-inputs)
    * [`patch.outputs(list)`](#patch-outputs)
    * [`patch.project(node)`](#patch-project)
* [`Node`](#node)
    * [`node.addInlet(type, alias[, definition]) → Inlet`](#node-addinlet)
    * [`node.addOutlet(type, alias[, definition]) → Outlet`](#node-addoutlet)
    * [`node.removeInlet(inlet)`](#node-removeinlet)
    * [`node.removeOutlet(outlet)`](#node-removeoutlet)
    * [`node.turnOn()`](#node-turnon)
    * [`node.turnOff()`](#node-turnoff)
* [`Inlet`](#inlet)
    * [`inlet.receive(value)`](#inlet-receive)
    * [`inlet.stream(stream)`](#inlet-stream)
    * [`inlet.toDefault()`](#inlet-todefault)
    * [`inlet.allows(outlet) → boolean`](#inlet-allows)
* [`Outlet`](#outlet)
    * [`outlet.connect(inlet) → Link`](#outlet-connect)
    * [`outlet.disconnect(link)`](#outlet-disconnect)
    * [`outlet.send(value)`](#outlet-send)
    * [`outlet.stream(stream)`](#outlet-stream)
* [`Link`](#link)
    * [`link.pass(value)`](#link-pass)
    * [`link.enable()`](#link-enable)
    * [`link.disable()`](#link-disable)
    * [`link.disconnect()`](#link-disconnect)

To control the rendering queue, you may use these methods:

* [`Rpd`](#rpd)
    * [`Rpd.renderNext(renderers, targets, config)`](#rpd-rendernext)
    * [`Rpd.stopRendering()`](#rpd-stoprendering)
* [`Patch`](#patch)
    * [`patch.render(renderers, targets, config)`](#patch-render)
    * [`patch.open()`](#patch-open)
    * [`patch.close()`](#patch-close)
    * [`patch.moveCanvas(x, y)`](#patch-movecanvas)
    * [`patch.resizeCanvas(width, height)`](#patch-resizecanvas)
* [`Node`](#node)
    * [`node.move(x, y)`](#node-move)    

When you want to build your own toolkit, you may decide to register your node & channel types and renderers using these methods:

* [`Rpd`](#rpd)
    * [`Rpd.nodetype(type, definition)`](#rpd-nodetype)
    * [`Rpd.channeltype(type, definition)`](#rpd-channeltype)
    * [`Rpd.noderenderer(type, alias, definition)`](#rpd-noderenderer)
    * [`Rpd.channelrenderer(type, alias, definition)`](#rpd-channelrenderer)
    * [`Rpd.nodedescription(type, description)`](#rpd-nodedescription)

<!-- * `Rpd.toolkiticon(toolkit, icon)` -->
<!-- * `Rpd.nodetypeicon(toolkit, icon)` -->

These methods will help you in creating your own styles or even renderers:

* [`Rpd`](#rpd)
    * [`Rpd.style(name, renderer, style)`](#rpd-style)
    * [`Rpd.renderer(alias, renderer)`](#rpd-renderer)

<!-- TODO: global `Rpd` object properties -->

To define node type or channel type, to configure some particular node or channel, to define node renderer or channel renderer, you'll need these Definition Objects:

* [Node Definition](#node-definition)
* [Inlet Definition](#inlet-definition)
* [Outlet Definition](#outlet-definition)
* [Node Renderer Definition](#rpd-noderenderer)
* [Channel Renderer Definition](#rpd-channelrenderer)

### Core types

* Channel
   * `core/any`
* Node
   * `core/basic`
   * `core/reference`

### `util` Toolkit

List of Nodes, which currently exist in `util` Toolkit [is located here](http://github.com/shamansir/rpd/blob/master/src/toolkit/util/toolkit.md).

### Naming rules

Probably you already noticed that naming style in API is different from method to method. I'd like to assure you that everything is under control and has a system before studying out any method. And the rules are simple:

* Static method for _registering_ Node Types, Channel Types, Renderers, Node Renderers, Channel Renderers, Styles etc.: `Rpd.completelylowercase`;
* Any other instance or static method: `instance.usualCamelCase`, preferrably one word;
* Node or Channel type name: `toolkit/word-or-two`;
* Property in a Node Definition, Channel Definition or any other Definition: strictly one word, lowercase;

<!-- MARK: Rpd -->

### `Rpd`

The `Rpd` namespace is a single entry point for your _patch network_, independently on the place where every patch should be rendered. It provides you with the ability to append new patches to your own network and <!-- scurpolously --> control the overall rendering process.

Every patch lays over its own _canvas_, several canvases may be attached to the same _target element_, this will be covered in details below.

> It's important to notice that the whole API is based on processing event streams, same way as Reactive Programming concepts work. All the created instances are immutable, they only react on user actions, with no modifications to the initial state. It guarantees the safety and ability to reverse any operation and also allows you to create streams of data of any complexity, intended to flow between the nodes.

<!-- schematic picture of a network -->

Directly in `Rpd.` namespace there are methods designed to help you register new Node Types, new Channel Types, Node Renderers and Channel Renderers. They help you to build and reuse any kinds of Nodes and Channels, actually there is no limit of what you can do using these. Every method is described below or in some section nearby.

When you find that you use registration methods from `Rpd.*` namedpace too often,  please consider extracting these parts to a separate [Toolkit](./toolkit.html).

<!-- From this point and below, let's consider some example to illustrate the practical usage of the described methods. Say, we want to draw the Solar System in static (not that RPD is unable to do it in dynamic, but it's better to consider simple examples at start, isn't it?). We won't do it step-by-step like tutorials do, rather we'll say which method fits particular situation better. For these needs, for every API method there will be a section marked as _Example_. If you really want, the complete code of this example is accessible [here] --> <!-- TODO -->

<!-- schematic picture of an example -->

#### `Rpd.renderNext(renderers, targets, config)`

Render all the Patches which follow this statement with specified Renderer (or many), to specified target (or many), with specified configuration (just one is enough).

`renderer` is an alias of a Renderer, registered with `Rpd.renderer` before. RPD comes with `'html'` and `'svg'` Renderers. Not every Style may render with both, so there's a table in [Setup](../setup.html) section clarifying which Style supports which Renderer.

`target` is any DOM (i.e. HTML or SVG) Element to be a root for the next Patches to render into.

`config` is the configuration object used both by Style and Renderer.

The process is described in details in [Network](../network.html#rendering-configuration) section.

#### `Rpd.stopRendering()`

Stop all the rendering processes, running for the moment. Even if other RPD methods will be called until next call to `Rpd.renderNext` or `patch.render`, they won't show anything in UI.

#### `Rpd.addPatch([title], [definition]) → Patch`

Adds new Patch to the Network. Patch is a container for a set of nodes and connections between them. Every Patch added this way is _opened_ by default, which means that it is rendered right away, and reacts immediately to every following change. You may set a patch title here and, also optionally, define handlers for the [events happening inside](./events.md#Patch), this way:

#### `Rpd.addClosedPatch(title, [definition]) → Patch`

Adds new Patch to the Network almost the same way as `addPatch` above, but this patch is _closed_ when you add it, so you need to explicitly call its [`open()`](#patch-open) method when you want this patch to render.

Patch may exist in two conditions: _opened_ — when you, as a user, observe all the events happening inside, new nodes appear, links connect, data flows, and everything is visually in motion, and _closed_ — when you, as a user, see nothing, but all the rendering yet happens somewhere in background. When you switch some Patch from closed state to an opened one, it shows everything happened before in the target you assigned, and vice versa.

It becomes useful when you have a Network of Patches and you want to show some while hiding others. In another words, you have some dependent Patch you don't want to be displayed until requested. This type of patches I'd recommend to call _Procedure Patch_, which is, unlike the _Root Patch_, treated as secondary.

All the Patches are opened by default. So to add initially closed patch, use this exact method (`Rpd.addClosedPatch`) or use [`patch.close()`](#patch-close), when you want to close it later.

<!-- IN PROGRESS -->

#### `Rpd.nodetype(type, definition)`

<!-- PROPLIST: Node Definition -->

* `title`: `string`
* `inlets`: `object { <alias>*: inlet_definition }`
* `outlets`: `object { <alias>*: outlet_definition }`
* `prepare`: `function`: `(inlets, outlets) → nothing`
* `process`: `function`: `(inlets_values, prev_inlets_values) → outlets_values`
* `tune`: `function`: `(updates_stream) → updates_stream`
* `handle`: `object { <event>*: handler }`

<!-- /PROPLIST -->

Register a new type of the nodes, so you, or the user, may easily create instances of this type with the help of `patch.addNode` or using some other interface.

So you may define once that all the nodes of your type have two inlets and one outlet, which channel types they have, and how the node processes data, and then create 300 instances of this node type, when you really want.

NB: Please note that user may in any case extend the instance with own definition using `patch.addNode(type, definition)` method, add or remove inlets/outles and modify properties. You should not care too much about that or even you need not care at all, but in some rare cases that could be important.

The new `type` name should be in the form `toolkit/typename`. For example, there could be nodes with the types `util/bang`, `util/color`, `blender/render`, `animatron/player`, `processing/color`, `processing/sketch` etc. Prefer one word for the type name when possible, or join several words with dash symbol `-`, when it's really not.

Then goes the `definition`, which is described in details in [Node Definition](#node-definition) section. Just note that when you need, you may pass a function to this method, it is very useful when you need to share some objects between definitions, so both examples are valid:

```javascript
Rpd.nodetype('docs/foo', {
    title: ...,
    inlets: ...,
    outlets: ...,
    process: ...
});

Rpd.nodetype('docs/foo', function() {
    var someSharedVariable;
    var nodeInstance = this;
    return {
        title: ...,
        inlets: ...,
        outlets: ...,
        process: ...
    };
});
```

Note: When you need information on creating your own toolkits, head safely to the [Toolkits](./toolkits.html) section.

#### `Rpd.nodedescription(type, description)`

Any node type can have a literary textual description of what this node does in details. Normally renderer shows it in the node list, next to corresponding node type, when available, and also when user hovers over the title of the node.

```javascript
Rpd.nodedescription('docs/foo', 'Used as the example for documentation');
```

#### `Rpd.channeltype(type, definition)`

<!-- PROPLIST: Channel Definition -->

* `label`: `string`
* `default`: `any`
* `hidden`: `boolean`
* `cold`: `boolean`
* `readonly`: `boolean`
* `allow`: `array[string]`
* `accept`: `function`: `(value) → boolean`
* `adapt`: `function`: `(value) → value`
* `show`: `function`: `(value) → string`
* `tune`: `function`: `(values_stream) → values_stream`
* `handle`: `object { <event>*: handler }`

<!-- /PROPLIST -->

Register a new type of a Channel, so you, or the user, may easily create instances of this type with the help of `node.addInlet` or `node.addOutlet`, or using some other interface.

This helps you to define a Channel properties once and use them everywhere. Some of the channels in Util Toolkit are: `util/number`, which handles number values, `util/boolean` which handles boolean values, `util/color` which handles color values or even `util/bang` which handles Bang signal used to trigger some actions.

NB: Please note that user may in any case extend the Channel with own definition using `node.addInlet(type, alias, definition)` or `node.addOutlet(type, alias, definition)` forms of the methods, change the handlers or options. You should not care too much about that or even you need not care at all, but in some rare cases that could be important.

The new `type` name should be in the form `toolkit/typename`. For example, there could be Channels with the types `util/bang`, `util/color`, `tibre/wave`, `processing/color`, `processing/shape`, `animatron/tween` etc. Prefer one word for the type name when possible, or join several words with dash symbol `-`, when it's really not.

Then goes the definition, which is described in details in [Inlet Definition](#inlet-definition) section. Channel Definition is used both for Inlets and Outlets, but Outlets [lack of several options](#outlet-definition) which are used only for the Inlets. In the case when Outlet was created with a Channel or overriden Channel Definition, that contains some option belonging only to Inlets, this Outlet just doesn't takes these particular options in consideration.

Just note that when you need, you may pass a function to this method, it is very useful when you need to share some objects between definitions, so both examples are valid:

```javascript
Rpd.channeltype('docs/foo', {
    allow: ...,
    accept: ...,
    adapt: ...,
    show: ...
});

Rpd.channeltype('docs/foo', function() {
    var someSharedVariable;
    var channelInstance = this;
    return {
        allow: ...,
        accept: ...,
        adapt: ...,
        show: ...
    };
});
```

Note: When you need more details, head safely to the [Toolkits](./toolkits.html) section, which is the tutorial for writing your very own toolkit.

#### `Rpd.noderenderer(type, rendererAlias, definition)`

<!-- PROPLIST: Node Renderer -->

* `size`: `object { width, height }`
* `first`: `function(bodyElm) [→ object { <inlet>*: { default, valueOut } }]`
* `always`: `function(bodyElm, inlets, outlets)`

<!-- /PROPLIST -->

Define new Node Renderer for particular Node Type. When you want to have and reuse some Node which is more complex to render than just empty body with inlets or outlets, this method is what you need.

It allows you to put in the Node body whatever you want and improve user experience in every possible way. Using mostly only Node Types and corresponding Renderers for them, you may create the analogues of Pure Data, VVVV, Blender Material composer, or whichever node system comes to your mind.

The only limits you have are the limits of HTML or SVG, but there are both nowadays also almost limitless.

The Toolkits for the [Examples](../examples.html) section and the ones located at `src/toolkit` are all powered by `Rpd.nodetype`, `Rpd.channeltype`, `Rpd.noderenderer` and `Rpd.channelrenderer`, but `Rpd.noderenderer` is what makes them so powerful, since you may include, for example, control of any complexity, HTML5 Canvas, or Processing Sketch, or even something WebGL-driven into the node body. The important thing is how to deal with Toolkit architecture.

But let's turn from advertisement back to API.

`type` is the type of the node you want to define renderer for.

`rendererAlias` is a name of a Renderer which should already be registered in the system under this alias. Out of the box, there are `'html'` and `'svg'` renderers provided. Though you should ensure [to include Renderer](./setup.html) into your version of RPD before using one of them. Both of them support HTML and SVG DOM Elements, but for latter one the Node body is itself an SVG Element, so you if you want to add HTML Elements there, you need put them into `<foreignelement />` tag before, in the `definition`.

May receive both object or function, returning the object, as `definition`. Structure of this object is described below. When it's a function, it receives Node instance as `this`. <!-- check -->

Any property in definition is optional.

```javascript
Rpd.noderenderer('docs/foo', 'html', {
    size: ...,
    first: ...,
    always: ...
});

Rpd.noderenderer('docs/foo', 'html', function() {
    var someSharedVariable;
    var nodeInstance = this;
    return {
        size: ...,
        first: ...,
        always: ...
    };
});
```

<!-- TODO: also may appear in path.addNode(..., ..., <node-definition>, <render-definition>) -->

<!-- TODO: it is also possible to override `render` in `patch.addNode` and `node.addInlet/node.addOutlet`, check -->

Note: When you need more details, head safely to the [Toolkits](./toolkits.html) section, which is the tutorial for writing your very own toolkit.

##### `size` : `object`

Restrict the size of the Node body to some particular size. It is the object in the form `{ width: 100, height: 200 }`. You may omit width or height property, if you want it to be automatically calculated. When you omit the `size` option completely, the Node body is assigned automatically by Style, in some cases it's enough, in other cases you may need more space for body controls, for example.

Pay attention that the same Node body size may look better for one Style and worse for another. If you want to support several Styles (it's for sure not obligatory), it's better to check if your Node looks well for all of them.

<!-- ##### `prepare` : `function(patchNode, currentPatchNode)` -->

##### `first` : `function(bodyElm) [→ object]`

This handler is called once, just before the Node is ready to process incoming data and when all the Inlets and Outlets defined in [Type Definition](#node-definition) are already attached the Node.

Use this handler to prepare the Node body, i.e. append required DOM (or whichever, it depends on the Renderer) elements there. When you use the form of the function to define `Rpd.noderenderer`, you may safely save these elements in the closure to use them in `always` handler.

```javascript
Rpd.noderenderer('docs/recipe', 'html', {
    first: function(bodyElm) {
        var recipeText = '...';
        var spanElement = document.createElement('span');
        spanElement.innerText = recipeText;
        bodyElm.appendChild(spanElement);
    }
});

Rpd.noderenderer('docs/color', 'html', function() {
    var colorElement;
    return {
        first: function(bodyElm) {
            var colorElement = document.createElement('span');
            colorElement.style.backgroundColor = 'transparent';
            bodyElm.appendChild(colorElement);
        },
        always: function(inlets) {
            colorElement.style.backgroundColor = '(' +  inlets.r + ',' + inlets.g + ',' inlets.b + ')';
        }
    };
});
```

This function may optionally return the object which allows to attach default values or streams of the values to the existing inlets. <!-- #354 --> It is very useful when you want to have some complex control (or several ones) in the Node body, so you add control there and pass its changes [Stream][kefir] (for example, `'change'` event) to an existing hidden inlet.

Don't be afraid, usually you'll need Kefir Streams only to transfer events to the Inlet, so it will be just `return Kefir.fromEvents(myControl, 'change');` here... Or may be you'll find useful to also `.map` values to something. And `.throttle` them in some cases... Streams could appear very useful!

So, first, for every inlet returned, you may specify `'default'` property, which could be a function returning a default value (so you will be able to initialize your control with this value in this function) or just some value.

And, second, you may specify `'valueOut'` [Stream][kefir], which should emit new value when you want to update inlet value. Usually it is ok to pass `'change'` events Stream from your control there.

What `bodyElm` is, depends on the Renderer you use for rendering. For example, for `'html'` Renderer it is HTML Element and for `'svg'` renderer it is SVG Element, correspondingly.

NB: It is highly recommended not to change `bodyElm` attributes or especially remove it from the flow. In most cases adding DOM children to it will satisfy all your needs. It is not the strict law, however — don't feel like someone prevents you — you're grown-ups, you know when you may break some ~~rules~~ HTML Elements.

```javascript
// sends random number to a hidden inlet immediately after a link inside the Node body was clicked

Rpd.nodetype('docs/random-on-click', {
    inlets: {
        'click': { type: 'core/any', hidden: true }
    },
    outlets: {
        'random': { type: 'util/number' }
    },
    process: function(inlets) {
        if (inlets.click) return { random: Math.random() };
    }
});

Rpd.noderenderer('docs/random-on-click', 'html', {
    first: function(bodyElm) {
        var clickElm = document.createElement('a');
        clickElm.href = '#';
        clickElm.innerText = 'Click Me!';
        bodyElm.appendChild(clickElm);
        return {
            'click': Kefir.fromEvents(clickElm, 'click')
        }
    }
});
```

NB: The `valueOut` and `default` functionality is discussable, please follow [Issue #354](https://github.com/shamansir/rpd/issues/354) if you want to keep track on changes, if they come, or feel free to add comments if you have any suggestions on how to improve it.

Receives Node instance as `this`.

##### `always` : `function(bodyElm, inlets, outlets)`

This function is called on every inlet update, next to the Node `process` handler (described in [Node Definition](#node-definition)), when the latter was defined.

So you may apply/render all the new updates immediately after the moment they happened. `inlets` object contains new Inlets values, `outlets` object contains
current Outlets values, including those returned from the `process` handler.

```javascript
// see `docs/random-on-click` Node type definition in previous example,
// this is a slightly modified version which also displays the generated
// random number inside node body
Rpd.noderenderer('docs/random-on-click', 'html', function() {
    var numberElm;
    return {
        first: function(bodyElm) {

            var clickElm = document.createElement('a');
            clickElm.href = '#';
            clickElm.innerText = 'Click Me!';
            bodyElm.appendChild(clickElm);

            numberElm = document.createElement('span');
            numberElm.innerText = '<?>';
            bodyElm.appendChild(numberElm);

            return {
                'click': Kefir.fromEvents(clickElm, 'click')
            };
        },
        always: function(bodyElm, inlets, outlets) {
            numberElm.innerText = outlets.random;
        }
    };
});
```

#### `Rpd.channelrenderer(type, rendererAlias, definition)`

<!-- PROPLIST: Channel Renderer -->

* `show`: `function(target, value, repr)`
* `edit`: `function(target, inlet, valueIn) [→ change_stream]`

<!-- /PROPLIST -->

Register a Renderer for a Channel Type.

This allows you to render values which appear near to Inlets and Outlets of particular Channel Type not only as String, but in any kind of visual presentation. For example, you may display a color value as a color box filled with this color, instead of boring variants like `#883456` or `[Some Color]`, near to any Inlet or Outlet having your own `my/color` Channel Type:

```javascript
Rpd.channetype('docs/color', {});

Rpd.channelrenderer('docs/color', 'html', {
    show: function(target, value) {
        var colorElm = document.createElement('span');
        colorElm.style.height = '30px';
        colorElm.style.width = '30px';
        colorElm.style.backgroundColor = 'rgb(' + value.r + ',' + value.g + value.b + ');';
        target.appendChild(colorElm);
    }
});
```

This method may receive either object following the structure described below, or function which returns object of same structure. It is helpful when you need to share some data to reuse in all methods using a closure.

`type` is an alias of a Channel Type, you render the values for.

`rendererAlias` is the alias of a registered Renderer, like `'html'` or `'svg'`, both of which come out of the box.

`definition` is the object that describes how the Channel Renderer should behave in different situations, its possible properties are covered below.

You also may pass a function which returns such object instead, it will help you to store shared variables in the closure. When you do so, this function receives Channel instance as `this`.

```javascript
Rpd.channelrenderer('docs/foo', 'html', {
    show: ...,
    edit: ...
});

Rpd.channelrenderer('docs/foo', 'html', function() {
    var someSharedVariable;
    var nodeInstance = this;
    return {
        show: ...,
        edit: ...
    };
});
```

<!-- TODO: also may appear in node.addInlet(..., ..., <channel-definition>, <channel-render-definition>), node.addOutlet(..., ..., <channel-definition>, <channel-render-definition>) -->

Note: When you need more details, head safely to the [Toolkits](./toolkits.html) section, which is the tutorial for writing your very own toolkit.

<!-- ##### `prepare` : `function()` -->

##### `show` : `function(target, value, repr)`

This function may convert new received value to some renderable element. For example, you may define `my/vector` Channel type which renders as the direction this vector points to, in SVG:

```javascript
Rpd.channeltype('docs/vector', {});

var SVG_XMLNS = 'http://www.w3.org/2000/svg';
var radius = 7;
Rpd.channelrenderer('docs/vector', 'svg', {
    show: function(target, value) {
        var circle = document.createElementNS(SVG_XMLNS, 'circle');
        circle.setAttributeNS(null, 'cx', 0);
        circle.setAttributeNS(null, 'cy', 0);
        circle.setAttributeNS(null, 'r', radius);
        circle.setAttributeNS(null, 'fill', 'white');
        circle.setAttributeNS(null, 'stroke', 'black')
        circle.setAttributeNS(null, 'strokeWidth', 1);
        var line = document.createElementNS(SVG_XMLNS, 'line');
        line.setAttributeNS(null, 'x1', 0);
        line.setAttributeNS(null, 'y1', 0);
        line.setAttributeNS(null, 'x2', Math.cos(value.angle) * radius);
        line.setAttributeNS(null, 'y2', Math.sin(value.angle) * radius * -1);
        line.setAttributeNS(null, 'stroke', 'black');
        line.setAttributeNS(null, 'strokeWidth', 1);
        target.appendChild(circle);
        target.appendChild(line);
    }
});
```

<!-- TODO: do this -->

`target` is the element (HTML Element for `'html'` Renderer, SVG Element for `'svg'` Renderer and so on) where you should put your own element, the one representing the value, into.

`value` is the most fresh value this Channel received.

`repr` is the string representation returned from [Channel Definition](#channel-definition) `show` method, if it was defined or just `.toString()` call on the value, when it wasn't.

NB: Node Types names and Channel Types named may intersect since Node can also represent a single thing which can also be passed through a Channel.

##### `edit` : `function(target, inlet, valueIn) [→ change_stream]`

If you want to let user edit the value not (or _not only_) in the Node body, but also when she clicks the value near to the Inlet, you may use this method to provide her that. <!-- Though it also depends on [the rendering process configuration](./network.html#rendering-configuration), there is an option to disable value editors named ... TODO ? -->. This method is called only for Inlets, not for Outlets, since only input values are allowed to be changed without connections.

`target` is the element (HTML Element for `'html'` Renderer, SVG Element for `'svg'` Renderer and so on) where you should put your own element, the one representing the value, into.

`inlet` is the Inlet where editor was attached.

`valueIn` is the [stream][kefir] of incoming values, so you may update the editor with new values. It is also useful to filter values when editor has user focus, so she won't distract from the process of changing the value.

The function should return a [stream][kefir] of outgoing values, so every time user selects or confirms some value, it should be passed to this stream.

```javascript
Rpd.channelrenderer('docs/color', 'html', {
    show: function(target, value) {
        // see `show` code above
    },
    edit: function(target, inlet, valueIn) {
        var input = document.createElement('input');
        input.type = 'text';
        valueIn.onValue(function(value) {
            input.value = colorToText(value);
        });
        target.appendChild(input);
        return Kefir.fromEvents(input, 'change').map(textToColor);
    }
});
```

#### `Rpd.renderer(alias, definition)`

Renderer Definition is completely moved to [Style Section](../style.html#writing-your-own-renderer), since it doesn't relate to Building Patches.

#### `Rpd.style(alias, rendererAlias, definition)`

Style Definition is completely moved to [Style Section](./style.html#writing-your-own-style), since it doesn't relate to Building Patches.

<!-- MARK: Patch -->

### `Patch`

Patch contains a set of nodes and could be rendered on its own _canvas_, which is an invisible boundind box where this patch is drawn.

Nodes are connected with links going from outputs of one node to inputs of another. This way data dynamically flows through the patch.

<!-- schematic picture of a patch -->

#### `patch.render(renderers, targets, config)`

Render this Patch with given Renderers, to given target elements, with provided configuration.

`renderers` is one or the list of the Renderer aliases, like `'html'` or `'svg'`, which come out of the box and render Patch to HTML  or SVG elements, correspondingly.

`targets` is one or the list of elements where patch should be rendered. When you specify two targets, patch will be mirrored in both targets and changes in one target will be reflected in another and vice versa.

`conf` is the rendering configuration, described in details in [Network section](./network.html#rendering-configuration). It allows you to select Style of the Nodes and configure a lot of other useful things.

```html
<body>
    <div id="target-1"></div>
    <div id="target-2"></div>
    <div id="target-3"></div>
</body>
```

```javascript
var patchOne = Rpd.addPatch('FirstPatch')
                  .render('svg', [ 'target-1', 'target-2' ], {
                      style: 'compact-v',
                      linkForm: 'curve'
                  });
var patchTwo = Rpd.addPatch('SecondPatch')
                  .render([ 'html', 'svg' ], 'target-3', {
                      style: 'quartz',
                      linkForm: 'line'
                  });                  
```

NB: Note that _closed_ Patches are not rendered immediately, unlike _opened_ ones. To get more details on _opening_ and _closing_ Patches, see [Rpd.addClosedPatch()](#rpd-addclosedpatch) description.

#### `patch.addNode(type, title, [definition]) → Node`

Add a node, which represents any process over some inputs (inlets) and sends result of the process to its outputs (outlets). A node can have no inputs or no outputs at all, or even both, so in the latter case this node is called self-sufficient.

The type of the node is some previously registered type, for example, `core/basic`. Usually it has the form `toolkit/short-name`. You may use a prepared one from the [toolkits](TODO) or easily create your own types for the nodes with [`Rpd.nodetype`](TODO).

You may specify a custom title, if you want, or the engine will fall back to the type name.

The third argument, `definition` is a bit tricky one, but just a bit. It's optional, so usually you may omit it without any compunction. This argument is the object which actually has exactly the same structure as the object used for `Rpd.nodetype`. It helps you to override the type definition for this particular node instance, when you want. <!-- Test it merges definitions, not overrides everything -->

NB: When you override inlets and outlets this way, you may later access them using `node.inlets[alias]` and `node.outlets[alias]` shortcuts, same way as when you defined them with `Rpd.nodetype`. The inlets and outlets added later with `node.addInlet` and `node.addOutlet` methods are not accessible with this shortcuts, that is, I hope, rather logical.

You can discover the complete list of the properties which could be used in this definition if you follow to [Node Definition](#node-definition) section. Also, note that when you need, you may pass a function to this method, it is very useful when you need to share some objects between definitions, so both examples are valid:

```javascript
patch.addNode('docs/foo', 'Foo', {
    inlets: ...,
    outlets: ...,
    process: ...
});

patch.addNode('docs/foo', 'Foo', function() {
    var someSharedVariable;
    var nodeInstance = this;
    return {
        inlets: ...,
        outlets: ...,
        process: ...
    };
});
```

#### `patch.removeNode(node)`

Remove the previously added node, just pass the one you need no more.

#### `patch.open()`

Opening the Patch triggers it to be put into the rendering flow, so it listens for all the following actions and renders them accordingly. If Patch yet has no canvas to be drawn onto, engine adds this canvas to the root element before.

All the Patches are opened by default, unless they were added with [`Rpd.addClosedPatch`](#rpd-addclosedpatch) method.

Opening and closing Patches helps when you have a complex network and you want to isolate some parts of it by moving them in the background. So, you may add the patches you want to hide with[`Rpd.addClosedPatch`](#rpd-addclosedpatch) and open them later (or not open them at all). Also, you may create a special Node which refers to some closed Patch, passes data inside and then takes the processed data in return. Then, if you want, you may add a button to this node, which, in its turn, opens this, currently closed, Patch. This approach is described in details together with the [`patch.project(node)`](#patch-project) method below.

#### `patch.close()`

Closing the Patch means that the canvas of this Patch is hidden and moved to the background, so user sees no process happening there. Currently the rendering still goes there, yet staying invisible, but in the future versions it meant to be cached and reduced to the latest changes before opening instead.

#### `patch.project(node)`

Make given node to visually represent current patch<!-- projectOn, projectTo, referenceWith ?-->. It is expected, but not required, for this node to be located in another patch. <!-- TODO: test -->

It helps a lot when you have some complex network with a single large patch and so you probably want to group some nodes and reference them in another patch, while making invisible what happens inside. By _projecting_ a patch into the node, with the help of [`patch.inputs`](#patch-inputs) and [`patch.outputs`](#patch-outputs), you can "pack" any part of the network in one single node, and, optionally, let user to take a look inside or even edit, reconnect or rearrange the internals.

```javascript
Rpd.renderNext('html', document.body, {
    fullPage: true;
});

// Prepare Root patch

var rootPatch = Rpd.addPatch('Root');

var genANode = rootPatch.addNode('core/basic', 'Generate A');
var genAOutlet = genANode.addOutlet('util/number', 'A');
genAOutlet.send(3);

var genBNode = rootPatch.addNode('core/basic', 'Generate B');
var genBOutlet = genA.addOutlet('util/number', 'B');
genBOutlet.send(1);

var rootSumOfThreeNode = rootPatch.addNode('util/sum-of-three', 'foo')
rootSumOfThreeNode.addInlet('util/number', 'D');
rootSumOfThreeNode.addInlet('util/number', 'E');
rootSumOfThreeNode.addOutlet('util/number', 'F');

// Prepare Procedure Patch

var sumPatch = Rpd.addClosedPatch('Sum Procedure');

var sumOfThree1Node = sumPatch.addNode('util/sum-of-three', 'Sum1');
var in1AInlet = sumOfThree1Node.inlets['a'];
var in1BInlet = sumOfThree1Node.inlets['b'];
var sum1Outlet = sumOfThree1Node.outlets['sum'];

var sumOfThree2Node = sumPatch.addNode('util/sum-of-three', 'Sum2');
var in2AInlet = sumOfThree2Node.inlets['a'];
var sum2Outlet = sumOfThree2Node.outlets['sum'];

sum1Outlet.connect(in2AInlet);

sumPatch.inputs([ in1AInlet, in1BInlet ]);
sumPatch.outputs([ sum1Outlet, sum2Outlet ]);

var projectionNode = rootPatch.addNode('core/reference', '[Sum Patch]');
sumPatch.project(projectionNode);

outAOutlet.connect(projectionNode.inlets['a']);
outBOutlet.connect(rootSumOfThreeNode.inlets['a']);
outBOutlet.connect(rootSumOfThreeNode.inlets['b']);
rootSumOfThreeNode.outlets['sum'].connect(projectionNode.inlets['b']);
```

#### `patch.inputs(inlets)`

Specify which inlets, no matter from one or different nodes, are the global inputs of this patch. See description of the [`patch.project`](#patch-project) for details.

#### `patch.outputs(outlets)`

Specify which outlets, no matter from one or different nodes, are the global outputs of this patch. See description of the [`patch.project`](#patch-project) for details.

#### `patch.moveCanvas(x, y)`

Move the canvas of the patch to given position, treated relatively to the root element's top left corner. Both parameters are just numbers, treated as pixels for `html` rendering, and as units, for `svg` rendering.

#### `patch.resizeCanvas(width, height)`

Resize the canvas of the patch. This means all the visuals belonging to this patch and happened to be outside of given bounds, become hidden. Both parameters are just numbers, treated as pixels for `html` rendering, and as units, for `svg` rendering.

<!-- MARK: Node -->

### `Node`

Node represents the thing we call procedure in programming: it receives data through its inputs (inlets), does something using that data and returns either the same data, modified or not, or completely different data in response using outputs (outlets). But from this point, it goes beyond, since it may visualize the process inside its body or add some complex visual controls for additional inputs. On the other hand, it may stay in a boring state and have no inputs, no outputs and even no content at all. Everything depends only on yours decision.

#### Node Definition

<!-- PROPLIST: Node Definition -->

* `title`: `string`
* `inlets`: `object { <alias>*: inlet_definition }`
* `outlets`: `object { <alias>*: outlet_definition }`
* `prepare`: `function`: `(inlets, outlets) → nothing`
* `process`: `function`: `(inlets_values, prev_inlets_values) → outlets_values`
* `tune`: `function`: `(updates_stream) → updates_stream`
* `handle`: `object { <event>*: handler }`

<!-- /PROPLIST -->

Definition of the Node is the configuration object used to define
new Node Type with `Rpd.nodetype` or an object with the same structure, passed to `patch.addNode` method, intended to override or to append the Type Definition.

```javascript
Rpd.nodetype(..., <node-definition>);
Rpd.nodetype(..., function() {
    return <node-definition>;
});

patch.addNode(..., ..., <node-definition>);
```

This object may contain no properties at all, or, in cases when Node Type or a single Node needs its originality, some of the following properties:

##### `title`: `string`

Node title, usually displayed on the top of the node, defaults to node type if not specified or empty.

##### `inlets`: `object`

An object, containing a list of inlets this node has, _key_ is inlet label and _value_ is definition. For example, two number-typed inlets with labels `'a'` and `'b'`:

```javascript
Rpd.nodetype('docs/example', {
    'inlets': { 'a': { type: 'util/number' },
                'b': { type: 'util/number' } }
});
```

There are much more properties of the inlets available, see [Inlet Definition](#inlet-definition) for a full list of them.

##### `outlets`: `object`

An object, containing a list of outlets this node has, _key_ is outlet label and _value_ is definition. For example, two number-typed outlets with labels `'a'` and `'b'`:

```javascript
Rpd.nodetype('docs/example', {
    'outlets': { 'a': { type: 'util/number' },
                 'b': { type: 'util/number' } }
});
```

There are much more properties of the outlets available, see [Outlet Definition](#outlet-definition) for a full list of them.

##### `prepare`: `function`: `(inlets, outlets) → nothing`

When new node instance is created, it is filled with inlets and outlets from corresponding Type Definition. Then node is triggered as ready to perform processes. When you want to configure its inlets or outlets before any processing, you may use this `prepare` function for that.

NB: `prepare` function is called only when node has `process` handler.

Receives Node instance as `this`.

<!-- IN PROGRESS -->

##### `process`: `function`: `(inlets_values, prev_inlets_values) → outlets_values`

The `process` handler is the main function, the really important one for the Node Type definition. This function is triggered on every update appeared on any of the inlets and converts the data received through inlets to the data which is required to be sent to outlets. For example, `util` node, designed to multiply two numbers and send the result out, has a definition like this:

```javascript
Rpd.nodetype('util/*', {
    inlets: { 'a': { type: 'util/number' },
              'b': { type: 'util/number' } },
    outlets: { 'result': { type: 'util/number' } },
    process: function(inlets) {
        return { 'result': (inlets.a || 0) * (inlets.b || 0) };
    }
});
```

Though it is not obligatory to process all the inlets or to send data to every outlet—in some cases this function not cares about input or output at all. When Node Type defines no `process` function or it wasn't defined in `patch.addNode` method, node makes actually nothing.

Another important thing to notice is that you may return [Kefir Stream][kefir] as an outlet value, so the values from this stream will be sent to the outlet just when they are triggered. In this case, however, you should make the stream finite or stop this stream manually, or else streams for one inlet will merge with every next call to `process` function. For the real life example, see `util/metro` node definition in `src/toolkit/util/toolkit.js` file.

Sometimes you may want to trigger `process` function manually with some new data, but you don't want to send it through user inlet. Adding hidden inlet for your internal data is a common trick often used even in Toolkits provided with RPD distribution:

```javascript
Rpd.channeltype('docs/bang', {
    adapt: function(value) {
        return (typeof value !== 'undefined') ? {} : null;
    }
});

Rpd.nodetype('docs/bang', {
    inlets: { 'trigger': { type: 'docs/bang', hidden: true } },
    outlets: { 'bang': { type: 'docs/bang' } },
    process: function(inlets) {
        return inlets.trigger ? { 'bang': {} } : {};
    }
});
```

Usually when Node has some controller or input inside of its body, values from this controller are sent to a corresponding, existing, Inlet of this Node, so they come to `process` handler joined with other incoming data. But sometimes you may want to make input-connected Inlet hidden and leave it's pair visible, so user won't be surprised with new values coming to Inlets not from connected Outlets, but from nowhere.

In this case it could be important to know which Inlet received the value first and which received its own value later. For example, when Node has some input in a body, its updated value is usually sent to hidden Inlet, but also some visible Inlet in the same node is provided to the user, so she'll able to use it, when she wants to override this value from another Node.

For this reason we should know, which value came first, from user or from the controller inside, so to rewrite controller value only in the first case. For example `util/timestamped` Channel Type wraps any incoming value with timestamp. Let's implement a similar functionality which will will help us to solve the problem in this case:

```javascript
Rpd.channeltype('docs/number-timestamped', {
    allow: [ 'util/number' ],
    adapt: function(value) {
        return {
            time: new Date(),
            value: value
        }
    },
    show: function(v) { return v.value }
});

function getMostRecentValue(fromOtherNode, fromNodeBody) {
    if (!fromNodeBody) { return fromOtherNode.value; }
    else if (!fromOtherNode) { return fromNodeBody.value; }
    else {
        return (fromNodeBody.time > fromOtherNode.time)
            ? fromNodeBody.value : fromOtherNode.value;
    }
}

Rpd.nodetype('docs/inlet-or-body', {
    inlets: { 'from-other-node': { type: 'docs/number-timestamped' },
              'from-node-body': { type: 'docs/number-timestamped',
                                  hidden: true } },
    outlets: { 'recent': { type: 'util/number' } },
    process: function(inlets) {
        return {
            recent: getMostRecentValue(inlets['from-other-node'],
                                       inlets['from-node-body'])
        };
    }
});

Rpd.nodetyperenderer('docs/inlet-or-body', 'html', function() {
    var input;
    return {
        first: function(bodyElm) {
            input = document.createElement('input');
            input.type = 'number';
            bodyElm.appendChild(input);
            return {
                'from-node-body': Kefir.fromEvents(input, 'change')
                                       .map(function(event) {
                                           return event.target.value;
                                       })
            }
        },
        always: function(bodyElm, inlets) {
            if (inlets['from-other-node'] &&
                (!inlets['from-node-body'] ||
                 ( inlets['from-other-node'].time >  
                   inlets['from-node-body'].time ))) {
              input.value = inlets['from-other-node'].value;
            }  
        }
    };
});
```

As another option, you may add timestamps to Inlets' values using their own `tune` function, or using the `tune` function of the Node, which is described just below and by chance there's an example which shows how to do it.

Receives Node instance as `this`.

##### `tune`: `function`: `(updates_stream) → updates_stream`

This function allows you to tune all the updates from the inlets, so, for example, you may skip every second update from specific inlet, or every second update in general. Or you may multiply every new numeric value by 10. It gets the [Kefir Stream][kefir] which represents all the updates from the node inlets merged. When you return the same stream you received from this function, it changes nothing in the process.

Each update in `updates_stream` stream is the object in a form `{ inlet, value }`, where `inlet` is `Inlet` instance which received the update and `value` is the new value received. You should return the same structure from this function, but you are free to substitute values or even inlets.

Some examples:

```javascript
Rpd.nodetype('docs/delay', {
    inlets: { 'this': { type: 'core/any' },
              'that': { type: 'core/any' } },
    outlets: { 'delayed': { type: 'core/any' } },
    tune: function(updates) {
        return updates.delay(3000); // delays all updates for three seconds
    },
    process: function(inlets) {
        return { delayed: inlets['this'] || inlets['that'] };
    }
});
```

```javascript
Rpd.nodetype('docs/timestamp-example', {
    inlets: { 'in': { type: 'util/number' } },
    outlets: { 'out': { type: 'util/number' } },
    tune: function(updates) {
        return updates.map(function(update) {
            var updateCopy = Object.assign({}, update);
            updateCopy.value = { value: update.value,
                                 time: new Date() }
            return updateCopy;
        })
    },
    process: function(inlets) {
        console.log(inlets.in.time);
        return { out: inlets.in.value };
    }
});
```

Receives Node instance as `this`.

##### `handle`: `object`

This object allows you to subscribe to any event this Node produces. _Key_ in this object is the event name, and _value_ is the handler. See [Events](./events.html) section for the complete list of the events.

An example:

```javascript
Rpd.nodetype('docs/handle-events', {
    inlets: { 'in': { type: 'util/number' } },
    outlets: { 'out': { type: 'util/number' } },
    handle: {
        'node/move': function(event) {
            console.log(event);
        },
        'node/add-inlet': function(event) {
            console.log(event);
        },
        'inlet/update': function(event) {
            console.log(event);
        }
    }
});
```

----

#### `node.addInlet(type, alias, [definition]) → Inlet`

Add the input channel to this node, so it will be able to receive data and pass this data inside the node. You need to specify the type of this channel, so the system will know which way to process your data before passing it inside, or even decline connections from other types of channels. `core/any` is the system type which accepts connections from outlets of any type, so probably for start you'd want to use it. Later, though, it could be better to change it to something more specific, i.e. decide that it accepts only numbers or colors values. This will allow you to control the way data in this channel is displayed or even add [custom _value editor_](#rpd-channelrenderer) to this channel.

The second argument, `alias`, is the label of this channel displayed to user and also may be used to access this inlet from inside the node, so it's recommended to make it one-word and start from lowercase letter, like the key names you normally use for JavaScript objects. There is another form of this method, `addInlet(type, alias, label, [definition])`, using which you may specify user-friendly name to display in UI with `label` attribute, and still use short programmer-friendly `alias` to access this inlet from the code.

Last argument, `definition`, is optional, and allows you to override the options inherited from type description for this particular instance. This object is described in details in the [Inlet](#Inlet) <!-- or Rpd.channeltype? --> section below.

```javascript
Rpd.channeltype('docs/topping', {});
Rpd.channeltype('docs/cone', {});
Rpd.channeltype('docs/taste', {});
Rpd.channeltype('docs/size', {
    show: function(value) { return '#' + value }
});
Rpd.channeltype('docs/yoghurt', {});

var frozenYoghurtFactoryNode = patch.addNode('core/basic', 'Frozen Yoghurt', {
    process: function(inlets) { return { yoghurt: inlets } };
});
var toppingInlet = frozenYoghurtFactoryNode.addInlet('docs/topping', 'topping');
var coneInlet = frozenYoghurtFactoryNode.addInlet('docs/cone', 'cone');
var tasteInlet = frozenYoghurtFactoryNode.addInlet('docs/taste', 'taste');
var sizeInlet = frozenYoghurtFactoryNode.addInlet('docs/size', 'size', {
    allow: [ 'util/number' ],
    accept: function(size) { return (size > 0) && (size <= 4); },
    adapt: function(value) { return Math.floor(value); }
});
var yoghurtOutlet = frozenYoghurtFactoryNode.addOutlet('docs/yoghurt', 'yoghurt');

var knob = patch.addNode('util/knob');
knob.inlets['min'].receive(1);
knob.inlets['max'].receive(4);
knob.outlets['number'].connect(sizeInlet);
```

By default, inlets accept connection only from one outlet, so when user connects some other outlet to this inlet, the previous connection, if it existed, is immediately and automatically removed. Though, you can pass an option to the renderer named `inletsAcceptMultipleLinks` and set it to `true`, so multiple connections will be available to user and inlets will receive values from all the outlets connected in order they were fired. <!-- FIXME: check if it is really so and consider #336 -->

You can discover the complete list of the properties which could be used in this definition if you follow to [Inlet Definition](#inlet-definition) section.

#### `node.addOutlet(type, alias, [definition]) → Outlet`

Add the output channel to this node, so it will be able to send data to the inlets of other nodes, when connected to them. Same way as for `addInlet` method described above and following the same reasons, you need to specify the type of the channel, which can be `core/any` while you do experiments and is recommended to be changed to something more specific later, unless this channel was really intended to accept anything.

Also, you need to specify `alias`, to be able to access this outlet from the code using this `alias`. It is recommended to be short, preferably one-word and to start from lowercase letter. If you want to show user something more eye-candy, you may use another form of this method, `addOutlet(type, alias, label, [definition])`.

Last argument, `definition`, is optional, and allows you to override the options inherited from type description for this particular instance. This object is described in details in the [Outlet](#Outlet) <!-- or Rpd.channeltype? --> section below.

```javascript
Rpd.channeltype('docs/meat-type', {});
Rpd.channeltype('docs/rice', {
    adapt: function(choice) {
        if (choice == 1) return 'plain';
        if (choice == 2) return 'mexican';
    }
});
Rpd.channeltype('docs/guacamole', {});
Rpd.channeltype('docs/cheese', {});
Rpd.channeltype('docs/to-go', {});
Rpd.channeltype('docs/spicy', {
    show: function(value) { return '#' + value }
});
Rpd.channeltype('docs/burrito', {});

var burritoFactoryNode = patch.addNode('core/basic', 'Burrito', {
    process: function(inlets) { return { burrito: inlets } }
});
burritoFactoryNode.addInlet('docs/meat-type', 'meat');
burritoFactoryNode.addInlet('docs/rice', 'rice');
burritoFactoryNode.addInlet('docs/guacamole', 'guacamole');
burritoFactoryNode.addInlet('docs/cheese', 'cheese');
burritoFactoryNode.addInlet('docs/to-go', 'to-go');
var spicyInlet = burritoFactoryNode.addInlet('docs/spicy', 'spicy', {
    allow: [ 'util/number' ],
    accept: function(spicy) { return (spicy > 0) && (spicy <= 4); },
    adapt: function(value) { return Math.floor(value); }
});
var burritoOutlet = burritoFactoryNode.addOutlet('docs/burrito', 'burrito', {
    show: function(burrito) {
        var wrapped = Array.isArray(burrito);
        if (wrapped) {
            return '[ Burrito ' + (burrito[0].guacamole ? '+$1.80' : '') + ' ]';
        } else {
            return 'Burrito' + (burrito.guacamole ? '+$1.80' : '')
        }
    },
    tune: function(stream) {
        return stream.map(function(burrito) {
            if (burrito['to-go']) {
                return wrap(burrito);
            } else {
                return burrito;
            }
        });
    }     
});

function wrap(burrito) { return [ burrito ]; }

var knob = patch.addNode('util/knob');
knob.inlets['min'].receive(1);
knob.inlets['max'].receive(4);
knob.outlets['number'].connect(spicyInlet);
```

You can discover the complete list of the properties which could be used in this definition if you follow to [Outlet Definition](#outlet-definition) section.

#### `node.removeInlet(inlet)`

Remove specified inlet from the node. Node stops receiving any updates sent to this inlet and so removes this inlet from its data flow.

```javascript
// works with the example from `node.addInlet(...)` method
frozenYoghurtFactoryNode.removeInlet(toppingInlet);
```

#### `node.removeOutlet(outlet)`

Remove specified outlet from the node. Node stops sending any values passed to this outlet and so removes this outlet from its data flow.

```javascript
// works with the example for `node.addOutlet(...)` method
burritoFactoryNode.removeOutlet(burritoOutlet);
```

#### `node.move(x, y)`

Move this Node to the specified position relatively to the top left corner of the canvas of the Patch it belongs to. `x` and `y` are just numbers, while they could be treated differently by every renderer.

#### `node.turnOn()`

Turn this Node on, so it processes all the incoming updates and sends values further, if it has inputs and outputs. By default Nodes are always turned on.

#### `node.turnOff()`

Turn this Node off, so it stops all the processing. This method is useful when your Node has a lot of connections and you don't want to disconnect or disable them one by one, but to quickly turn them off at once and to have the ability to turn them back on, same way, all at once. <!-- TODO: text -->

<!-- Or, could happen, you may decide to provide user with this nice ability to turn everything off and on, for example when user clicks something located in the body of a node. -->
<!-- TODO: Make an issue for this, to be a bulb in the node header -->

<!-- MARK: Inlet -->

### `Inlet`

Inlet is the name for one of the input channels of the node so, when its connected to something, the data may flow through it _into_ the node processing function from all of them. Inlets are differentiated by their alias, that's why aliases of inlets should be unique inside every node, yet they can be same between two nodes. Inlet is the opposite to Outlet, which allows data to flow _out_ of the node and is described next in this section.

#### Inlet Definition

<!-- PROPLIST: Channel Definition -->

* `label`: `string`
* `default`: `any | stream`
* `hidden`: `boolean`
* `cold`: `boolean`
* `readonly`: `boolean`
* `allow`: `array[string]`
* `accept`: `function`: `(value) → boolean`
* `adapt`: `function`: `(value) → value`
* `show`: `function`: `(value) → string`
* `tune`: `function`: `(values_stream) → values_stream`
* `handle`: `object { <event>*: handler }`

<!-- /PROPLIST -->

Definition of the Inlet is the configuration object used to define
new Channel Type with `Rpd.channeltype` or an object with the same structure, passed to `node.addInlet` method or with `inlets` property to Node type or instance definition, intended to override or to append the Type Definition.

All the functions in the definition get Inlet instance as `this`. <!-- TODO: check -->

```javascript
Rpd.channeltype(..., <channel-definition>);
Rpd.channeltype(..., function() {
    return <channel-definition>;
});

Rpd.nodetype(..., ..., {
    inlets: {
        alias-1: <channel-definition>,
        alias-2: <channel-definition>
    },
    outlets: {
        alias-1: <channel-definition>
    },
    ...
});

var inlet = Rpd.addInlet(..., ..., <channel-definition>)
var outlet = Rpd.addOutlet(..., ..., <channel-definition>);
```

This object may contain no properties at all, or, in cases when Inlet Type or a single Inlet needs its originality, some of these properties:

<!-- NB: there are several checks performed when user connects Outlet to Inlet: allow, accept, adapt -->

##### `label`: `string`

Inlet label, usually displayed near to the inlet. Try to make it short, when possible, so it fits any style.

##### `default`: `any`

Default value for this inlet, which will be sent to it just when node is ready, no matter, has it connections or not. If it has some, values from connection will always be sent after the default value.

```javascript
Rpd.channeltype('docs/color', {
	default: 'black'
});
```

This value can be any type, but also a [Kefir Stream][kefir], so you may configure this inlet to receive several or infinite amount of values just from the start:

```javascript
Rpd.channeltype('docs/alarm', {
    // ring every 24 hours by default
    default: Kefir.interval(1000 * 60 * 60 * 24, './nokia-sound.wav')
});
```

<!-- TODO: test -->

The default value will be passed to `tune`, then `accept` and `adapt` functions before being passed to node's `process` handler. <!-- TODO: check -->

##### `hidden`: `boolean`

You may set an Inlet to be hidden from user, so it is not visible, but yet may receive any data and trigger `process` function. <!-- TODO: test -->.

One of the cases when it comes useful, is when Node has an additional control in its body, and you want to send the output of this control to `process` handler, so it decides if incoming data has higher priority than data from control(s) or merges all the data, both from inlets and control in one as the configuration to calculate the output.

For the example of such, see [Node Renderer](#rpd-noderenderer) description.

##### `cold`: `boolean`

When Inlet is _cold_, any incoming update to this Inlet is _not_ triggering the `process` function call in the Node, unlike with hot Inlets (by default) which trigger the `process` with every update. However the value is saved and passed to the next `process` call later, if some hot inlet triggered it.

```javascript
Rpd.nodetype('docs/microwave', {
    inlets: {
        'food': { type: 'docs/food' },
        'time': { type: 'docs/stopwatch', cold: true, default '1min' },
        'temperature': { type: 'docs/temperature', cold: true, default: 200 }
    },
    outlets: {
       'prepared-food': { type: 'docs/food' }
    },
    process: function(inlets) {
        // will be called only when there's some new food was received
        // i.e. time or temperature updates will be saved but won't trigger cooking
        return: {
            'prepared-food': Kefir.constant(
                prepareFood(inlets.food, inlets.temperature)
            ).delay(inlets.time)
        }
    }
});
```

<!-- TODO: test -->

##### `readonly`: `boolean`

In this case the name of the flag does _not_ mean that user is unable to change the value of the Inlet at all, user still can do it with connecting Inlet to some Outlet, but when Style allows Value Editors near to Inlets in general, this Inlet will have none.

Value Editors are small inputs usually shown when user clicks the value of the inlet and they allow to change the value without the connections. Though not every Channel Type has the Editor, or Style may disable all the Editors, so even while this option is `true` by default, there is no guarantee that there will be an Editor for a value there.

<!-- TODO: change to global rendering configuration -->

##### `allow`: `array[string]`

The list of the Outlet (Channel) Types this Inlet accepts to connect. By default every Inlet accepts only connections from the same Channel Type. When user tries to connect Outlet which type is not on the list, connection is not established and the error is fired. <!-- TODO: test -->

So, Outlet with `util/color` type may always be connected to any `util/color` Inlet, but it can not be connected to `util/nummer` Inlet in any case, unless this Inlet Type,  or this Inlet in particular, has `util/color` in `allow` list. <!-- TODO: check -->

```javascript
Rpd.channeltype('docs/time', {
    allow: [ 'util/number' ],
    adapt: function(value) {
        if (Number.isNumber(value)) {
            return new Date(value); // convert from milliseconds
        } else {
            return value;
        }
    }
});
```

By default, all of the Inlets have `core/any` in allow list, but when user overrides this list, user should include `core/any` there manually, if she wants to allow these connections. <!-- FIXME: correct tests -->

##### `accept`: `function`: `(value) → boolean`

This function allows you to skip/decline some incoming values basing on the value itself, before they come to the `process` handler.

```javascript
Rpd.channeltype('docs/byte', {
    allow: [ 'util/number' ],
    accept: function(value) {
        return (value >= 0) && (value <= 255);
    }
});
```

Actually if you _filter_ the stream of values with `tune` function, the result will be the same, but `accept` function allows you not to mess with the streams for a simple cases when you really don't need to.

Receives Inlet instance as `this`.

##### `adapt`: `function`: `(value) → value`

You may convert every incoming value to some another value or append some data to it, before it comes to the `process` handler.

```javascript
Rpd.channeltype('docs/byte', {
    allow: [ 'util/number' ],
    adapt: function(value) {
        if (value < 0) return 0;
        if (value > 255) return 255;
        return value;
    }
});
```

Actually if you _map_ the stream of values with `tune` function, the result will be the same, but `adapt` function allows you not to mess with the streams for a simple cases when you really don't need to.

Receives Inlet instance as `this`.

##### `show`: `function`: `(value) → string`

This function is called by Renderer when it shows the Inlet value near to it. By default, it just uses `.toString` over the value.

It is useful to convert complex values to some short summaries here. For example, when your Channel sends arrays as values, it is better to shorten the description just to the length of array and what type of elements are inside.

```javascript
Rpd.channeltype('docs/radians', {
    allow: [ 'util/number '],
    accept: function(value) {
        return (value >= 0) && (value <= (2 * Math.PI));
    }
    show: function(value) {
        // just an example, do not use in production
        var degrees = Math.round(value / Math.PI * 180);
        if (degrees == 360) return '2π';
        if (degrees > 270) return '3π/2 > α > 2π';
        if (degrees == 270) return '3π/2';
        if (degrees > 180) return 'π > α > 3π/2';
        if (degrees == 180) return 'π';
        if (degrees > 90) return 'π/2 > α > π';
        if (degrees == 90) return 'π/2';
        if (degrees > 0) return '0π > α > π/2';
        return '0π';
    }
});
```

<!-- TODO: test -->

Receives Inlet instance as `this`.

##### `tune`: `function`: `(values_stream) → values_stream`

With the help of `tune` function you may freely modify the incoming stream of values, delay them, filter them or even reduce them to something else. When you know the power of [Streams][kefir], you are literally the Master of this Inlet. On the other hand, when something unpredictable happens with values coming through, you may confuse the user, so if you hardly modify them, please pay attention to additionally describe or demonstrate why/how you do it, in the UI of your Node or somewhere nearby.

```javascript
Rpd.channeltype('docs/synchronized', function() {
    tune: function(stream) {
        // emit last received value exactly with a second pause
        return stream.throttle(1000);
    }
});
```

<!-- TODO: test -->

Receives Inlet instance as `this`.

##### `handle`: `object`

This object allows you to subscribe to any event this Node produces. _Key_ in this object is the event name, and _value_ is the handler. See [Events](#) section for the complete list of the events.

An example:

```javascript
```

Every handler receives Inlet instance as `this`.

----

#### `inlet.receive(value)`

Force this inlet to receive some specific value, overpassing the connections, if there are any.

Channel mechanics are involved only partly in this case, but the value is still checked if it is allowed by channel type, and if it does, then it is adapted following the channel type definition. <!-- TODO: ensure -->

When inlet is cold, it also can postpone sending the value, till other hot inlet triggers node update.

```javascript
myNode.addInlet('docs/number', 'num').receive(42);
myNode.addInlet('docs/date', 'date').receive(Date.parse('Apr 10, 2015'););
myNode.addInlet('docs/radians', 'angle').receive(Math.PI);
```

#### `inlet.stream(stream)`

Force this inlet to receive stream of values. RPD uses `Kefir` library to provide streams. Value streams provide practically infinite possibilities, you can send values with time intervals, throttle values by time, combine different streams in unlimited ways, actually everything.

You may find complex examples at [Kefir library page][kefir]. Also, usually it is quite easy to convert streams from some another Stream-based library, like RxJS, when you want to use such.

```javascript
// empty object is treated like a bang trigger for `util/bang` channel instances
myNode.addInlet('util/bang', 'bang').stream(Kefir.interval(3000, {}));

// control amount of red in the color using X position of a mouse,
// send it every time mouse position was changed
myNode.addInlet('util/color', 'color').stream(
    Kefir.fromEvents(document.body, 'mousemove')
         .map(function(event) {
             return { x: event.clientX, y: event.clientY };
         })
         .map(function(position) {
             return position.x % 255;
         })
         .map(function(rValue) {
             return { r: rValue, g: 255, b: 255 };
         })
);

// send how many milliseconds passed from the start time approx. every second
var start = new Date();
myNode.addInlet('util/time', 'passed').stream(
    Kefir.fromPoll(1000, function() { return new Date() - start; })
);
```

#### `inlet.toDefault()`

Force default value to be sent into this inlet, breaking its normal flow. It is not recommended to use it often, it is used mostly used in proper cases by RPD itself, but in case when you really need it, just know it's there.

#### `inlet.allows(outlet)`

Check if this inlet allows connections from given outlet. Usually it us done by the renderer <!-- ? --> on connection, but if you want to ensure connection will pass, you may use this method.

<!-- MARK: Outlet -->

### `Outlet`

Outlet is the output channel of the node.

#### Outlet Definition

<!-- PROPLIST: Channel Definition -->

* `label`: `string`
* `show`: `function`: `(value) → string`
* `tune`: `function`: `(values_stream) → values_stream`
* `handle`: `object { <event>*: handler }`

<!-- /PROPLIST -->

Definition of the Inlet is the configuration object used to define
new Channel Type with `Rpd.channeltype` or an object with the same structure, passed to `node.addOutlet` method or with `outlets` property to Node type or instance definition, intended to override or to append the Type Definition.

All the functions in the definition get Inlet instance as `this`.

```javascript
Rpd.channeltype(..., <channel-definition>);
Rpd.channeltype(..., function() {
    return <channel-definition>;
});

Rpd.nodetype(..., ..., {
    inlets: {
        alias-1: <channel-definition>,
        alias-2: <channel-definition>
    },
    outlets: {
        alias-1: <channel-definition>
    },
    ...
});

var inlet = Rpd.addInlet(..., ..., <channel-definition>)
var outlet = Rpd.addOutlet(..., ..., <channel-definition>);
```

This object may contain no properties at all, or, in cases when Outlet Type or a single Outlet needs its originality, some of these properties:

##### `label`: `string`

Outlet label, usually displayed near to the outlet. Try to make it both as short and descriptive as possible, since most of they styles are expecting it to be short. Also, when style options were set not to display values, this can happen that your user won't see a label at all or see it only when she hovers over the Outlet. <!-- check `valuesOnHover` -->

##### `show`: `function`: `(value) → string`

This function is used to show user-friendly string when displaying the value of the Outlet. For example, when your Outlet receives an array of values, by default it will be shown as `[Array]` or if it's an object, as `[Object]` (since by default it just uses `.toString` method of JavaScript), not too user-friendly, isn't it?

Receives Outlet instance as `this`.

##### `tune`: `function`: `(values_stream) → values_stream`

Tuning function is very powerful and allows you to control the outgoing stream of values, modifying some, skipping some, delaying some, or applying a combination of these actions and so completely changing what happens. [Kefir streams][kefir] are what allows to do all these magical things.

But please be aware that when stream of values is heavily modified, user may feel uncomfortable, while it could not be obvious without seeing what happens inside. So try to modify it so user won't see the effect or explain what happens with the help of the UI. For example, when you filter output stream, explain why it is filtered in the body of the Node or better provide user control over filtering with new Inlet.

```javascript
Rpd.channeltype('docs/mouse-pos', {
    tune: function(stream) {
        // output mouse events with a minimum distance of 10 milliseconds
        stream.throttle(10);  
    }
});
```

Receives Outlet instance as `this`.

##### `handle`: `object`

This object allows you to subscribe to any event this Node produces. _Key_ in this object is the event name, and _value_ is the handler. See [Events](#) section for the complete list of the events.

An example:

```javascript
Rpd.channeltype('docs/just-another-outlet', {
    handle: {
        'outlet/connect': function(event) {
            console.log('connected to ', event.inlet);
        }
    }
});
```

Every handler receives Inlet instance as `this`.

----

#### `outlet.connect(inlet) → Link`

Establish a connection between this outlet and given Inlet. It is exactly the same what user does when connects some outlet to some Inlet using interface.

When connection was established, data flows through this wire perfectly, however the receiving end can decline any data on its will, for example when Outlet channel type is not matching the Inlet channel type or is not in the list if Inlet's channel types allowed to connect.

It depends on the options, but by default it is allowed to connect one Outlet to multiple Inlets, but Inlet may have only one incoming connection. So when some Inlet is already connected to an Outlet and you try to connect other Outlet to it, the previous connection should be removed in advance. <!-- TODO: control is performed only in renderer, that's not so good--> For user side of view, it is automatically performed by Renderer, when `config.inletAcceptsMultipleLinks` is set to `true`.

```javascript
var knob1 = patch.addNode('util/knob'),
    knob2 = patch.addNode('util/knob'),
    knob3 = patch.addNode('util/knob');
var color = patch.addNode('util/color');
knob1.outlets['number'].connect(color.inlets['r']);
var knob2ToGreenLink = knob2.outlets['out'].connect(color.inlets['g']);
knob3.outlets['number'].connect(color.inlets['b']);

var always42 = patch.addNode('docs/always-42', 'Always 42');
var outlet = always42.addOutlet('core/any', 'fourty-two', {
    tune: function(stream) {
        return stream.map(function() { return 42; });
    }
});
knob2ToGreenLink.disconnect();
outlet.connect(color.inlets['g']);
outlet.send(Math.PI); // will be converted to 42
```

<!-- test -->

#### `outlet.disconnect(link)`

Break the existing connection, so all the values from this outlet are no more delivered trough this link to the corresponding inlet.


#### `outlet.send(value)`

Force this outlet to send given value to all the connected inlets in other nodes, when there are any. These inlets can yet decline or modify the value basing on the channel type. (see `inlet.receive` description).

```javascript
myNode.addOutlet('docs/number', 'num').send(42);
myNode.addOutlet('docs/date', 'date').send(Date.parse('Mar 18, 2016'););
myNode.addOutlet('docs/radians', 'angle').send(Math.PI / 2);
```

#### `outlet.stream(stream)`

Force this outlet to receive the stream of values, any stream constructed with [Kefir API][kefir]. These values may be distributed over time in any way you want, and last till infinity or till the stream will end.

Yet, same as with `outlet.send`, value may be declined or modified on the receiving ends, when they exist (without interrupting the stream).

```javascript
// empty object is treated like a bang trigger for `util/bang` channel instances
myNode.addOutlet('util/bang').stream(Kefir.interval(3000, {}));

// control amount of white in the color using Y position of a mouse,
// send it every time mouse position was changed
myNode.addOutlet('util/color').stream(
    Kefir.fromEvents(document.body, 'mousemove')
         .map(function(event) {
             return { x: event.clientX, y: event.clientY };
         })
         .map(function(position) {
             return position.y % 255;
         })
         .map(function(value) {
             return { r: value, g: value, b: value };
         })
);
```

<!-- #### `outlet.toDefault()` -->

<!-- MARK: Link -->

### `Link`

Link represents a single connection between Inlet and Outlet <!-- what happens when the connection was declined? -->. By default, one Outlet can be connected to several Inlets, but for Inlets it is not allowed to have more than one incoming connection. This is configurable through `config.inletAcceptsMultipleLinks`, though. `Link` instance is returned from `outlet.connect` method.

#### `link.pass(value)`

Send a value through the link. The rather logical difference with `outlet.send()` is that this action does not apply any of the Outlet value modifiers, like `tune` function. On the other hand, when value comes to the connected Inlet, it applies all the usual modifiers to the value, as if it was sent from the Outlet. <!-- TODO: check --> Also, in default configuration, Outlet may be connected to several Inlets, so in this case value is sent only through this particular link to a single connected Inlet, instead of many.

#### `link.enable()`

Enable this link, so values will flow normally through, as just after the connection. Opposite to `link.disable()`.

#### `link.disable()`

Disable the link temporarily, but the connection actually stays. Practically the same as filtering all the values going through the link.

#### `link.disconnect()`

Remove the connection between given Outlet and Inlet. For ever. Unless new one will be established.

<!-- MARK: modules -->

### modules

<!-- IN PROGRESS -->

#### `history`

##### `Rpd.history.undo()`

##### `Rpd.history.redo()`

#### `io`

#### `navigation`

[kefir]: http://rpominov.github.io/kefir/
