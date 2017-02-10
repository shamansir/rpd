---
title: Getting Your Version of RPD
id: setup
level: 1
---
​
### Download
​
RPD with default options can be downloaded here:

* SVG renderer, Quartz style, no I/O: [`rpd-svg.min.js`][default-svg-js] (_38KB_, _~11KB_ gzipped) + [`rpd-svg.css`][default-svg-css] (_3.7KB_, _~1KB_ gzipped);
* HTML renderer, Quartz style, no I/O: [`rpd-html.min.js`][default-html-js]  (_~40KB_, _~11KB_ gzipped) + [`rpd-html.css`][default-html-css] (_~10KB_, _~2KB_ gzipped);

You'll also need [Kefir.js][kefir], since RPD code is based on Reactive Streams, which it provides.

But default options restrict your choice, while RPD provides truly a lot more. See [Compilation](#Compilation) section below for details. And you are surely safe to transfer your network code to use it with other options, if you already have one, the only requirement could be is to change few string values.

### NPM

You also may install RPD from NPM and use the unminified sources from `./node_modules/rpd/src` for development, and then use compiled version in production.

So, install the latest RPD with `npm`:

```sh
$ npm install rpd --no-optional
```
​
To build everything, you'll need `gulp` build tool installed globally:

```sh
$ npm install -g gulp
```

And then just use the `gulp html-head` command from `./node_modules/rpd` to get the list of files you need to include in your HTML file to make everything work, like this:

```sh
$ cd ./node_modules/rpd
$ gulp html-head --root ./node_modules/rpd
```

This returns you the default setup (HTML rendering and Quartz style), but there are much more options [described below](#compilation-options). These options may be used both for compilation and to generate `html-head`.

So, to compile your version in one file (actually, two, `./dist/rpd.min.js` and `./dist/rpd.css`), just use:

```sh
$ gulp # -- here you may pass the same options you used for `html-head`
```

To get the complete list of commands could be used with `gulp`, use:

```sh
$ gulp help
```
​
If you want to run examples, you'll need to install optional dependencies as well, so omit the `--no-optional` flag this time:

```sh
$ cd <YourProjectDir>
$ npm install rpd
$ ls -laF ./node_modules/rpd/examples/
```

Then just try to open pages under `./examples` directory. If they are still not working, ensure you also have installed optional dependencies like `codemirror`, `p5` etc.

### Clone

You may do the same things as above using Github:

```sh
$ git clone git@github.com:shamansir/rpd.git
$ npm install
$ npm install -g gulp
$ gulp help
$ gulp [<..options>] # if you want to compile your custom version
$ gulp html-head --root <PathToYourClone> [<..options>] # if you want to use unminified sourses
```

### Setup
​
To use either downloaded or compiled version of RPD, you need to include three files in a page head:
​
```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8" />

        <!-- Compiled CSS file, it includes rendering and style-dependent
             rules (both Renderer and Style selected at compilation stage are
             listed in the top lines of this file) -->
        <link rel="stylesheet"
              href="http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0/rpd-html.css">
        </link>

        <!-- Kefir.js library -->
        <script src="http://rawgit.com/rpominov/kefir/gh-pages/dist/kefir.min.js"></script>

        <!-- RPD Library, compiled with the options you specified (all these
             options are listed in the first lines of this file, so you may
             distinguish `rpd.js` compiled with different options even while it
             has the same name for all the versions) -->
        <script src="http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0/rpd-html.min.js"></script>

    </head>
    <body>
        <!-- ... -->
    </body>
</html>
```

> Here, remote files are named `rpd-html`, but in majority of cases I personally
> use `rpd.css` and `rpd.js` respectively. All the compilation preferences are
> listed in the comments sections, in both files, including the commands used
> to build them, so it is always easy to get what is included just by looking
> inside.

For the local version, paths would be `./dist/rpd.css`, `./node_modules/kefir/dist/kefir.min.js` and `./dist/rpd.min.js` respectively.
​
To test if it works and see it in action, add the target `div` to the `body` and some code to the bottom of the page:
​
```html
<body style="margin: 0;">
    <div id="target"></div>

    <script>
        Rpd.renderNext('html', document.getElementById('target'),
                       { style: 'quartz' });

        var root = Rpd.addPatch('root').resizeCanvas(800, 400);

        var metro1 = root.addNode('util/metro', 'Metro A').move(40, 20);
        var metro2 = root.addNode('util/metro', 'Metro B').move(40, 120);

        var genA = root.addNode('util/random', 'Generate A').move(300, 10);
        var genB = root.addNode('util/random', 'Generate B').move(300, 160);

        var sum = root.addNode('util/+', 'Sum').move(520, 80);

        genA.outlets['random'].connect(sum.inlets['a']);
        genB.outlets['random'].connect(sum.inlets['b']);

        metro1.outlets['bang'].connect(genA.inlets['bang']);
        metro2.outlets['bang'].connect(genB.inlets['bang']);
    </script>
</body>
```

Detailed instructions on constructing your own Patch Network you may find [in the Network section](./network.html).
​
### Compilation
​
To compile RPD with custom options, you need to get the latest clone of RPD github repository and have `npm` installed. When compiled, RPD only uses `Kefir.js`, but for building you need few tools installed, however it should be quite easy to get them all:
​
```sh
$ cd ~/Workspace
$ git clone ...
$ cd ./rpd
$ npm install -g gulp
$ npm install
$ gulp get-deps
$ gulp
```
​
If every command, and especially the last one, was successful, you'll see it created `dist/rpd.min.js` and `dist/rpd.css`. So you've built a version with default options and now you are on the right way. Then, you'll only need to run `gulp` (with specific flags listed below, if you are not satisfied with default options).

To be able to view examples from `./examples` directory, you also need to call this command once:

```sh
$ gulp get-dev-deps
```

#### Compilation Options

Foremost, it should be noted that you may get the complete list of possible commands and options with calling:

```sh
$ gulp help
```

There are a lot more options and commands than I describe here, but in contrast with this literary text, `gulp help` provides you with far more bureaucratic style.

Also note
​
Now it's time to use all the powers and to configure your preferences:

* *Renderers* (`-r` or `--renderer`): defines which technique (_HTML_, _SVG_, though there's no _HTML5 Canvas_ renderer yet) will be used to render your Patch;
    * _`html`_: renders your Patch using plain HTML tags, i.e. using `<span>`s for links between nodes;
    * _`svg`_: renders your Patch using SVG tags;
* *Styles* (`-s` or `--style`): determines the look of your nodes and backgrounds, see [list of styles below](#styles-and-renderers) or [examples](../examples.htm);
    * _`quartz`_ (HTML & SVG): intended to be used on a full page; default style, normal-sized font, rounded borders for the nodes, connectors are circles, inlets are placed in a vertical column on the left side of the node and distributed over this side, outlets are placed in a vertical column on the right side of the node and distributed over this side;
    * _`pd`_ (HTML & SVG): intended to be used on a full page; normal-sized font, rectangular nodes, header takes the left connectors are circles, inlets are placed in a horizontal row on the top side of the node, outlets are placed in a horizontal row on the bottom side of the node;
    * _`plain`_ (HTML & SVG): intended to be used on a small areas, most minimal style, majorly in black and white; font size is small, nodes are rectangular, titles do not belong to the nodes, inlets are placed in a horizontal row above the node, outlets are placed in a horizontal row below the node;
    * _`compact`_ (HTML & SVG): intended to be used on a small areas; font size is small, nodes are rectangular, node headers are tiny on the left side or absent, inlets are placed in a horizontal row above the node, outlets are placed in a horizontal row below the node;
    * _`compact-v`_ (SVG only): intended to be used on a small areas; font size is small, nodes are rectangular, node headers are tiny or absent, on the top side, inlets are placed in a vertical column on the right side of the node, outlets are placed in a vertical column on the left side the node;
    * _`webpd`_ (SVG only): used to render [WebPd][webpd] toolkit, nodes have no titles, normal-sized font, inlets are placed in a horizontal row above the node, outlets are placed in a horizontal row below the node;
* *Toolkits* (`-t` or `--toolkit`): there are some predefined toolkits (sets of nodes) in the repository, but except the WebPD, for now they only demonstrate some special aspect of the possibilities you have (i.e. configuring the example sketch for Processing.js toolkit), rather than provide all-sufficient toolboxes;
   * _`util`_ (HTML & SVG): optional `util` toolkit with channels to transfer numbers, node with random generator, nodes with spinner to select numbers and some other primitive examples;
   * _`anm`_ (only HTML): the toolkit to demonstrate connection with [Animatron Player][animatron-player] to create generative graphics;
   * _`webpd`_ (only SVG): the toolkit in development, intended to be able to load and run [PureData][puredata] patches using [WebPd][webpd], PureData is mostly used to procedurally generate audio with the help of Node-driven interface;
   * _`timbre`_ (only HTML): the toolkit to demonstrate connection with [timbre.js][timbre] which is an JavaScript API to procedurally generate audio;
* *Import/Export* (`-x`, `--io`): provides the ways to save and restore your Patch, nit necessarily from file, but it could be the most used option;
    * _`json`_: Stores all the performed actions in JSON format and could restore them in order, may be used to add Undo/Redo to the interface or store patches in JSON files;
    * _`pd`_: Used by `webpd` toolkit and uses [WebPd][webpd] library to get required logical information about nodes in the files;
​
Every of the listed options may be specified several times, but for Renderers and Styles it has less sense, unless you have several differently-rendered and differently-styled patches on the same page.

For example, to compile RPD with SVG renderer (instead of default HTML), `plain` style (instead of default `quartz` style), include `timbre` and `anm` toolkits, plus add JSON Import/Export, you need to call:

```sh
$ gulp --renderer svg --toolkit anm --toolkit timbre --style plain --io json
```

Or, in short format:

```sh
$ gulp -r svg -t anm -t timbre -s plain -x json
```

The order in which options were specified is completely not important.

**NB:** Please be aware that, as noted above, some _styles_ or _toolkits_ work only with _particular renderers_.

Both `gulp build` (defaults to `gulp`) and `gulp build-with-gzip` report the resulting file size, since options may affect it in different directions and it could be meaningful for you.

Also, you may select the name of the output file with `--target-name` or `-o` option.

<!-- If you plan to use [d3.js](http://d3js.org/), you may want to exclude the super-tiny version of d3 from compilation using `--no-d3-tiny` flag (though actually it adds not a lot, since it's tiny) -->

I recommend you to visit the [examples page](../examples.html), there you may find several examples for different combinations of styles and renderers used to compile the same patch.

More details on building Patch Networks by yourself, you may find on [the corresponding page](./sections/network.html).

### Styles and Renderers

| Style         | HTML                            | SVG                             | Horz./Vert. | Notes              |
|---------------|---------------------------------|---------------------------------|-------------|--------------------|
| `quartz`      | <span class="positive">✔</span> | <span class="positive">✔</span> | Vertical    | Basic, grotesque style, even though based on Quartz Composer look |
| `pd`          | <span class="positive">✔</span> | <span class="positive">✔</span> | Horizontal  | Nice-looking sandy-colored style with no headers, but a drag handle on the left side of the node |
| `plain`       | <span class="positive">✔</span> | <span class="positive">✔</span> | Horizontal  | Minimal style with simple shapes, few contrast colors and no shadows |
| `compact`     | <span class="positive">✔</span> | <span class="positive">✔</span> | Horizontal  | Nodes made as tiny as possible, small fonts, navy feel; unlike `pd` Style, has vertical headers on the left side of the Node |
| `compact-v`   | <span class="negative">✘</span> | <span class="positive">✔</span> | Vertical    | Same as `compact`, but vertical variant and has headers |
| `ableton`   | <span class="negative">✘</span> | <span class="positive">✔</span> | Vertical    | Contrast-colored style inspired by [Ableton Live UI](https://en.wikipedia.org/wiki/Ableton_Live) with inner inlets/outlets names |
| `ableton-out`   | <span class="negative">✘</span> | <span class="positive">✔</span> | Vertical    | Contrast-colored style inspired by [Ableton Live UI](https://en.wikipedia.org/wiki/Ableton_Live) with outer inlets/outlets names |
| `black-white` | <span class="negative">✘</span> | <span class="positive">✔</span> | Vertical    | Black and White style looking like some schema from an 80's computer book |
| `blender`     | <span class="negative">✘</span> | <span class="positive">✔</span> | Vertical    | Style, almost completely looking like [Blender](http://blender.org) [Material Editor](https://www.blender.org/manual/render/blender_render/materials/nodes/index.html) |
| `webpd`       | <span class="negative">✘</span> | <span class="positive">✔</span> | Horizontal  | Used to render [PureData](https://puredata.info/) Nodes with the help of [WebPd](https://github.com/sebpiq/WebPd) |

### Toolkits and Renderers

| Toolkit        | HTML                            | SVG                             | Notes              |
|----------------|---------------------------------|---------------------------------|--------------------|
| `core`         | <span class="positive">✔</span> | <span class="positive">✔</span> | Only `core/basic` Node type and `core/any` Channel type; always included, no option needed |
| `util`         | <span class="positive">✔</span> | <span class="positive">✔</span> | Utility Nodes: numbers, colors, random generators, everything useful but not obligatory |
| `timbre`       | <span class="positive">✔</span> | <span class="positive">✔</span> | Nodes intended to help user generate sound with [timbre.js](http://mohayonao.github.io/timbre.js/) in future, but has only five basic nodes for the moment |
| `webpd`        | <span class="positive">✔</span> | <span class="positive">✔</span> | The project with a plan to implement complete [PureData](https://puredata.info/) toolkit, but for the web, with the help of [WebPd](https://github.com/sebpiq/WebPd) library |
| `anm`          | <span class="positive">✔</span> | <span class="positive">✔</span> | Demonstrates the ability to generate graphics with [Animatron Player](https://github.com/Animatron/player), includes Spreads logic like the ones [VVVV](http://www.vvvvjs.com/) has |
| [`processing`] | <span class="negative">✘</span> | <span class="positive">✔</span> | Used only in examples, has some Node types to demonstrate how to work with [P5.js](http://p5js.org) |

### Modules

<!-- IN PROGRESS -->

[kefir]: http://github.com/rpominov/kefir
[default-svg-js]: http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0/rpd-svg.min.js
[default-svg-css]: http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0/rpd-svg.css
[default-html-js]: http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0/rpd-html.min.js
[default-html-css]: http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0/rpd-html.css
[animatron-player]: http://animatron.com/player/
[puredata]: https://puredata.info/
[webpd]: https://github.com/sebpiq/WebPd
