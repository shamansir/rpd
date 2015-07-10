# RPD — Reactive Pure Data

[![Join the chat at https://gitter.im/shamansir/rpd](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/shamansir/rpd?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Build Status](https://travis-ci.org/shamansir/rpd.svg?branch=master)](https://travis-ci.org/shamansir/rpd)

[![logo][]](http://shamansir.github.io/rpd)

**Latest Stable Version: [v0.1.0](https://github.com/shamansir/rpd/releases/tag/v0.1.0)**

_Version in Development: [v0.1.5](https://github.com/shamansir/rpd/milestones)_

_Examples below are only compatible with the Latest Stable Version_

A video of the engine in action, demonstrates most of its features: [ [Watch][video] ].

[![Watch][video-img]][video]

Play online: [ [Core Toolkit][hosted-core] ] | [ [PD Toolkit][hosted-pd] ] | [ [Animatron Toolkit][hosted-anm] ]

_(NB: Only modern browsers are supported, tested in Chrome and Safari, no mobile support for now)_

----

## Contents

* [Intro](#intro)
* [Features](#features)
* [Planned Features](#planned-features)
* [Using](#using)
* [Participating](#participating)
* [API Reference](#reference)

----

## Intro

RPD is a super-minimal plugin-based JS-driven engine for Node-Based User Interfaces — the ones like Pure Data, Quartz Composer, Reaktor, NodeBox, VVVV or any Shader/Material Composing View in your favorite 3D Editor.

And when I say _minimal_, I really mean it:

* The engine code takes 560 lines of pure JS code with comments and stuff, it is 2.48KB closure-compiled and gzipped;
* The HTML renderer is 1200 lines or so, due to masses of DOM manipulation code, and anyway it is 3.9KB when compiled;
* [Kefir.js][kefir], required for Reactive Streams support, is ~7KB when gzipped and compiled, since it is also targeted as minimal;

Together it takes only **13-14KB** when compiled and gzipped, but still provides tons (!) of aweseome features!

Moreover, it's built with the help of Reactive programming (thanks to [Kefir.js][kefir]), and this way it allows a programmer to treat and process any data flow as a stream, so:

```javascript
colorInlet.stream(Kefir.repeatedly(500, ['red', 'navy']));
```

Will send `red` and `navy` values every 500ms to a single color-value inlet in order. It's not the only feature which is available with streams, of course, see below for much more.

Here are some GIFs in reduced quality, in addition to a video in rather good quality above, to help you decide if it worths to use this engine or not (also please take a look at code examples below!).

![Core GIF][core-gif]
![PD GIF][pd-gif]
![Animatron GIF][anm-gif]

The Engine API provides easy ways to program node networks. Or to define a custom node or a channel type. Even node sets (named _toolkits_) are enormously easy to build!

Let's switch to some simple examples. Detailed stuff is under the links below.

Constructing a network of nodes:

```javascript
var first = new Rpd.Node('core/custom', 'Test');
var boolOutlet = first.addOutlet('core/bool', true);
first.addOutlet('core/number', 1);
first.addOutlet('core/number');

var second = new Rpd.Node('core/custom', 'Foo');
var boolInlet = second.addInlet('core/boolean');
var numInlet = second.addInlet('core/number');

boolOutlet.connect(boolInlet);
boolOutlet.connect(numInlet, function(val) { return (val === true) ? 1 : 0 });
boolOutlet.send(false);
boolOutlet.stream(Kefir.repeatedly(10, [true, false]));
```

Creating custom node types is very easy:

```javascript
Rpd.nodetype('core/sum-of-three-with-body', {
    name: 'Sum of Three w/Body',
    inlets: {
        'a': { type: 'core/number', name: 'A', default: 1 },
        'b': { type: 'core/number', name: 'B' },
        'c': { type: 'core/number', name: 'C', hidden: true }
    },
    outlets: {
        'sum': { type: 'core/number', name: '∑' }
    },
    process: function(inlets) {
        return { 'sum': (inlets.a || 0) + (inlets.b || 0) + (inlets.c || 0) };
    }
});
```

Even very complex ones:

```javascript
Rpd.nodetype('pd/play', function() {
    var lastSound;
    return {
        name: 'play',
        inlets: { 'sound': { type: 'pd/t-obj', default: null } },
        tune: function(updates) { return updates.throttle(50); },
        process: function(inlets, inlets_prev) {
            if (inlets_prev.sound) inlets_prev.sound.pause();
            if (inlets.sound) {
                lastSound = inlets.sound;
                inlets.sound.play();
            }
        },
        handle: {
            'node/turn-off': function() {
                if (lastSound) lastSound.pause();
            }
        }
    }
});
```

[Here's][engine-source] the engine code at a glance;

Here's the [Anitmatron Toolkit][anm-toolkit-src] and [its HTML Renderer][anm-renderer-src] source codes.
Here's the [PureData Toolkit][pd-toolkit-src] and [its HTML Renderer][pd-renderer-src] source codes.

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

* [PureData][puredata] and/or [Animatron][animatron] node Toolkits as an examples out-of-the-box (cover more abilities);
* Support Procedures (re-use node sequences by name);
* SVG and Canvas renderers;
* Pure-Data-compatible Import/Export or some special format;
* Infinite Node Workspace;
* Ability to be injected into any part of a page;
* Smarter layouting;
* Support mobile browsers;

More may be seen in [Issues][issues] section.

## Using

Download [`kefir.min.js`][kefir-src].

Choose a distribution of RPD and download it:

* [`rpd-core-html.min.js`][core-html-src] : Core Toolkit, HTML Renderer
* [`rpd-core-pd-html.min.js`][core-pd-html-src] : Core & PD Toolkits, HTML Renderer
* [`rpd-core-anm-html.min.js`][core-anm-html-src] : Core & Animatron Toolkits, HTML Renderer
* _(more to come)_

If your choice of renderer is HTML, get a corresponding CSS file:

* [`rpd-core.css`][core-style] : for Core Toolkit
* [`rpd-core-pd.css`][core-pd-style] : for Core & PD Toolkit
* [`rpd-core-anm.css`][core-pd-style] : for Core & Animatron Toolkit

Add these files to a head of your page:

For Core Toolkit only:

```html
<script src="./kefir.min.js"></script>
<script src="./rpd-core-html.min.js"></script>
<link rel="stylesheet" href="./rpd-core.css"></link>
```

For Core & PD Toolkits:

Download [`timbre.js`][timbre-src].

```html
<script src="./kefir.min.js"></script>
<script src="./timbre.js"></script>
<script src="./rpd-core-pd-html.min.js"></script>
<link rel="stylesheet" href="./rpd-core-pd.css"></link>
```

For Core & Animatron Toolkits:

Download [`anm-player.min.js`][animatron-src].

```html
<script src="./kefir.min.js"></script>
<script src="./anm-player.min.js"></script>
<script src="./rpd-core-anm-html.min.js"></script>
<link rel="stylesheet" href="./rpd-core-anm.css"></link>
```

Now, you may just initialize user model and let him/her add nodes by himself/herself:

```javascript
var model = Rpd.Model.start().attachTo(document.body)
                             .renderWith('html');
```

Or, you may add some prepared nodes after that (you may save them to a file, of course):

```javascript
var first = new Rpd.Node('core/custom', 'Test');
var boolOutlet = first.addOutlet('core/bool', true);
first.addOutlet('core/number', 1);
first.addOutlet('core/number');

var second = new Rpd.Node('core/custom', 'Foo');
var boolInlet = second.addInlet('core/boolean');
var numInlet = second.addInlet('core/number');

boolOutlet.connect(boolInlet);
boolOutlet.connect(numInlet, function(val) { return (val === true) ? 1 : 0 });
boolOutlet.send(false);
boolOutlet.stream(Kefir.repeatedly(10, [true, false]));
```

## Participating

To participate, get a copy of repository including submodules (which are just optional example Toolkits ([animatron][anm-toolkit-repo] & [puredata][pd-toolkit-repo]), tied to main repository by version tag):

`git clone --recursive git@github.com:shamansir/rpd.git`

If you already have a clone but have no submodules, do there:

`git submodule update --init --recursive`

After that, get dependencies:

`make deps`

(Updating dependencies may be performed only once a version of RPD is increased, it is not required to get them before every build.)

Now you should be able to run examples from `./examples/*.html`.

To minify and join sources (prepare for distribution), ensure you have [Closure Compiler][closure-compiler] installed, put (or link to) `compiler.jar` in the root directory of RPD, and then run, for HTML renderer case:

`make dist-html`

Or, to build a version with PD Toolkit included and HTML renderer, run:

`make dist-pd-html`

To build with Animatron toolkit, for example, just replace `-pd-` with `-anm-`.

You'll find the results under `./dist` folder.

Feel free to fix issues or do Pull Requests!

See a Reference below for details in programming Tollkits and different other things.

## Reference

#### Cheatsheets:

* [HTML Renderer Configuration](http://github.com/shamansir/rpd/wiki/Cheatsheet:HTML-Configuration)
* [Definition Cheatsheet](http://github.com/shamansir/rpd/wiki/Cheatsheet:Definition)
* [Event Cheatsheet](http://github.com/shamansir/rpd/wiki/Cheatsheet:Event)
* [Build a network](http://github.com/shamansir/rpd/wiki/Cheatsheet:Network)
* _(TODO)_ [CSS Styles List](http://github.com/shamansir/rpd/wiki/Cheatsheet:CSS)

#### Toolkits:

* [Core Toolkit](http://github.com/shamansir/rpd/wiki/Toolkit:Core)
* [PD Toolkit](http://github.com/shamansir/rpd/wiki/Toolkit:PD)
* _(TODO)_  [Animatron Toolkit](http://github.com/shamansir/rpd/wiki/Toolkit:Animatron)

#### Class Reference:

* [Model](http://github.com/shamansir/rpd/wiki/Ref:Model)
* [Node](http://github.com/shamansir/rpd/wiki/Ref:Node)
* [Inlet](http://github.com/shamansir/rpd/wiki/Ref:Inlet)
* [Outlet](http://github.com/shamansir/rpd/wiki/Ref:Outlet)
* [Link](http://github.com/shamansir/rpd/wiki/Ref:Link)

[hosted-core]: http://shamansir.github.io/rpd/examples/core.html
[hosted-pd]: http://shamansir.github.io/rpd/examples/pd.html
[hosted-anm]: http://shamansir.github.io/rpd/examples/anm.html

[anm-toolkit-repo]: http://github.com/shamansir/rpd-animatron
[anm-toolkit-src]: https://github.com/shamansir/rpd-animatron/blob/master/toolkit.js
[anm-renderer-src]: https://github.com/shamansir/rpd-animatron/blob/master/render/html.js
[pd-toolkit-repo]: http://github.com/shamansir/rpd-puredata
[pd-toolkit-src]: https://github.com/shamansir/rpd-puredata/blob/master/toolkit.js
[pd-renderer-src]: https://github.com/shamansir/rpd-puredata/blob/master/render/html.js

[issues]: https://github.com/shamansir/rpd/issues
[video]: http://vimeo.com/118197237
[video-img]: http://shamansir.github.io/rpd/rpd-vimeo.png
[kefir]: http://rpominov.github.io/kefir/
[kefir-src]: http://rpominov.github.io/kefir/dist/kefir.min.js
[timbre]: http://mohayonao.github.io/timbre.js/
[timbre-src]: http://mohayonao.github.io/timbre.js/timbre.js
[animatron]: http://animatron.com
<!-- [animatron-src]: http://player.animatron.com/latest/bundle/animatron.min.js -->
[animatron-src]: http://shamansir.github.io/rpd/vendor/anm-player.min.js
[puredata]: http://puredata.info/
[closure-compiler]: https://developers.google.com/closure/compiler/

[engine-source]: https://github.com/shamansir/rpd/blob/master/src/rpd.js

[core-html-src]: http://shamansir.github.io/rpd/dist/rpd-core-html.min.js
[core-pd-html-src]: http://shamansir.github.io/rpd/dist/rpd-core-pd-html.min.js
[core-anm-html-src]: http://shamansir.github.io/rpd/dist/rpd-core-anm-html.min.js
[core-style]: http://shamansir.github.io/rpd/dist/rpd-core.css
[core-pd-style]: http://shamansir.github.io/rpd/dist/rpd-core-pd.css
[core-anm-style]: http://shamansir.github.io/rpd/dist/rpd-core-anm.css

[core-gif]: http://shamansir.github.io/rpd/core.gif
[pd-gif]: http://shamansir.github.io/rpd/pd.gif
[anm-gif]: http://shamansir.github.io/rpd/anm.gif

[logo]: http://shamansir.github.io/rpd/logo-small.png
