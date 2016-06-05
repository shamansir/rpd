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

### `Rpd`

The `Rpd` namespace is a single entry point for your _patch network_, independently on the place where every patch should be rendered. It provides you with the ability to append new patches to your own network and <!-- scurpolously --> control the overall rendering process.

Every patch lays over its own _canvas_, several canvases may be attached to the same _target element_, this will be covered in details below.

> It's important to notice that the whole API is based on processing event streams, same way as Reactive Programming concepts work. All the created instances are immutable, they only react on user actions, with no modifications to the initial state. It guarantees the safety and ability to reverse any operation and also allows you to create streams of data of any complexity, intended to flow between the nodes.

<!-- schematic picture of a network -->

<!-- From this point and below, let's consider some example to illustrate the practical usage of the described methods. Say, we want to draw the Solar System in static (not that RPD is unable to do it in dynamic, but it's better to consider simple examples at start, isn't it?). We won't do it step-by-step like tutorials do, rather we'll say which method fits particular situation better. For these needs, for every API method there will be a section marked as _Example_. If you really want, the complete code of this example is accessible [here] --> <!-- TODO -->.

<!-- schematic picture of an example -->

#### `Rpd.renderNext(renderers, targets, config)`

#### `Rpd.stopRendering()`

#### `Rpd.addPatch([title], [definition]) → Patch`

Adds new patch to the network. Patch is a container for a set of nodes and connections between them. Every patch added this way is _opened_ by default, which means that it is rendered right away, and reacts immediately to every following change. You may set a patch title here and, also optionally, define handlers for the [events happening inside](./events.md#Patch), this way:

#### `Rpd.addClosedPatch(title, [definition])`

Adds new patch to the network almost the same way as `addPatch` above, but this patch is closed when you add it, so you need to explicitly call its `open()` method when you want this patch to render.

This method becomes useful when you have some dependent patch you don't want to be displayed until requested. This type of patches I'd recommend to call _Procedure Patch_, which is, unlike the _Root Patch_, treated as secondary.

#### `Rpd.nodetype(type, definition)`

Register a new type of the nodes, so you, or the user, may easily create instances of this type with the help of `patch.addNode`.
So you may define once that all the nodes of your type have two inlets and one outlet, which channel types they have, and how the node processes data, and then create 300 instances of this node type, when you really want.

NB: Please note that user may in any case extend the instance with own definition, add or remove inlets/outles and modify properties. You should not care too much about that or even you need not care at all, but in some rare cases that could be important.

The new `type` name should be in the form `toolkit/typename`. For example, there could be nodes with the types `util/bang`, `util/color`, `blender/render`, `animatron/player`, `processing/color`, `processing/sketch` etc. Prefer one word for the type name when possible, or join several words with dash symbol `-`, when it's really not.

Then goes the definition:

* `title`: ...

When you need more details, head safely to the [Toolkits](./toolkits.html) section, which is the tutorial for writing your very own toolkit.

#### `Rpd.nodedescription(type, description)`

Any node type can have a literary textual description of what this node does in details. Normally renderer shows it in the node list, next to corresponding node type, when available, and also when user hovers over the title of the node.

#### `Rpd.channeltype(type, definition)`

When you need more details, head safely to the [Toolkits](./toolkits.html) section, which is the tutorial for writing your very own toolkit.

#### `Rpd.noderenderer(type, rendererAlias, definition)`

When you need more details, head safely to the [Toolkits](./toolkits.html) section, which is the tutorial for writing your very own toolkit.

#### `Rpd.channelrenderer(type, rendererAlias, definition)`

When you need more details, head safely to the [Toolkits](./toolkits.html) section, which is the tutorial for writing your very own toolkit.

#### `Rpd.renderer(alias, definition)`

#### `Rpd.style(alias, rendererAlias, definition)`

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

You can discover the complete list of the properties which could be used in this definition if you follow to [Node Definition](#node-definition) section.

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

Definition of the Node is the configuration object used to define
new Node Type with `Rpd.nodetype` or an object with the same structure, passed to `patch.addNode` method, intended to override or to append the Type Definition. This object may contain no properties at all, or, in cases when Node Type or a single Node needs its originality, some of these properties:

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

Receives Node instance as `this`.

##### `process`: `function`: `(inlets_values, prev_inlets_values) → outlets_values`

Receives Node instance as `this`.

##### `tune`: `function`: `(updates_stream) → updates_stream`

Receives Node instance as `this`.

##### `handle`: `object`

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

#### _Inlet Definition_

Definition of the Inlet is the configuration object used to define
new Channel Type with `Rpd.channeltype` or an object with the same structure, passed to `node.addInlet` method, intended to override or to append the Type Definition. This object may contain no properties at all, or, in cases when Inlet Type or a single Inlet needs its originality, some of these properties:

* `label` (_string_, `''`) — inlet label, usually displayed near to the inlet;
* `default`
* `hidden`
* `cold`
* `readonly`
* `allow`
* `accept`
* `adapt`
* `tune`
* `show`
* `handle`

All the functions in the definition get Inlet instance as `this`.

----

#### `inlet.receive(value)`

Force this inlet to receive some specific value, overpassing the connections, if there are any.

Channel mechanics are involved only partly in this case, but the value is still checked if it is allowed by channel type, and if it does, then it is adapted following the channel type definition. <!-- TODO: ensure -->

When inlet is cold, it also can postpone sending the value, till other hot inlet triggers node update.

#### `inlet.stream(stream)`

Force this inlet to receive stream of values. RPD uses `Kefir` library to provide streams. Value streams provide practically infinite possibilities, you can send values with time intervals, throttle values by time, combine different streams in unlimited ways, actually everything.

You may find complex examples at [Kefir library page](). Also, usually it is quite easy to convert streams from some another Stream-based library, like RxJS, when you want to use such.

<!-- examples -->

#### `inlet.toDefault()`

#### `inlet.allows(outlet)`

Check if this inlet allows connections from given outlet. Usually it us done by the renderer <!-- ? --> on connection, but if you want to ensure connection will pass, you may use this method.

### `Outlet`

Outlet is the output channel of the node.

#### _Outlet Definition_

Definition of the Inlet is the configuration object used to define
new Channel Type with `Rpd.channeltype` or an object with the same structure, passed to `node.addOutlet` method, intended to override or to append the Type Definition. This object may contain no properties at all, or, in cases when Outlet Type or a single Outlet needs its originality, some of these properties:

* `label` (_string_, `''`) — inlet label, usually displayed near to the inlet;
* `tune`
* `show`
* `handle`

All the functions in the definition get Inlet instance as `this`.

----

#### `outlet.connect(inlet) → Link`

Establish a connection between this outlet and given inlet. It is exactly the same what user does when connects some outlet to some inlet using interface.

When connection was established, data flows through this wire perfectly, however the receiving end can decline any data on its will, for example when outlet channel type is not matching the inlet channel type or is not in the list if inlet's channel types allowed to connect.

It depends on the options, but by default it is allowed to connect one outlet to multiple inlets, but inlet may have only one connection, so when inlet is already connected to an outlet and you connect it to another, the previous one should be disconnected. <!-- TODO: control is permormed only in renderer, that's not so good-->

#### `outlet.disconnect(link)`

Break the existing connection, so all the values from this outlet are no more delivered trough this link to the corresponding inlet.

#### `outlet.send(value)`

Force this outlet to send given value to all the connected inlets in other nodes, when there are any. These inlets can yet decline or modify the value basing on the channel type. (see `inlet.receive` description).

#### `outlet.stream(stream)`

Force this outlet to receive the stream of values, any stream constructed with [Kefir API](http://kefir). These values may be distributed over time in any way you want, and last till infinity or till the stream will end.

Yet, same as with `outlet.send`, value may be declined or modified on the receiving ends, when they exist (without interrupting the stream).

#### `outlet.toDefault()`

### `Link`

Link represents a single connection between inlet and outlet <!-- what happens when the connection was declined? -->. Its instance is returned from `outlet.connect` method.

#### `link.enable()`

Enable this link, so values will flow normally through, as just after the connection.

#### `link.disable()`

Disable the link temporarily, but the connection actually stays.

#### `link.disconnect()`

### modules

#### `history`

##### `Rpd.history.undo()`

##### `Rpd.history.redo()`

#### `io`

#### `navigation`
