# RPD — Reactive Pure Data

**Version 0.1**

A video of the engine in action demonstrates almost everything:

<!-- TODO -->

* [Features](#features)
* [Planned Features](#planned-features)
* [Using](#using)
* [Participating](#participating)
* [API Reference](#reference)

RPD is a super-minimal plugin-based JS-driven engine for Node-Based User Interfaces — the ones like Pure Data, Quartz Composer, Reaktor, NodeBox, VVVV or any Shader/Material Composing View in your favorite 3D Editor.

And when I say _minimal_, I really mean it:

* The engine code takes 550 lines of pure JS code with comments and stuff, it is 2.18 KB closure-compiled and gzipped;
* The HTML renderer is 1200 lines or so, due to masses of DOM manipulation code, and anyway it is 2.58 KB when compiled;
* [Kefir.js](), required for Reactive Streams support, is ~7KB when gzipped and compiled;

Together it takes only **13KB** when compiled and gzipped, but still provides tons (!) of aweseome features!

Moreover, it's built with the help of Reactive programming (thanks to [Kefir.js](http://pozadi.github.io/kefir/), and it is very minimal itself), and this way it allows a programmer to treat and process any data flow as a stream, so:

```
colorInlet.stream(Kefir.repeatedly(500, ['red', 'navy']));
```

Will send `red` and `navy` values every 500ms to a single color-value inlet in order. It's not the only feature which is available with streams, of course, see below for much more.

Here are some GIFs in reduced quality, in addition to a video in rather good quality above, to help you decide if it worths to use this engine or not (also please take a look at code examples below!).

<!-- TODO -->

The Engine API provides easy ways to program node networks. Or to define a custom node or a channel type. Even node sets (named _toolkits_) are enormously easy to build!

Let's switch to some simple examples. Detailed stuff is under the links below.

Constructing a network of nodes:

<!-- TODO -->

Creating custom nodes is very easy:

<!-- TODO -->

Even very complex ones:

<!-- TODO -->

[Here's]() the engine code at a glance;

## Features

RPD provides following features:

* User may observe nodes, manipulate nodes, connect inlets and outlets, effect is seen immediately; User may edit values on inlets, see results inside node bodies or additionally configure them there;
* _Network model_ may be stored in a simple JS File;
* Developer may build _custom node Toolkits_ to let user re-use them, in a very easy way; And it's not only restricted with configuring inlets and outlets—actually, _every aspect_ of the node or a channel _is configurable_;
* _Streams_ provide developer with an unlimited power in sending, queueing, filtering, mapping/reducing/flattening, packing and un-packing any data, basing on time periods or not; every aspect from Reactive Programming may be used to _operate data streams_;
* _Plugin system_ allows to easily add renderers (HTML is provided, SVG and Canvas renderers are planned) or importers/exporters for specific Toolkits;
* HTML renderer does not uses any style injection except some very minor cases, it only operates CSS classes, and it means you may _completely redesign_ the look of your interface _using only CSS_;
* Developer is free to use _any helper library _(while RPD tries to use only Kefir and nothing else), and it is very easy: i.e. HTML module may easily be replaced with some jQuery analogue.
* Node model may be easily programmed and _updated on-the-fly_ (i.e. while nodes already send some data);
* Node model has _no side-effects_ in functional meaning, every change or update is provided through event streams, no data is stored or changed (expect construction); plugins, on the other hand, are completely free to use any programming model they prefer, and they are actually written in much more imperative style than the Engine;
* It is so _easy to code_ for RPD, I hope community will be able and happy to write new toolkits, renderers and importers and help evolving the engine;

<!--
* Inlets may have the value editors programmed, so user may edit a value in place;
* Nodes may have inner input controls, so it's possible to let user configure input value inside of a node body, in any way you decide;
-->

## Planned Features

* [PureData]() and/or [Animatron]() node Toolkits as an examples out-of-the-box (partly or completely);
* Support Procedures (re-use node sequences by name);
* SVG and Canvas renderers;
* Pure-Data-compatible Import/Export or some special format;
* Infinite Node Workspace;
* Ability to be injected into any part of a page;
* Smarter layouting;
* Support mobile browsers;

More may be seen in [Issues]() section.

## Using

Download [`kefir.min.js`]().

Choose a distribution of RPD and download it:

* [`rpd-core-html.min.js`]() : Core Toolkit, HTML Renderer
* [`rpd-core-pd-html.min.js`]() : Core & PD Toolkits, HTML Renderer
* _(more to come)_

If your choise of renderer is HTML, get a corresponding CSS file:

* [`rpd-core.css`]() : for Core Toolkit
* [`rpd-core-pd.css`]() : for Core & PD Toolkit

Add these files to a head of your page:

For Core Toolikit only:

```html
<script src="./kefir.min.js"></script>
<script src="./rpd-core-html.min.js"></script>
<link rel="stylesheet" href="./rpd-core.css"></style>
```

For Core & PD Toolkits:

```html
<script src="./kefir.min.js"></script>
<script src="./rpd-core-pd-html.min.js"></script>
<link rel="stylesheet" href="./rpd-core-pd.css"></style>
```

Now, you may just initialize user model and let him/her add nodes by himself/herself:

```javascript
var model = Rpd.Model.start().attachTo(document.body)
.renderWith('html');
```

Or, you may add some prepared nodes after that (you may save them to a file, of course):

```javascript
var first = new Rpd.Node('core/empty', 'Test');
var boolOutlet = first.addOutlet('core/bool', true);
first.addOutlet('core/number', 1);
first.addOutlet('core/number');

var second = new Rpd.Node('core/empty', 'Foo');
var boolInlet = second.addInlet('core/bool');
var numInlet = second.addInlet('core/number');

boolOutlet.connect(boolInlet);
boolOutlet.connect(numInlet, function(val) { return (val === true) ? 1 : 0 });
boolOutlet.send(false);
boolOutlet.stream(Kefir.repeatedly(10, [true, false]));
```

## Participating

To participate, get a copy of repository:

`git clone`

Then run:

`npm devel`

To build, run:

`npm build`

Feel free to fix issues or do Pull Requests!

See a Reference below for details in programming Tollkits and different other things.

## Reference
