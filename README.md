# RPD — Reactive Patch Development v2.0.0

[![Join the chat at https://gitter.im/shamansir/rpd](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/shamansir/rpd?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Build Status](https://travis-ci.org/shamansir/rpd.svg?branch=master)](https://travis-ci.org/shamansir/rpd)

<!-- [![Code Climate](https://codeclimate.com/github/shamansir/rpd/badges/gpa.svg)](https://codeclimate.com/github/shamansir/rpd) -->

<a href="http://shamansir.github.io/rpd" title="Reactive Patch Development">
    <img src="https://rawgit.com/shamansir/rpd/v2.0.0/docs/rpd.svg" width="140px" height="140px" />
</a>    

**Latest Version**: [v2.0.0](https://github.com/shamansir/rpd/milestones?state=closed)

_Previous Version_: [v0.1.5](https://github.com/shamansir/rpd/releases/tag/v0.1.5).

A video of the engine v0.1.0 in action, demonstrates some of its features: [ [Watch][video] ].

[![Watch][video-img]][video]

[ [Play online](http://shamansir.github.io/rpd/examples.html) ]

<!-- Examples grid -->

_(NB: Only modern browsers are supported, tested most in Chrome and Safari, no mobile support for now)_

----

**Surely visit** **[Documentation, Examples & More...](http://shamansir.github.io/rpd)**

----

RPD is a super-minimal plugin-based Vanilla-JS-driven engine for Node-Based User Interfaces, or Flow-Based Programming Intefaces, this concept has a lot of names — namely, the ones like Pure Data, Quartz Composer, Reaktor, NodeBox, VVVV or any Shader/Material Composing View in your favorite 3D Editor.

And when I say _minimal_, I really mean it. Minimized and gzipped with its standard configuration, it takes no more than _10KB_! (*)

_(*) Excluding CSS file which usually takes 2-3 KB and [Kefir.js][kefir] requirement, which also usually takes ~10KB, minified and gzipped. Other configurations provided in repository may take from 10 to 20 KB, but users are free to use as many KB as they need._

Moreover, it's built with the help of Reactive programming (thanks to [Kefir.js][kefir]), and this way it allows a programmer to treat and process any data flow as a stream, so:

```javascript
colorInlet.stream(Kefir.sequentially(500, ['red', 'navy']));
```

Will send `red` and `navy` values every 500ms to a single color-value inlet in order. It's not the only feature you get with streams, of course, see below for much more.

Here are some GIFs in reduced quality, in addition to a video in rather good quality above, to help you decide if it worths to use this engine or not (also please take a look at code examples below!).

![Core GIF][core-gif]
![PD GIF][pd-gif]
![Animatron GIF][anm-gif]

The Engine API provides easy ways to program node networks. Or to define a custom node or a channel type. Even node sets (named _toolkits_) are enormously easy to build!

Let's switch to some simple examples. Detailed stuff is under the links below.

**NB:** Despite the **α** (_alpha_) symbol in the version number, API is stable and may be used safely, since it has a very low chance to be changed in nearby future, unless issues will hardly require so. If such occasion will occur despite the above allegations, minor version number will be raised and users will be notified about API changes coming in a new version. Actually **α** (_alpha_) just means that the engine wasn't tested in an enough amount of environments for now, and planned to be removed at the time there will be enough.

Constructing a network of nodes:

```javascript
var patch = Rpd.addPatch('Example');

var firstNode = patch.addNode('core/basic', 'Test');
var boolOutlet = firstNode.addOutlet('core/boolean', 'bool', {
    default: true;
});
firstNode.addOutlet('util/number', { default: 1 });
firstNode.addOutlet('util/number');

var secondNode = patch.addNode('core/basic', 'Foo');
var boolInlet = secondNode.addInlet('util/boolean', 'bool');
var numInlet = secondNode.addInlet('util/number', 'num', {
    allow: [ 'util/boolean' ],
    adapt: function(val) { return (val === true) ? 1 : 0 }
});

boolOutlet.connect(boolInlet);
boolOutlet.connect(numInlet);
boolOutlet.send(false);
boolInlet.stream(Kefir.repeatedly(10, [true, false]));
```

Creating custom node types is very easy:

```javascript
Rpd.nodetype('util/sum-of-three', {
    name: 'Sum of Three',
    inlets: {
        'a': { type: 'util/number', name: 'A', default: 1 },
        'b': { type: 'util/number', name: 'B' },
        'c': { type: 'util/number', name: 'C', hidden: true }
    },
    outlets: {
        'sum': { type: 'util/number', name: '∑' }
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

<!-- Here's the [Util Toolkit][util-toolkit-src] and [its HTML Renderer][util-renderer-src] source codes.
Here's the [Anitmatron Toolkit][anm-toolkit-src] and [its HTML Renderer][anm-renderer-src] source codes.
Here's the [PureData Toolkit][pd-toolkit-src] and [its HTML Renderer][pd-renderer-src] source codes. -->

## Features

RPD provides following features (though probably I forgot a dozen):

* User may observe nodes, manipulate nodes, connect inlets and outlets, effect is seen immediately; User may edit values on inlets, see results inside node bodies or additionally configure them there;
* _Network model_ may be stored in a simple JS File;
* Developer may build _custom node Toolkits_ to let user re-use them, in a very easy way; And it's not only restricted with configuring inlets and outlets—actually, _every aspect_ of the node or a channel _is configurable_;
* _Streams_ provide developer with an unlimited power in sending, queueing, filtering, mapping/reducing/flattening, packing and un-packing any data, basing on time periods or not; every aspect from Reactive Programming may be used to _operate data streams_;
* _Plugin system_ allows to easily add renderers (HTML & SVG renderers are provided, Canvas renderer is planned), styles or importers/exporters for specific Toolkits;
* _Styles_ allow easily and completely change a look of the interface, so your nodes may appear like ones in Blender or like ones in VVVV with just a few changes; **8** different styles are provided out-of-the-box; Also, styles are very easy to extend or create;
* Renderers do not use any direct style injection except some very minor cases, they only operate CSS classes, and it means you may _completely redesign_ the look of your interface _using only CSS_;
* Developer is free to use _any helper library_ (while RPD tries to use only Kefir and nothing else), and it is very easy: i.e. node renderers may easily use jQuery or d3.js;
* JSON and Plain Text Import/Export, both provided as an example, with the ability to write module which _Imports/Exports from/to any format you want_;
* Ability to be _injected into any part of a page_;
* Node model may be easily programmed and _updated on-the-fly_ (i.e. while nodes already send some data);
* Node model has _no side-effects_ in functional meaning, every change or update is provided through event streams, no data is stored or changed (expect construction); plugins, on the other hand, are completely free to use any programming model they prefer, and they are actually written in much more imperative style than the Engine, but yet they do not change the model;
* It is so _easy to code_ for RPD, I hope community will be able and happy to write new toolkits, renderers and importers and help evolving the engine;
* [PureData][puredata], [Animatron][animatron] and more Toolkits as an examples out-of-the-box;
* Supports Procedures (re-use node sub-trees by name);
* Smart layouting;

<!--
* Inlets may have the value editors programmed, so user may edit a value in place;
* Nodes may have inner input controls, so it's possible to let user configure input value inside of a node body, in any way you decide;
-->

## Using

See [Setup](http://shamansir.guthub.io/rpd/sections/setup.html) and [Network](http://shamansir.guthub.io/rpd/sections/network.html) sections in Official Documentation.

## Participating

See [Participation](http://shamansir.guthub.io/rpd/sections/participate.html) sections in Official Documentation.

Feel free to fix issues or do Pull Requests!

[hosted-util]: http://shamansir.github.io/rpd/examples/util.html
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
[video-img]: http://shamansir.github.io/rpd/assets/rpd-vimeo.png
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

[core-gif]: http://shamansir.github.io/rpd/assets/core.gif
[pd-gif]: http://shamansir.github.io/rpd/assets/pd.gif
[anm-gif]: http://shamansir.github.io/rpd/assets/anm.gif

[logo]: http://shamansir.github.io/rpd/assets/logo-small.png
