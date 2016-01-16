---
title: Getting Your Version of RPD
id: compilation
level: 1
---
​
### Download
​
RPD with default options can be downloaded here:
​
* SVG renderer, Core Toolkit, no I/O, ?KB + CSS
* HTML renderer, Core Toolkit, no I/O, ?KB + CSS
​
You'll also need Kefir.js, since RPD code is based on Reactive Streams, which it provides.
​
But default options restrict your choice, while RPD provides truly a lot more. See [Compilation][#Compilation] section below for details. And you are safe to transfer your network code to use it with other options, if you already have one.
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
        <link rel="stylesheet" href="http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0-alpha/rpd-html.css"></style>
        <!-- Kefir.js library -->
        <script src="http://rawgit.com/rpominov/kefir/gh-pages/dist/kefir.min.js"></script>
        <!-- RPD Library, compiled with the options you specified (they are listed in the first lines of this file so you may to distinguish files compiled with different options even if they have the same name) -->
        <link rel="stylesheet" href="http://rawgit.com/shamansir/rpd/gh-pages/dist/v2.0.0-alpha/rpd-html.min.js"></style>
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
​
Now it's time to use all the powers and chose some options:
​
* *Renderers* (`-r` or `--renderer`): defines which technique (_HTML_, _SVG_, though there's no _HTML5 Canvas_ renderer yet) will be used to render your Patch;
* *Styles* (`-s` or `--style`): determines the look of your nodes and backgrounds, see [examples below](#selecting-styles);
* *Toolkits* (`-t` or `--toolkit`): there are some predefined toolkits (sets of nodes) in the repository, but except the WebPD, for now they only demonstrate some special aspect of the possibilities you have (i.e. configuring the example sketch for Processing.js toolkit), rather than provide all-sufficient toolboxes;
* *Import/Export* (`--io`): provides the ways to save and restore your Patch, nit necessarily from file, but it could be the most used option;
​
All of these options may be specified several times, but for Renderers and Styles it has less sense, unless you have several differently-rendered and differently-styled patches on the same page.

Also, you may select the name of the output file with `--target-name` or `-o` option.
​
Below you may observe the full table of possibilities, and in sub-sections there is a detailed analysis for every single option provided.
​
<!-- Table -->
​
#### Selecting Renderer
​
#### Selecting Style
​
#### Selecting Toolkits
​
#### Selecting Import/Export Modules
