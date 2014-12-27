# RPD — Reactive Pure Data

**[IN PROGRESS]**

RPD is a super-minimal plugin-based JS-driven engine for node editors — like Pure Data, Quartz Composer, Reaktor or some Shader/Material Composing View in your favorite 3D Editor.

Moreover, it's built with the help of Reactive programming (thanks to [Kefir.js](http://pozadi.github.io/kefir/)), which allows a programmer to treat any data flow as a stream, so:

```
boolOutlet.stream(Kefir.repeatedly(500, [true, false]));
```

Will send `true` and `false` values every 500ms to a boolean-value outlet. It's not the only feature that uses streams, of course, see below for more.

The Engine itself is 300 lines of JS code, everything else are plugins!

* [Features](#features)
* [Usage](#usage)
* [Programming Model](#programming-model)
* [Events](#events)
* [Toolkits](#toolkits)
* [Renderers](#renderers)
* [Import/Export](#import-export)

## Features

RPD provides following features:

* User may see nodes, manipulate nodes, connect inlets and outlets, effect is seen immediately;
* User has a number of Toolkits, like, i.e. PureData nodes out-of-the-box;
* Plugin system allows to easily add renderers (HTML, SVG and Canvas will be provided) or importers/exporters (PureData will be provided) for specific Toolkits;
* Programmer is free to use any helper library (while RPD tries to use only Kefir and nothing else), and it is very easy: i.e.
* Node model may be easily programmed and updated on-the-fly (i.e. while nodes are already send data);
* Node model has no side-effects in functional meaning, except it produces errors (temporarily), every change or update is provided through event streams, no data is stored or changed (expect constructors); plugins, on the other hand, are completely free to use any programming model they prefer;

## Usage

```html
<script src="./src/vendor/kefir.min.js"></script>
<script src="./src/rpd.js"></script>
<script src="./src/toolkit/core.js"></script>
<script src="./src/render/html.js"></script>
<script src="./src/render/core.html.js"></script>
<link rel="stylesheet" href="./src/render/html.css"></style>
<link rel="stylesheet" href="./src/render/core.html.css"></style>
```

## Programming model

```js
var model = Model.start().attachTo(document.body)
.renderWith('html');

var first = new Node('core/empty', 'Test');
var boolOutlet = first.addOutlet('core/bool', true);
first.addOutlet('core/number', 1);
first.addOutlet('core/number');

var second = new Node('core/empty', 'Foo');
var boolInlet = second.addInlet('core/bool');
var numInlet = second.addInlet('core/number');

boolOutlet.connect(boolInlet);
boolOutlet.connect(numInlet, function(val) { return (val === true) ? 1 : 0 });
boolOutlet.send(false);
boolOutlet.stream(Kefir.repeatedly(10, [true, false]));
```

## Events

* `model/new`
* `node/add`:
* `node/remove`:
* `node/process`
* `inlet/add`:
* `inlet/remove`:
* `inlet/update`:
* `outlet/add`:
* `outlet/remove`:
* `outlet/update`:
* `outlet/connect`:
* `link/adapt`:
* `link/error`:

## Toolkits

* `core/*`
    * _Nodes_
        * `core/empty`
        * `core/default`
    * _Inlets/Outlets_
        * `core/bool`
        * `core/number`
* `pd/*`

### Custom Toolkits

## Renderers

* HTML
* SVG
* Canvas

### Custom Renderers

## Import/Export

### Custom Import/Export
