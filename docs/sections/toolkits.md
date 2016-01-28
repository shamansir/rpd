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
Channel type defines the way data transformed or visualized (if ever accepted) when it gets to Inlet or Outlet. Not that simple, though — actually it can be accepted or transformed only by Inlet, since what comes from Outlet is decided by and encapsulated in Node and may not be controlled at all, but _incoming_ data, for safety, should pass the border-check before it gets to the Node.
​
However, all these procedures are defined in one channel type, this way:
​
```javascript
Rpd.channeltype('my/color', {
	...
})
```
​
<!--  example with a node having channels of this type-->
​
But `adapt`, `allow` and `accept` will be called only by Inlets and `show` will be called either by Inlet or by Outlet.
​
Channel type could have only some of them of none at all, so these are both valid:
​
```javascript
Rpd.channeltype('my/color', {
	show: ...
});
Rpd.channeltype('my/any', {});
```
​
So, point by point, channel type properties could be:
​
#### name: String
​
####  `show`: `function(value: Any) -> String`
​
<span>show</span>...
​
Please do not forget that all the listed properties could be overriden for a particular instance of a channel, when you pass the object to `node.addInlet` or `node.addOutlet`:
​
```javascript
```
​
### Defining Node Type
​
Technically, Node is a collection of data inputs (Inlets), some data processing function and a collection of data outputs (Outlets). Visually, it also may contain some body with controls.
​
### Writing a Channel Renderer
​
### Writing a Node Renderer
​
<!-- valueOut may have a timestamp passed with every value,
     that helps in determining which update came first -->
​
### Writing Custom I/O Module
