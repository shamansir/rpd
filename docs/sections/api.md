---
title: API
id: api
level: 1
---

### Contents

When you want to provide user with some existing node network or to load and build it from file (for which there is `io` module), you may use Network Building API with these methods:

* `Rpd`
    * `Rpd.addPatch(name) → Patch`
    * `Rpd.addClosedPatch(name) → Patch`
* `Patch`
    * `patch.addNode(title[, definition]) → Node`
    * `patch.removeNode(node)`
    * `patch.inputs(list)`
    * `patch.outputs(list)`
    * `patch.project(node)`
* `Node`    
    * `node.addInlet(alias[, definition]) → Inlet`
    * `node.addOutlet(alias[, definition]) → Outlet`
    * `node.removeInlet(inlet)`
    * `node.removeOutlet(outlet)`
    * `node.turnOn()`
    * `node.turnOff()`
* `Inlet`
    * `inlet.receive(value)`
    * `inlet.stream(stream)`
    * `inlet.toDefault()`
    * `inlet.allows(outlet) → boolean`
* `Outlet`    
    * `outlet.connect(inlet) → Link`
    * `outlet.disconnect(link)`
    * `outlet.send(value)`
    * `outlet.stream(stream)`
* `Link`
    * `link.pass(value)`
    * `link.enable()`
    * `link.disable()`
    * `link.disconnect()`

To control the rendering queue, you may use these methods:

* `Rpd`
    * `Rpd.renderNext(renderers, targets, config)`
    * `Rpd.stopRendering()`
* `Patch`
    * `patch.render(renderers, targets, config)`
    * `patch.open()`
    * `patch.close()`
    * `patch.moveCanvas(x, y)`
    * `patch.resizeCanvas(width, height)`
* `Node`
    * `node.move(x, y)`    

When you want to build your own toolkit, you may decide to register your node & channel types and renderers using these methods:

* `Rpd`
    * [`Rpd.nodetype(type, definition)`](#)
    * `Rpd.channeltype(type, definition)`    
    * `Rpd.noderenderer(type, alias, definition)`        
    * `Rpd.channelrenderer(type, alias, definition)`
    * `Rpd.nodedescription(type, description)`

<!-- * `Rpd.toolkiticon(toolkit, icon)` -->
<!-- * `Rpd.nodetypeicon(toolkit, icon)` -->

These methods will help you in creating your own styles or even renderers:

* `Rpd`
    * `Rpd.style(name, renderer, style)`
    * `Rpd.renderer(alias, renderer)`

<!-- TODO: global `Rpd` object properties -->

To define node type or channel type, to configure some particular node or channel, to define node renderer or channel renderer, you'll need these Definition Objects:

* [Node Definition](#node-definition)
* [Inlet Definition](#inlet-definition)
* [Outlet Definition](#outlet-definition)
* [Node Renderer Definition](#node-renderer-definition)
* [Channel Renderer Definition](#channel-renderer-definition)

### Core types

* Channel
   * `core/any`
* Node
   * `core/basic`
   * `core/reference`

<!-- * `util/nodelist` -->

### Naming rules

Probably you already noticed that naming style in API is different from method to method. I'd like to assure you that everything is under control and has a system before studying out any method. And the rules are simple:

* Static method for _registering_ Node Types, Channel Types, Renderers, Node Renderers, Channel Renderers, Styles etc.: `Rpd.completelylowercase`;
* Any other instance or static method: `instance.usualCamelCase`, preferrably one word;
* Node or Channel type name: `toolkit/word-or-two`;
* Property in a Node Definition, Channel Definition or any other Definition: strictly one word, lowercase;

### `Rpd`

The `Rpd` namespace is a single entry point for your _patch network_, independently on the place where every patch should be rendered. It provides you with the ability to append new patches to your own network and <!-- scurpolously --> control the overall rendering process.

Every patch lays over its own _canvas_, several canvases may be attached to the same _target element_, this will be covered in details below.

> It's important to notice that the whole API is based on processing event streams, same way as Reactive Programming concepts work. All the created instances are immutable, they only react on user actions, with no modifications to the initial state. It guarantees the safety and ability to reverse any operation and also allows you to create streams of data of any complexity, intended to flow between the nodes.

<!-- schematic picture of a network -->

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

Adds new patch to the network. Patch is a container for a set of nodes and connections between them. Every patch added this way is _opened_ by default, which means that it is rendered right away, and reacts immediately to every following change. You may set a patch title here and, also optionally, define handlers for the [events happening inside](./events.md#Patch), this way:

#### `Rpd.addClosedPatch(title, [definition])`

Adds new patch to the network almost the same way as `addPatch` above, but this patch is closed when you add it, so you need to explicitly call its `open()` method when you want this patch to render.

This method becomes useful when you have some dependent patch you don't want to be displayed until requested. This type of patches I'd recommend to call _Procedure Patch_, which is, unlike the _Root Patch_, treated as secondary.

#### `Rpd.nodetype(type, definition)`

Register a new type of the nodes, so you, or the user, may easily create instances of this type with the help of `patch.addNode` or using some other interface.

So you may define once that all the nodes of your type have two inlets and one outlet, which channel types they have, and how the node processes data, and then create 300 instances of this node type, when you really want.

NB: Please note that user may in any case extend the instance with own definition using `patch.addNode(type, definition)` method, add or remove inlets/outles and modify properties. You should not care too much about that or even you need not care at all, but in some rare cases that could be important.

The new `type` name should be in the form `toolkit/typename`. For example, there could be nodes with the types `util/bang`, `util/color`, `blender/render`, `animatron/player`, `processing/color`, `processing/sketch` etc. Prefer one word for the type name when possible, or join several words with dash symbol `-`, when it's really not.

Then goes the definition, which is described in details in [Node Definition](#node-definition) section. Just note that when you need, you may pass a function to this method, it is very useful when you need to share some objects between definitions, so both examples are valid:

```javascript
Rpd.nodetype('docs/foo', {
    inlets: ...,
    outlets: ...,
    process: ...
});

Rpd.nodetype('docs/foo', function() {
    var someSharedVariable;
    var nodeInstance = this;
    return {
        inlets: ...,
        outlets: ...,
        process: ...
    };
});
```

When you need information on creating your own toolkits, head safely to the [Toolkits](./toolkits.html) section.

#### `Rpd.nodedescription(type, description)`

Any node type can have a literary textual description of what this node does in details. Normally renderer shows it in the node list, next to corresponding node type, when available, and also when user hovers over the title of the node.

#### `Rpd.channeltype(type, definition)`

Register a new type of a Channel, so you, or the user, may easily create instances of this type with the help of `node.addInlet` or `node.addOutlet`, or using some other interface.

This helps you to define a Channel properties once and use them everywhere. Some of the channels in Util Toolkit are: `util/number`, which handles number values, `util/boolean` which handles boolean values, `util/color` which handles color values or even `util/bang` which handles Bang signal used to trigger some actions.

NB: Please note that user may in any case extend the Channel with own definition using `node.addInlet(type, alias, definition)` or `node.addOutlet(type, alias, definition)` forms of the methods, change the handlers or options. You should not care too much about that or even you need not care at all, but in some rare cases that could be important.

The new `type` name should be in the form `toolkit/typename`. For example, there could be Channels with the types `util/bang`, `util/color`, `tibre/wave`, `processing/color`, `processing/shape`, `animatron/tween` etc. Prefer one word for the type name when possible, or join several words with dash symbol `-`, when it's really not.

Then goes the definition, which is described in details in [Inlet Definition](#inlet-definition) section. Channel Definition is used both for Inlets and Outlets, but Outlets [lack of several options](#outlet-definition) which are used only for the Inlets. In the case when Outlet was created with a Channel or overriden Channel Definition, that contains some option belonging only to Inlets, this Outlet just doesn't takes these particular options in consideration.

Just note that when you need, you may pass a function to this method, it is very useful when you need to share some objects between definitions, so both examples are valid:

```javascript
```

When you need more details, head safely to the [Toolkits](./toolkits.html) section, which is the tutorial for writing your very own toolkit.

May receive both object or function.

#### `Rpd.noderenderer(type, rendererAlias, definition)`

When you need more details, head safely to the [Toolkits](./toolkits.html) section, which is the tutorial for writing your very own toolkit.

May receive both object or function.

##### `size` : `object`

<!-- ##### `prepare` : `function(patchNode, currentPatchNode)` -->

##### `first` : `function(bodyElm) [→ object]`

<!-- `inlet` -> `default`, `valueOut` -->

##### `always` : `function(bodyElm, inlets, outlets)`

#### `Rpd.channelrenderer(type, rendererAlias, definition)`

When you need more details, head safely to the [Toolkits](./toolkits.html) section, which is the tutorial for writing your very own toolkit.

May receive both object or function.

<!-- ##### `prepare` : `function()` -->

##### `show` : `function(target, value, repr)`

##### `edit` : `function(target, inlet, valueIn) [→ change_stream]`

#### `Rpd.renderer(alias, definition)`

May receive both object or function.

#### `Rpd.style(alias, rendererAlias, definition)`

May receive both object or function.

### `Patch`

Patch contains a set of nodes and could be rendered on its own _canvas_, which is an invisible boundind box where this patch is drawn.

Nodes are connected with links going from outputs of one node to inputs of another. This way data dynamically flows through the patch.

<!-- schematic picture of a patch -->

#### `patch.render(renderers, targets, config)`

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

Opening the patch triggers it to be put into the rendering flow, so it listens for all the following actions and renders them accordingly. If patch yet has no canvas to be drawn onto, engine adds this canvas to the root element before.

All the patches are opened by default, unless they were added with `Rpd.addClosedPatch` method.

Opening and closing patches helps when you have a complex network and you want to isolate some parts of it by moving them in the background. So, you may add the patches you want to hide with `Rpd.addClosedPatch` and open them later (or not open them at all). Also, you may create a special node which refers to some closed patch, passes data inside and then takes the processed data in return. Then, if you want, you may add a button to this node, which, in its turn, opens this closed patch. This approach is decscribed in details together with the `patch.project(node)` method below.

#### `patch.close()`

Closing the patch means that the canvas of this patch is hidden and moved to the background, so user sees no process happening there. Currently the rendering still goes there, yet staying invinsible, but in the future versions it meant to be cached and reduced to the latest changes before opening instead.

#### `patch.project(node)`

Make given node to visually represent current patch<!-- projectOn, projectTo, referenceWith ?-->. It is expected, but not required, for this node to be located in another patch. <!-- TODO: test -->

It helps a lot when you have some complex network with a single large patch and so you probably want to group some nodes and reference them in another patch, while making invisible what happens inside. By _projecting_ a patch into the node, with the help of `patch.inputs` and `patch.outputs`, you can "pack" any part of the network in one single node, and, optionally, let user to take a look inside or even edit, reconnect or rearrange the internals.

#### `patch.inputs(inlets)`

Specify which inlets, no matter from one or different nodes, are the global inputs of this patch. See description of the `patch.project` for details.

#### `patch.outputs(outlets)`

Specify which outlets, no matter from one or different nodes, are the global outputs of this patch. See description of the `patch.project` for details.

#### `patch.moveCanvas(x, y)`

Move the canvas of the patch to given position, treated relatively to the root element's top left corner.

#### `patch.resizeCanvas(width, height)`

Resize the canvas of the patch. This means all the visuals belonging to this patch and happened to be outside of given bounds, become hidden.

### `Node`

Node represents the thing we call procedure in programming: it receives data through its inputs (inlets), does something using that data and returns either the same data, modified or not, or completely different data in response using outputs (outlets). But from this point, it goes beyond, since it may visualize the process inside its body or add some complex visual controls for additional inputs. On the other hand, it may stay in a boring state and have no inputs, no outputs and even no content at all. Everything depends only on yours decision.

#### Node Definition

* `title`: `string`
* `inlets`: `object`
* `outlets`: `object`
* `prepare`: `function`: `(inlets, outlets) → nothing`
* `process`: `function`: `(inlets_values, prev_inlets_values) → outlets_values`
* `tune`: `function`: `(updates_stream) → updates_stream`
* `handle`: `object`

Definition of the Node is the configuration object used to define
new Node Type with `Rpd.nodetype` or an object with the same structure, passed to `patch.addNode` method, intended to override or to append the Type Definition. This object may contain no properties at all, or, in cases when Node Type or a single Node needs its originality, some of the following properties:

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

##### `process`: `function`: `(inlets_values, prev_inlets_values) → outlets_values`

The `process` handler is the main function, the really important one for the Node Type definition. This function is triggered on every update appeared on any of the inlets and converts the data received through inlets to the data which is required to be sent to outlets. For example, `util/*` node, designed to multiply two numbers and send the result out, has a definition like this:

```javascript
Rpd.nodetype('util/*', {
    inlets: { 'a': { type: 'util/number' },
              'b': { type: 'util/number' } },
    outlets: { 'out': { type: 'util/number' } },
    process: function(inlets) {
        return { 'out': (inlets.a || 0) * (inlets.b || 0) };
    }
});
```

Though it is not obligatory to process all the inlets or to send data to every outlet, in some cases this function not cares about input or output at all. When Node Type defines no `process` function or it wasn't defined in `patch.addNode` method, node makes actually nothing.

Another important thing to notice is that you may return [Kefir Stream][kefir] as an outlet value, so the values from this stream will be sent to the outlet just when they are triggered. In this case, however, you should make the stream finite or stop this stream manually, or else streams for one inlet will merge with every next call to `process` function. For the real life example, see `util/metro` node definition in `src/toolkit/util/toolkit.js` file.

Sometimes you may want to trigger `process` function manually with some new data, but you don't want to send it through user inlet. Adding hidden inlet for your internal data is a common trick often used even in Toolkits provided with RPD distribution:

```javascript
Rpd.nodetype('util/bang', {
    inlets: { 'trigger': { type: 'util/bang', hidden: true } },
    outlets: { 'out': { type: 'util/bang' } },
    process: function(inlets) {
        return inlets.trigger ? { 'out': {} } : {};
    }
});
```

Sometimes it is important to know which inlet received the value first and which received its own value later. For example, when node has some input in a body, its updated value is usually sent to hidden inlet, but also user has some visible inlet in the same node to use it when she wants ti override this value from other node. Then we should know, which value came first, from user or from controller inside, so to rewrite controller value only in the first case. `util/timestamped` Channel Type wraps any incoming value with timestamp and will solve all your problems in this case: <!-- TODO: implement -->

```javascript
```

As another option, you may add timestamp to Inlets using their own `tune` function, or using the `tune` function of the Node, which is described just below.

Receives Node instance as `this`.

##### `tune`: `function`: `(updates_stream) → updates_stream`

This function allows you to tune all the updates from the inlets, so, for example, you may skip every second update from specific inlet, or every second update in general. Or you may multiply every new numeric value by 10. It gets the [Kefir Stream][kefir] which represents all the updates from the node inlets merged. When you return the same stream you received from this function, it changes nothing in the process.

An example:

```javascript
Rpd.nodetype('docs/delay', {
    inlets: { 'in': { type: 'util/number' } },
    outlets: { 'out': { type: 'util/number' } },
    tune: function(updates) {
        return updates.delay(1000); // delays updates for one second
    },
    process: function(inlets) {
        return { out: inlets.in };
    }
});
```

Receives Node instance as `this`.

##### `handle`: `object`

This object allows you to subscribe to any event this Node produces. _Key_ in this object is the event name, and _value_ is the handler. See [Events](#) section for the complete list of the events.

An example:


```javascript
```

----

#### `node.addInlet(type, alias, [definition]) → Inlet`

Add the input channel to this node, so it will be able to receive data and pass this data inside the node. You need to specify the type of this channel, so the system will know which way to process your data before passing it inside, or even decline connections from other types of channels. `core/any` is the system type which accepts connections from outlets of any type, so probably for start you'd want to use it. Later, though, it could be better to change it to something more specific, i.e. decide that it accepts only numbers or colors values. This will allow you to control the way data in this channel is displayed or even add custom _value editor_ to this channel.

The second argument, `alias`, is the label of this channel displayed to user and also may be used to access this inlet from inside the node, so it's recommended to make it one-word and start from lowercase letter, like the key names you normally use for JavaScript objects. There is another form of this method, `addInlet(type, alias, label, [definition])`, using which you may specify user-friendly name to display in UI with `label` attribute, and still use short programmer-friendly `alias` to access this inlet from the code.

Last argument, `definition`, is optional, and allows you to override the options inherited from type description for this particular instance. This object is described in details in the [Inlet](#Inlet) <!-- or Rpd.channeltype? --> section below.

By default, inlets accept connection only from one outlet, so when user connects some other outlet to this inlet, the previous connection, if it existed, is immediately and automatically removed. Though, you can pass an option to the renderer named `inletsAcceptMultipleLinks` and set it to `true`, so multiple connections will be available to user and inlets will receive values from all the outlets connected in order they were fired. <!-- FIXME: check if it works and consider #336 -->

You can discover the complete list of the properties which could be used in this definition if you follow to [Inlet Definition](#inlet-definition) section.

#### `node.addOutlet(type, alias, [definition]) → Outlet`

Add the output channel to this node, so it will be able to send data to the inlets of other nodes, when connected to them. Same way as for `addInlet` method described above and following the same reasons, you need to specify the type of the channel, which can be `core/any` while you do experiments and is recommended to be changed to something more specific later, unless this channel was really intended to accept anything.

Also, you need to specify `alias`, to be able to access this outlet from the code using this `alias`. It is recommended to be short, preferably one-word and to start from lowercase letter. If you want to show user something more eye-candy, you may use another form of this method, `addOutlet(type, alias, label, [definition])`.

Last argument, `definition`, is optional, and allows you to override the options inherited from type description for this particular instance. This object is described in details in the [Outlet](#Outlet) <!-- or Rpd.channeltype? --> section below.

You can discover the complete list of the properties which could be used in this definition if you follow to [Outlet Definition](#outlet-definition) section.

#### `node.removeInlet(inlet)`

Remove specified inlet from the node. Node stops receiving any updates sent to this inlet and so removes this inlet from its data flow.

#### `node.removeOutlet(outlet)`

Remove specified outlet from the node. Node stops sending any values passed to this outlet and so removes this outlet from its data flow.

#### `node.move(x, y)`

Move this node to specified position relatively to the top left corner of the canvas of the patch it belongs to.

#### `node.turnOn()`

Turn this node on, so it processes all the incoming updates and sends values further, if it has inputs and outputs. By default nodes are always turned on.

#### `node.turnOff()`

Turn this node off, so it stops all the processing. This method is useful when your node has a lot of connections and you don't want to disconnect or disable them one by one, but to quickly turn them off at once and to have the ability to turn them back on, same way, all at once.

Or, could happen, you want to provide user with this nice ability, for example when user clicks somewhere in the body of a node.
<!-- TODO: Make an issue for this, to be a bulb in the node header -->

### `Inlet`

Inlet is the name for one of the input channels of the node so, when its connected to something, the data may flow through it _into_ the node processing function from all of them. Inlets are differentiated by their alias, that's why aliases of inlets should be unique inside every node, yet they can be same between two nodes. Inlet is the opposite to Outlet, which allows data to flow _out_ of the node and is described next in this section.

#### Inlet Definition

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
* `handle`: `object`

Definition of the Inlet is the configuration object used to define
new Channel Type with `Rpd.channeltype` or an object with the same structure, passed to `node.addInlet` method, intended to override or to append the Type Definition. This object may contain no properties at all, or, in cases when Inlet Type or a single Inlet needs its originality, some of these properties:

All the functions in the definition get Inlet instance as `this`. <!-- TODO: check -->

<!-- NB: there are several checks performed when user connects Outlet to Inlet: allow, accept, adapt -->

##### `label`: `string`

Inlet label, usually displayed near to the inlet. Try to make it short, when possible, so it fits any style.

##### `default`: `any`

Default value for this inlet, which will be sent to it just when node is ready, no matter, has it connections or not. If it has some, values from connection will always be sent after the default value.

```javascript
```

This value can be any type, but also a [Kefir Stream][kefir], so you may configure this inlet to receive several or infinite amount of values just from the start:

```javascript
```

The default value will be passed to `tune`, then `accept` and `adapt` functions before being passed to node's `process` handler. <!-- TODO: check -->

##### `hidden`: `boolean`

You may set an Inlet to be hidden from user, so it is not visible, but yet may receive any data and trigger `process` function. <!-- TODO: test -->.

One of the cases when it comes useful, is when Node has an additional control in its body, and you want to send the output of this control to `process` handler, so it decides if incoming data has higher priority than data from control(s) or merges all the data, both from inlets and control in one as the configuration to calculate the output.

For the example of such, see [Node Renderer](#) description.

##### `cold`: `boolean`

When Inlet is _cold_, any incoming update to this Inlet is _not_ triggering the `process` function call in the Node, unlike with hot Inlets (by default) which trigger the `process` with every update. However the value is saved and passed to the next `process` call later, if some hot inlet triggered it.


```javascript
```

##### `readonly`: `boolean`

In this case the name of the flag does _not_ mean that user is unable to change the value of the Inlet at all, user still can do it with connecting Inlet to some Outlet, but when Style allows Value Editors near to Inlets in general, this Inlet will have none.

Value Editors are small inputs usually shown when user clicks the value of the inlet and they allow to change the value without the connections. Though not every Channel Type has the Editor, or Style may disable all the Editors, so even while this option is `true` by default, there is no guarantee that there will be an Editor for a value there.

##### `allow`: `array[string]`

The list of the Outlet (Channel) Types this Inlet accepts to connect. By default every Inlet accepts only connections from the same Channel Type. When user tries to connect Outlet which type is not on the list, connection is not established and the error is fired. <!-- TODO: test -->

So, Outlet with `util/color` type may always be connected to any `util/color` Inlet, but it can not be connected to `util/nummer` Inlet in any case, unless this Inlet Type,  or this Inlet in particular, has `util/color` in `allow` list. <!-- TODO: check -->

```javascript
```

By default, all of the Inlets have `core/any` in allow list, but when user overrides this list, user should include `core/any` there manually, if she wants to allow these connections. <!-- TODO: check -->

##### `accept`: `function`: `(value) → boolean`

This function allows you to skip/decline some incoming values basing on the value itself, before they come to the `process` handler.

```javascript
```

Actually if you _filter_ the stream of values with `tune` function, the result will be the same, but `accept` function allows you not to mess with the streams for a simple cases when you really don't need to.

Receives Inlet instance as `this`.

##### `adapt`: `function`: `(value) → value`

You may convert every incoming value to some another value or append some data to it, before it comes to the `process` handler.

```javascript
```

Actually if you _map_ the stream of values with `tune` function, the result will be the same, but `adapt` function allows you not to mess with the streams for a simple cases when you really don't need to.

Receives Inlet instance as `this`.

##### `show`: `function`: `(value) → string`

This function is called by Renderer when it shows the Inlet value near to it. By default, it just uses `.toString` over the value.

It is useful to convert complex values to some short summaries here. For example, when your Channel sends arrays as values, it is better to shorten the description just to the length of array and what type of elements are inside.

```javascript
```

Receives Inlet instance as `this`.

##### `tune`: `function`: `(values_stream) → values_stream`

With the help of `tune` function you may freely modify the incoming stream of values, delay them, filter them or even reduce them to something else. When you know the power of [Streams][kefir], you are literally the Master of this Inlet. On the other hand, when something unpredictable happens with values coming through, you may confuse the user, so if you hardly modify them, please pay attention to additionally describe or demonstrate why/how you do it, in the UI of your Node or somewhere nearby.

```javascript
```
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

#### `inlet.stream(stream)`

Force this inlet to receive stream of values. RPD uses `Kefir` library to provide streams. Value streams provide practically infinite possibilities, you can send values with time intervals, throttle values by time, combine different streams in unlimited ways, actually everything.

You may find complex examples at [Kefir library page][kefir]. Also, usually it is quite easy to convert streams from some another Stream-based library, like RxJS, when you want to use such.

<!-- examples -->

#### `inlet.toDefault()`

Force default value to be sent into this inlet, breaking its normal flow. It is not recommended to use it often, it is used mostly used in proper cases by RPD itself, but in case when you really need it, just know it's there.

#### `inlet.allows(outlet)`

Check if this inlet allows connections from given outlet. Usually it us done by the renderer <!-- ? --> on connection, but if you want to ensure connection will pass, you may use this method.

### `Outlet`

Outlet is the output channel of the node.

#### Outlet Definition

* `label`: `string`
* `show`: `function`: `(value) → string`
* `tune`: `function`: `(values_stream) → values_stream`
* `handle`: `object`

Definition of the Inlet is the configuration object used to define
new Channel Type with `Rpd.channeltype` or an object with the same structure, passed to `node.addOutlet` method, intended to override or to append the Type Definition. This object may contain no properties at all, or, in cases when Outlet Type or a single Outlet needs its originality, some of these properties:

All the functions in the definition get Inlet instance as `this`.

##### `label`: `string`

Outlet label, usually displayed near to the outlet. Try to make it both as short and descriptive as possible, since most of they styles are expecting it to be short. Also, when style options were set not to display values, this can happen that your user won't see a label at all or see it only when she hovers over the Outlet. <!-- check `valuesOnHover` -->

##### `show`: `function`: `(value) → string`

This function is used to show user-friendly string when displaying the value of the Outlet. For example, when your Outlet receives an array of values, by default it will be shown as `[Array]` or if it's an object, as `[Object]` (since by default it just uses `.toString` method of JavaScript), not very user-friendly, isn't it?

Receives Outlet instance as `this`.

##### `tune`: `function`: `(values_stream) → values_stream`

Tuning function is very powerful and allows you to control the outgoing stream of values, modifying some, skipping some, delaying some, or applying a combination of these actions and so completely changing what happens. [Kefir streams][kefir] are what allows to do all these magical things.

But please be aware that when stream of values is heavily modified, user may feel uncomfortable, while it could not be obvious without seeing what happens inside. So try to modify it so user won't see the effect or explain what happens with the help of the UI. For example, when you filter output stream, explain why it is filtered in the body of the Node or better provide user control over filtering with new Inlet.

```javascript
```

Receives Outlet instance as `this`.

##### `handle`: `object`

This object allows you to subscribe to any event this Node produces. _Key_ in this object is the event name, and _value_ is the handler. See [Events](#) section for the complete list of the events.

An example:


```javascript
```

Every handler receives Inlet instance as `this`.

----

#### `outlet.connect(inlet) → Link`

Establish a connection between this outlet and given Inlet. It is exactly the same what user does when connects some outlet to some Inlet using interface.

When connection was established, data flows through this wire perfectly, however the receiving end can decline any data on its will, for example when Outlet channel type is not matching the Inlet channel type or is not in the list if Inlet's channel types allowed to connect.

It depends on the options, but by default it is allowed to connect one Outlet to multiple Inlets, but Inlet may have only one incoming connection. So when some Inlet is already connected to an Outlet and you try to connect other Outlet to it, the previous connection should be removed in advance. <!-- TODO: control is permormed only in renderer, that's not so good--> For user side of view, it is automatically performed by Renderer, when `config.inletAcceptsMultipleLinks` is set to `true`.

#### `outlet.disconnect(link)`

Break the existing connection, so all the values from this outlet are no more delivered trough this link to the corresponding inlet.

#### `outlet.send(value)`

Force this outlet to send given value to all the connected inlets in other nodes, when there are any. These inlets can yet decline or modify the value basing on the channel type. (see `inlet.receive` description).

#### `outlet.stream(stream)`

Force this outlet to receive the stream of values, any stream constructed with [Kefir API][kefir]. These values may be distributed over time in any way you want, and last till infinity or till the stream will end.

Yet, same as with `outlet.send`, value may be declined or modified on the receiving ends, when they exist (without interrupting the stream).

#### `outlet.toDefault()`

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

### modules

<!-- IN PROGRESS -->

#### `history`

##### `Rpd.history.undo()`

##### `Rpd.history.redo()`

#### `io`

#### `navigation`

[kefir]: http://rpominov.github.io/kefir/
