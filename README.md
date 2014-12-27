# RPD — Reactive Pure Data

RPD is a super-minimal plugin-based JS-driven engine for node editors — like Pure Data, Quartz Composer or some Shader/Material Composing View in your favorite 3D Editor.

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

## Usage

## Programming model

## Events

## Toolkits

## Renderers

## Import/Export
