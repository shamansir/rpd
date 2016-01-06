---
title: Introduction
id: index
---

<!-- SVG icon patch: -->
<!-- sun and moon -->
<!-- circle particles -->
<!-- logo color shift -->
<!-- https://www.instagram.com/p/BAH_8hJsCZ4/ ? -->

### What is RPD?

RPD is the abbreviation for _Reactive Patch Development_...

...or, actually, whatever you decide. It is the library which brings node-based user interfaces to the modern web, in full their power (if you know how to use it) and in a very elegant and minimalistic way. _Node-based_ is something like the thing you (probably) see above, (almost) nothing to do with [node.js][node-js]. If you are wondering yet, what that means, _Node-based_ interface is the one where man may visually connect different low-level components using their inputs and outputs and observe the result in real time, take PureData, QuartzComposer, VVVV, NodeBox, Reaktor etc. for example.

<!-- video or some example patch -->

_Elegancy_ is achieved both with providing you a very simple API for building these powerful things, and (thanks to the reactive streams, powered by [Kefir.js library][kefir]) pure functional approach in the core, so it's easy for you to operate with sequences of data over time in any way you want, and also every action performed, (such as adding a node, or connecting something, or sending a value) is atomic, so it can easily be rolled back or stored in, and so restored from, some file.

<!-- code examples -->

_Minimalism_ is another goal of this library, which implies the RPD library size
is kept as minimal as possible, so your customer may load the interface you created using 3G internet or wi-fi limited to some very low speed. Don't ask me why may it happen, it still happens everywhere. Minimalism is here not in paranoid amounts, though&mdash;if feature requires a bit more code, or some task gets very complex with less code, we for sure will add some more code for the sake of simplicity.

The default configuration with [SVG renderer][renderer-comp-section] and [Quartz style][style-comp-section] included takes _11KB_ when compiled, minimized and gzipped! (30KB not gzipped). Though you also need [latest Kefir.js](roman-pominov), the only required dependency to make it work, which adds just ~10KB more, since [Kefir.js author][roman-pominov] also likes minimalism in code.

If you feel you that's you know everything and this library is definitely what you need (and it is!), you may either download the [version with default configuration][download-default] or go straight to [Building Section](./sections/building) to discover how easy it is to grab a code and configure a custom one. If you still feel unsafe, stay with me for a bit.

### Terminology

#### Network

#### Patch

#### Node

#### Channels: Outlet and Inlet

#### Link

[node-js]: http://nodejs.org
[kefir]: http://rpominov.github.io/kefir/
[roman-pominov]: http://rpominov.github.io

[download-default]: TODO
[building-section]: ./sections/building.html
[renderer-comp-section]: ./sections/compilation.html#renderers
[style-comp-section]: ./sections/compilation.html#styles
