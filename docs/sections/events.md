---
title: Subscribing to Events
id: events
level: 1
---

<!-- IN PROGRESS -->

### Global Events

<!-- IN PROGRESS -->

### Network Events

* `network/add-patch`: `patch`

<!-- IN PROGRESS -->

### Patch Events

* `patch/is-ready`: _none_
* `patch/open`: `parent`
* `patch/close`: _none_
* `patch/move-canvas`: `position`
* `patch/resize-canvas`: `size`
* `patch/set-inputs`: `inputs`
* `patch/set-outputs`: `outputs`
* `patch/project`: `node`, `target`
* `patch/refer`: `node`, `target`
* `patch/add-node`: `node`
* `patch/remove-node`: `node`

<!-- IN PROGRESS -->

### Node Events

* `node/turn-on`: _none_
* `node/is-ready`: _none_
* `node/process`: `inlets`, `outlets` (not called unless Node has `process` handler)
* `node/turn-off`: _none_
* `node/add-inlet`: `inlet`
* `node/remove-inlet`: `inlet`
* `node/add-outlet`: `outlet`
* `node/remove-outlet`: `outlet`
* `node/move`: `position`

<!-- IN PROGRESS -->

### Outlet Events

* `outlet/update`: `value`
* `outlet/connect`: `link`, `inlet`
* `outlet/disconnect`: `link`

<!-- IN PROGRESS -->

### Inlet Events

* `inlet/update`: `value`

<!-- IN PROGRESS -->

### Link Events

* `link/enable`: _none_
* `link/disable`: _none_
* `link/pass`: `value`

<!-- IN PROGRESS -->
