---
title: Creating Your Own Toolkits
id: toolkits
level: 1
---
​
### Organizational Moments
​
Actually the only recommended thing is to keep directory structure and file names following to the same principle as other toolkits in the sources follow.
Also, `gulp` compilation relies on these rules, so it's also good for proper compilation of RPD.
​
Particularly:
​
* A Toolkit directory lies under `src/toolkit/<toolkit-name>`;
* Below there's at least one file named `toolkit.js`, which defined both Nodes and Channels types in your toolkit;
* If you plan to define HTML renderers for your Nodes and Channels, you should name the file containing the definition as `html.js` and the file with styles as `html.css`. Same rule applies for other renderers, `<renderer-alias>.js` and `<renderer-alias>.css`, i.e. `svg.js` and `svg.css`;
* If you want to have some Model shared between both toolkit and renderers code, feel free to include it into `toolkit.js`;
* If you want to have some code shared only between renderers, place it into an optional file named `shared.js`;
​

Compilation includes `toolkit.js` first, then `shared.js`, if it exists, and then the requested renderer `.js` file.
​
*NB*: There's an agreement to name all nodes and channel types starting with `<toolkit-name>/...`, i.e. `acme/color`, `acme/canvas`.
​
If you are not planning to compile or share the library, though, you are completely free to break the rules the way you want and, for example, define toolkit node types directly in HTML source with only RPD core code included somewhere above. RPD is designed the way where there's as minimum restrictions as possible and, thanks to immutability, breaking the rules is not damaging to anything.
​
### Defining Channel Type
​
Channel type defines the way data transformed or visualized (if ever accepted) when it gets to Inlet or Outlet. Not that simple, though — actually it can be accepted or transformed only by Inlet, since what comes from Outlet is decided by (and encapsulated in) Node and may not be controlled at all, as a private code, but _incoming_ data, for safety, should pass the border-check and customs before it gets to the Node.
​
Nonetheless, all these procedures are defined in one channel type, this way:
​
```javascript
Rpd.channeltype('my/color', {
	...
});
```
​
<!--  example with a node having channels of this type-->
​
Just keep in mind that `adapt`, `allow` and `accept` will be called only by Inlets and `show` will be called both by Inlet or by Outlet.
​
Channel type could define only some of them of none at all, so these are both valid:
​
```javascript
Rpd.channeltype('my/color', {
	show: ...
});
Rpd.channeltype('my/any', {});
```
​
For a complete list of properties could be used to define a Channel, see [Channel Definition](./api.html#channel-definition) in [API section](./api.html).

<!-- IN PROGRESS -->

<!-- TODO -->
​
<span>show</span>...
​
Please do not forget that all the listed properties could be overriden for a particular instance of a channel, when you pass the description object to `node.addInlet` or `node.addOutlet`:
​
```javascript
```
​
### Defining Node Type
​
Technically, Node is a collection of data inputs (Inlets), some data processing function and a collection of data outputs (Outlets). Visually, it also may contain some body with controls.

Same way, as with Channel type, Node type could be just an empty object, so Nodes of this type won't have any Inlets, Outlets, neither will they do anything:

```javascript
Rpd.nodetype('my/empty', {});
```

On the other hand, these Nodes may just visualize something using the Node body or serve as controls for global Network settings etc. Rendering and controlling Node body is [covered below](#writing-a-node-renderer).

So, in the node type you may specify any number of Inlets, any number of Outlets and a processing function which triggers on any Inlet update, gets all the latest values of the Inlets and returns new values for the Outlets (or empty object, if no outlets should be updated).

```javascript
// example only with Outlets
// example only with Inlets
// example with both
```

Definition of the Inlet or Outlet only requires a `type` field, other fields are optional. They are the same as for [Channel type](#channel-properties) and in [`node.addInlet` / `node.addOutlet` methods](./network.md#connecting-nodes).
​
For a complete list of properties could be used to define a Node, see [Node Definition](./api.html#node-definition) in [API section](./api.html).

### Writing a Channel Renderer

* `prepare`
* `show`
* `edit`

For a complete list of properties could be used to define a Channel Renderer, see [Channel Renderer Definition](./api.html#channel-renderer-definition) in [API section](./api.html).

<!-- IN PROGRESS -->
​

### Writing a Node Renderer

* `prepare`
* `size`
* `first`
* `always`

For a complete list of properties could be used to define a Channel Renderer, see [Node Renderer Definition](./api.html#node-renderer-definition) in [API section](./api.html).

<!-- IN PROGRESS -->
​
<!-- valueOut may have a timestamp passed with every value,
     that helps in determining which update came first -->

​
### Writing Custom I/O Module

<!-- IN PROGRESS -->
