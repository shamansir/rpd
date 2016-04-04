---
title: API
id: api
level: 1
---

### `Rpd`

The `Rpd` namespace is a single entry point for your _patch network_, independently on the place where every patch is rendered. It provides you with the ability to append new patches to your own network and control the overall rendering process.

Every patch lays over its own _canvas_, several canvases may be attached to the same _target element_, this will be covered in details below.

<!-- schematic picture of a network -->

From this point and below, let's consider some example to illustrate the practical usage of the described methods. Say, we want to draw the Solar System in static (not that RPD is unable to do it in dynamic, but it's better to consider simple examples at start, isn't it?). We won't do it step-by-step like tutorials do, rather we'll say which method fits particular situation better. For these needs, for every API method there will be a section marked as _Example_. If you really want, the complete code of this example is accessible [here] <!-- TODO -->.

<!-- schematic picture of an example -->

#### `Rpd.renderNext(renderers, targets, config)`

#### `Rpd.stopRendering()`

#### `Rpd.addPatch([title], [def]) -> Patch`

Adds new patch to the network. Patch is a container for a set of nodes and connections between them. Every patch added this way is _opened_ by default, which means that it is rendered right away, and reacts immediately to every following change. You may set a patch title here and, also optionally, define handlers for the [events happening inside](./events.md#Patch), this way:

#### `Rpd.addClosedPatch(title, [def])`

Adds new patch to the network almost the same way as `addPatch` above, but this patch is closed when you add it, so you need to explicitly call its `open()` method when you want this patch to render.

This method becomes useful when you have some dependent patch you don't want to be displayed until requested. This type of patches I'd recommend to call _Procedure Patch_, which is, unlike the _Root Patch_, treated as secondary.

_Example:_

### `Patch`

Patch contains a set of nodes and could be rendered on its own _canvas_, which is an invisible boundind box where this patch is drawn.

<!-- schematic picture of a patch -->

#### `patch.render(renderers, targets, config)`

#### `patch.addNode(type, title, [def])`

Add a

#### `patch.removeNode(node)`

#### `patch.open()`

#### `patch.close()`

#### `patch.inputs(inlets)`

#### `patch.outputs(outlets)`

#### `patch.project(node)`

#### `patch.moveCanvas(x, y)`

#### `patch.resizeCanvas(width, height)`

### `Node`

#### `node.addOutlet(type, alias, [def])`

#### `node.addInlet(type, alias, [def])`

#### `node.removeInlet(inlet)`

#### `node.removeOutlet(outlet)`

#### `node.move(x, y)`

#### `node.node.turnOn()`

#### `node.turnOff()`

### `Outlet`

#### `outlet.connect(inlet)`

#### `outlet.disconnect(link)`

#### `outlet.send(value)`

#### `outlet.stream(stream)`

#### `outlet.toDefault()`

### `Inlet`

#### `inlet.receive(value)`

#### `inlet.stream(stream)`

#### `inlet.toDefault()`

#### `inlet.allows(outlet)`

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
