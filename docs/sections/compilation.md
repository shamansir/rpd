---
title: Getting Your Version of RPD
id: compilation
level: 1
---
​
### Download
​
RPD with default options can be downloaded here:

* SVG renderer, Quartz style, Core Toolkit, no I/O: [`rpd-svg.min.js`][default-svg-js] (_38KB_, _~11KB_ gzipped) + [`rpd-svg.css`][default-svg-css] (_3.7KB_, _~1KB_ gzipped);
* HTML renderer, Quartz style, Core Toolkit, no I/O: [`rpd-html.min.js`][default-html-js]  (_~40KB_, _~11KB_ gzipped) + [`rpd-html.css`][default-html-css] (_~10KB_, _~2KB_ gzipped);

You'll also need [Kefir.js][kefir], since RPD code is based on Reactive Streams, which it provides.
​
But default options restrict your choice, while RPD provides truly a lot more. See [Compilation](#Compilation) section below for details. And you are safe to transfer your network code to use it with other options, if you already have one.
​
### Setup
​
To use either downloaded or compiled version of RPD, you need to include three files in a page head:
​
```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8" />
        <!-- RPD compiled CSS file, it includes rendering and style-dependent rules (selected Renderer and Style are listed in the top lines of the file) -->
        <link rel="stylesheet" href="http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0/rpd-html.css"></style>
        <!-- Kefir.js library -->
        <script src="http://rawgit.com/rpominov/kefir/gh-pages/dist/kefir.min.js"></script>
        <!-- RPD Library, compiled with the options you specified (they are listed in the first lines of this file so you may to distinguish files compiled with different options even if they have the same name) -->
        <link rel="stylesheet" href="http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0/rpd-html.min.js"></style>
    </head>
    <body>
      <!-- ... -->
    </body>
</html>
```

For the local version, paths would be `./dist/rpd.css`, `./vendor/kefir.min.js` and `./dist/rpd.min.js` accordingly.
​
To test if it works, add the target `div` to the `body` and some code to the bottom of the page:
​
```html
<body>
​
</body>
```
​
### Compilation
​
To compile RPD with custom options, you need to get the latest clone of RPD github repository and have `npm` installed. When compiled, RPD only uses `Kefir.js`, but for building you need few tools installed, however it should be quite easy to get them all:
​
```
$ cd ~/Workspace
$ git clone ...
$ cd ./rpd
$ npm install -g gulp
$ npm install
$ gulp get-deps
$ gulp
```
​
If every command, and especially the last one, was successful, you'll see it created `dist/rpd.min.js` and `dist/rpd.css`. So you've built a version with default options and now you are on the right way. Then, you'll only need to run `gulp` with specific flags listed below.

To be able to view examples from `./examples` directory, you also need to call this command once:

```
gulp get-dev-deps
```

#### Compilation Options

Foremost, it should be noted that you may get the complete list of possible commands and options with calling:

```
gulp help
```

There are a lot more options and commands than we describe here, but in contrast with this literary text, `gulp help` provides you with far more bureaucratic style.
​
Now it's time to use all the powers and chose some options:

* *Renderers* (`-r` or `--renderer`): defines which technique (_HTML_, _SVG_, though there's no _HTML5 Canvas_ renderer yet) will be used to render your Patch;
    * _HTML_:
* *Styles* (`-s` or `--style`): determines the look of your nodes and backgrounds, see [examples below](#selecting-styles);
* *Toolkits* (`-t` or `--toolkit`): there are some predefined toolkits (sets of nodes) in the repository, but except the WebPD, for now they only demonstrate some special aspect of the possibilities you have (i.e. configuring the example sketch for Processing.js toolkit), rather than provide all-sufficient toolboxes;
* *Import/Export* (`-x`, `--io`): provides the ways to save and restore your Patch, nit necessarily from file, but it could be the most used option;
​
Every of the listed options may be specified several times, but for Renderers and Styles it has less sense, unless you have several differently-rendered and differently-styled patches on the same page.

For example, to compile RPD with SVG renderer (instead of default HTML), `plain` style (instead of default `quartz` style), include `timbre` and `anm` toolkits (instead of default `core` toolkit), plus add JSON Import/Export, you need to call:

```
gulp --renderer svg --toolkit anm --toolkit timbre --style plain --io json
```

Or, in short format:

```
gulp -r svg -t anm -t timbre -s plain -x json
```

The order in which options were specified is completely not important.

Both `gulp build` (defaults to `gulp`) and `gulp build-with-gzip` report the resulting file size, since options may affect it in different directions and it could be meaningful for you.

Also, you may select the name of the output file with `--target-name` or `-o` option.

Below there are some examples of different combinations used to compile the same patch:


#### Selecting Renderer
​
#### Selecting Style
​
#### Selecting Toolkits
​
#### Selecting Import/Export Modules

[kefir]: http://github.com/rpominov/kefir
[default-svg-js]: http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0/rpd-svg.min.js
[default-svg-css]: http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0/rpd-svg.css
[default-html-js]: http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0/rpd-html.min.js
[default-html-css]: http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0/rpd-html.css
