### `util` Toolkit Channels and Nodes

#### Channels

* `util/boolean`
* `util/number`
* `util/numbers`
* `util/wholenumber`
* `util/time`
* `util/bang`
* `util/color`
* `util/timestamped`

#### Nodes

##### `util/empty`

* _renderers_: -
* _inlets_: _none_
* _outlets_: _none_

##### `util/nodelist`

* _renderers_: HTML, SVG
* _inlets_: _none_
* _outlets_: _none_

##### `util/log`

* _renderers_: HTML, SVG
* _inlets_:
    * `what`: `core/any`
* _outlets_: _none_

##### `util/number`

* _renderers_: HTML, SVG
* _inlets_: _none_
* _outlets_:
    * `number`: `util/number`

##### `util/random`

* _renderers_: -
* _inlets_:
    * `bang`: `util/bang`
    * `min`: `util/number` (`0`)
    * `max`: `util/number` (`100`)
* _outlets_:
    * `random`: `util/number`

##### `util/bounded-number`

* _renderers_: HTML, SVG
* _inlets_:
    * `min`: `util/number` (`0`)
    * `max`: `util/number` (`Infinity`)
* _outlets_:
    * `number`: `util/number`

##### `util/comment`

* _renderers_: HTML, SVG
* _inlets_:
    * `text`: `core/any` (hidden)
    * `width`: `util/number` (hidden)
* _outlets_: _none_

##### `util/bang`

* _renderers_: HTML, SVG
* _inlets_:
    * `trigger`: `util/bang` (hidden)
* _outlets_:
    * `bang`: `util/bang`

##### `util/metro`

* _renderers_: HTML, SVG
* _inlets_:
    * `enabled`: `util/boolean` (`true`)
    * `period`: `util/time` (`3000`)
* _outlets_:
    * `bang`: `util/bang`

##### `util/color`

* _renderers_: HTML, SVG
* _inlets_:
    * `r`: `util/wholenumber` (`0xED`)
    * `g`: `util/wholenumber` (`0x22`)
    * `b`: `util/wholenumber` (`0x5D`)
* _outlets_:
    * `color`: `util/color`

##### `util/knob`

* _renderers_: SVG
* _inlets_:
    * `min`: `util/number` (`0`)
    * `max`: `util/number` (`100`)
* _outlets_:
    * `number`: `util/number`

##### `util/dial`

* _renderers_: SVG
* _inlets_:
    * `min`: `util/number` (`0`)
    * `max`: `util/number` (`100`)
* _outlets_:
    * `number`: `util/wholenumber`

##### `util/knobs`

* _renderers_: SVG
* _inlets_:
    * `min`: `util/number` (`0`)
    * `max`: `util/number` (`100`)
    * `count`: `util/number` (hidden, `4`)
* _outlets_:
    * `numbers`: `util/numbers`

##### `util/*`

* _renderers_: -
* _inlets_:
    * `a`: `util/number`
    * `b`: `util/number`
* _outlets_:
    * `result`: `core/number`

##### `util/+`

* _renderers_: -
* _inlets_:
    * `a`: `util/number`
    * `b`: `util/number`
* _outlets_:
    * `result`: `core/number`

##### `util/-`

* _renderers_: -
* _inlets_:
    * `a`: `util/number`
    * `b`: `util/number`
* _outlets_:
    * `result`: `core/number`

##### `util/÷`

* _renderers_: -
* _inlets_:
    * `a`: `util/number`
    * `b`: `util/number`
* _outlets_:
    * `result`: `core/number`

##### `util/mod`

* _renderers_: -
* _inlets_:
    * `a`: `util/number`
    * `b`: `util/number`
* _outlets_:
    * `result`: `core/number`

##### `util/mouse-pos`

* _renderers_: SVG
* _inlets_: _none_
* _outlets_:
    * `x`: `util/number`
    * `y`: `util/number`

##### `util/mouse-pos-by-bang`

* _renderers_: SVG
* _inlets_:
    * `bang`: `util/bang`
* _outlets_:
    * `x`: `util/number`
    * `y`: `util/number`

##### `util/letter`

* _renderers_: SVG
* _inlets_:
    * `code`: `util/wholenumber`
* _outlets_:
    * `letter`: `core/any`

##### `util/sum-of-three`

* _renderers_: HTML, SVG
* _inlets_:
    * `a`: `util/number`
    * `b`: `util/number`
    * `c`: `util/number`
* _outlets_:
    * `sum`: `util/number`
