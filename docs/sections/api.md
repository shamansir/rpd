---
title: API
id: api
level: 1
---

### `Rpd`

The `Rpd` namespace is a single entry point for your _patch network_, independently on the place where every patch is rendered. It provides you with the ability to append new patches to your own network and <!-- scurpolously --> control the overall rendering process.

Every patch lays over its own _canvas_, several canvases may be attached to the same _target element_, this will be covered in details below.

> It's important to notice that the whole API is based on processing event streams, same way as Reactive Programming concepts work. All the created instances are immutable, they only react on user actions, with no modifications to the initial state. It guarantees the safety and ability to reverse any operation and also allows you to create streams of data of any complexity, intended to flow between the nodes.

<!-- schematic picture of a network -->

From this point and below, let's consider some example to illustrate the practical usage of the described methods. Say, we want to draw the Solar System in static (not that RPD is unable to do it in dynamic, but it's better to consider simple examples at start, isn't it?). We won't do it step-by-step like tutorials do, rather we'll say which method fits particular situation better. For these needs, for every API method there will be a section marked as _Example_. If you really want, the complete code of this example is accessible [here] <!-- TODO -->.

<!-- schematic picture of an example -->

#### `Rpd.renderNext(renderers, targets, config)`

#### `Rpd.stopRendering()`

#### `Rpd.addPatch([title], [def]) → Patch`

Adds new patch to the network. Patch is a container for a set of nodes and connections between them. Every patch added this way is _opened_ by default, which means that it is rendered right away, and reacts immediately to every following change. You may set a patch title here and, also optionally, define handlers for the [events happening inside](./events.md#Patch), this way:

#### `Rpd.addClosedPatch(title, [def])`

Adds new patch to the network almost the same way as `addPatch` above, but this patch is closed when you add it, so you need to explicitly call its `open()` method when you want this patch to render.

This method becomes useful when you have some dependent patch you don't want to be displayed until requested. This type of patches I'd recommend to call _Procedure Patch_, which is, unlike the _Root Patch_, treated as secondary.

_Example:_

#### `Rpd.nodetype(type, definition)`

#### `Rpd.nodedescription(type, description)`

#### `Rpd.channeltype(type, definition)`

#### `Rpd.noderenderer(type, rendererAlias, definition)`

#### `Rpd.channelrenderer(type, rendererAlias, definition)`

#### `Rpd.renderer(alias, definition)`

#### `Rpd.style(alias, rendererAlias, definition)`

### `Patch`

Patch contains a set of nodes and could be rendered on its own _canvas_, which is an invisible boundind box where this patch is drawn.

Nodes are connected with links going from outputs of one node to inputs of another. This way data dynamically flows through the patch.

<!-- schematic picture of a patch -->

#### `patch.render(renderers, targets, config)`

#### `patch.addNode(type, title, [def]) → Node`

Add a node, which represents any process over some inputs (inlets) and sends result of the process to its outputs (outlets). A node can have no inputs or no outputs at all, or even both, so in the latter case this node is called self-sufficient.

The type of the node is some previously registered type, for example, `core/basic`. Usually it has the form `toolkit/definition`. You may use a prepared one from the [toolkits](TODO) or easily create your own types for the nodes with [`Rpd.nodetype`](TODO).

You may specify a custom title, if you want, or the engine will fall back to the type name.

_Definition:_

#### `patch.removeNode(node)`

Remove the previously added node, just pass the one you need no more.

#### `patch.open()`

Opening the patch triggers it to be put into the rendering flow, so it listens for all the following actions and renders them accordingly. If patch yet has no canvas to be drawn onto, engine adds this canvas to the root element before.

All the patches are opened by default, unless they were added with `Rpd.addClosedPatch` method.

Opening and closing patches helps when you have a complex network and you want to isolate some parts of it by moving them in the background. So, you may add the patches you want to hide with `Rpd.addClosedPatch` and open them later (or not open them at all). Also, you may create a special node which refers to some closed patch, passes data inside and then takes the processed data in return. Then, if you want, you may add a button to this node, which, in its turn, opens this closed patch. This approach is decscribed in details together with the `patch.project(node)` method below.

#### `patch.close()`

Closing the patch means that the canvas of this patch is hidden and moved to the background, so user sees no process happening there. Currently the rendering still goes there, yet staying invinsible, but in the future versions it meant to be cached and reduced to the latest changes before opening instead.

#### `patch.project(node)`

#### `patch.inputs(inlets)`

#### `patch.outputs(outlets)`

#### `patch.moveCanvas(x, y)`

Move the canvas of the patch to given position, treated relatively to the root element's top left corner.

#### `patch.resizeCanvas(width, height)`

Resize the canvas of the patch. This means all the visuals belonging to this patch and happened to be outside of given bounds, become hidden.

### `Node`

Node represents the thing we call procedure in programming: it receives data through its inputs (inlets), does something using that data and returns either the same data, modified or not, or completely different data in response using outputs (outlets). But from this point, it goes beyond, since it may visualize the process inside its body or add some complex visual controls for additional inputs. On the other hand, it may stay in a boring state and have no inputs, no outputs and even no content at all. Everything depends only on yours decision.

#### `node.addInlet(type, alias, [def]) → Inlet`

Add the input channel to this node, so it will be able to receive data and pass this data inside the node. You need to specify the type of this channel, so the system will know which way to process your data before passing it inside, or even decline connections from other types of channels. `core/any` is the system type which accepts connections from outlets of any type, so probably for start you'd want to use it. Later, though, it could be better to change it to something more specific, i.e. decide that it accepts only numbers or colors values. This will allow you to control the way data in this channel is displayed or even add custom _value editor_ to this channel.

The second argument, `alias`, is the label of this channel displayed to user and also may be used to access this inlet from inside the node, so it's recommended to make it one-word and start from lowercase letter, like the key names you normally use for JavaScript objects. There is another form of this method, `addInlet(type, alias, label, [def])`, using which you may specify user-friendly name to display in UI with `label` attribute, and still use short programmer-friendly `alias` to access this inlet from the code.

Last argument, `def`, is optional, and allows you to override the options inherited from type description for this particular instance. This object is described in details in the [Inlet](#Inlet) section below.

By default, inlets accept connection only from one outlet, so when user connects some other outlet to this inlet, the previous connection, if it existed, is immediately and automatically removed. Though, you can pass an option to the renderer named `inletsAcceptMultipleLinks` and set it to `true`, so multiple connections will be available to user and inlets will receive values from all the outlets connected in order they were fired. <!-- FIXME: check if it works and consider #336 -->

#### `node.addOutlet(type, alias, [def]) → Outlet`

Add the output channel to this node, so it will be able to send data to the inlets of other nodes, when connected to them. Same way as for `addInlet` method described above and following the same reasons, you need to specify the type of the channel, which can be `core/any` while you do experiments and is recommended to be changed to something more specific later, unless this channel was really intended to accept anything.

Also, you need to specify `alias`, to be able to access this outlet from the code using this `alias`. It is recommended to be short, preferably one-word and to start from lowercase letter. If you want to show user something more eye-candy, you may use another form of this method, `addOutlet(type, alias, label, [def])`.

Last argument, `def`, is optional, and allows you to override the options inherited from type description for this particular instance. This object is described in details in the [Outlet](#Outlet) section below.

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

#### `inlet.receive(value)`

Force this inlet to receive some specific value, overpassing the connections, if there are any.

Channel mechanics are involved only partly in this case, but the value is still checked if it is allowed by channel type, and if it does, then it is adapted following the channel type definition. <!-- TODO: ensure -->

#### `inlet.stream(stream)`

Force this inlet to receive stream of values. RPD uses `Kefir` library to provide streams. Value streams provide practically infinite possibilities, you can send values with time intervals, throttle values by time, combine different streams in unlimited ways, actually everything.

You may find complex examples at [Kefir library page](). Also, usually it is quite easy to convert streams from some another Stream-based library, like RxJS, when you want to use such.

<!-- examples -->

#### `inlet.toDefault()`

#### `inlet.allows(outlet)`

### `Outlet`

#### `outlet.connect(inlet) → Link`

Establish a connection between this outlet and given inlet. It is exactly the same what user does when connects some outlet to some inlet using interface.

When connection was established, data flows through this wire perfectly, but the receiving end can decline any data on its will, for example when outlet channel type is not matching the inlet channel type or is not in the list if inlet's channel types allowed to connect.

#### `outlet.disconnect(link)`

#### `outlet.send(value)`

#### `outlet.stream(stream)`

#### `outlet.toDefault()`

### `Link`

#### `link.enable()`

#### `link.disable()`

#### `link.disconnect()`

### modules

#### `history`

##### `Rpd.history.undo()`

##### `Rpd.history.redo()`

#### `io`

#### `navigation`
