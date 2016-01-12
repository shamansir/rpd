---
title: Getting Your Version of RPD
id: compilation
level: 1
---

### Download

RPD with default options can be downloaded here:

* SVG renderer, Core Toolkit, no I/O, ?KB + CSS
* HTML renderer, Core Toolkit, no I/O, ?KB + CSS

You'll also need Kefir.js, since RPD code is based on Reactive Streams, which it provides.

But default options restrict your choice, while RPD provides truly a lot more. See [Compilation][#Compilation] section below for details.

### Setup

To use either downloaded or compiled version of RPD, you need to include three files in a page head:

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8" />

    </head>
    <body>
      <!-- ... -->
    </body>
</html>
```

To test if it works, add the target `div` to `body` and some code to the bottom of the page:

```html
<body>

</body>
```

### Compilation

#### Selecting Toolkits

#### Selecting Renderer

#### Selecting Style

#### Selecting Import/Export Modules
