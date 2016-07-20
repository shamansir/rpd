---
title: Participating in Development
id: participation
level: 1
---

Actually, to help in RPD development you just need to create a fork of the repository, and be able to compile and test it. So, please follow the instructions in the [Setup page](./setup.html) first and then run:

```sh
$ npm install
$ gulp get-deps
$ gulp get-dev-deps
$ gulp
$ gulp test
```

If everything above succeeded, you may look through examples located in `/examples` folder locally, then jump through the code and actually change things, ensuring that `gulp test` passses and writing tests for new features.

Currently there's no `watch` mode in RPD development flow, but all the examples in `/examples` folder use plain source code, so you may use an existing example page or add your own and just change-and-refresh. Same applies for tests.

Of course, you are free to create [Issues](https://github.com/shamansir/rpd/issues) and submit [Pull Requests](https://github.com/shamansir/rpd/pulls).

If you want to improve existing toolkits, please consider reading [how Toolkits are organized](./toolkits.html).

Specifically, the very first need is fixing/implementing RPD issues for the [current milestone](https://github.com/shamansir/rpd/milestones), the second one is improving [WebPD Toolkit](https://github.com/shamansir/rpd/milestone/7), the third one is moving [vvvv](https://vvvv.org/) concepts to the Web with the help of RPD (there exists [vvvv.js](http://www.vvvvjs.com/), but for the moment Patch editing possibilities are very limited there). But any other things you think important are also welcome, from fixing English language in this documentation to completely rewriting RPD in [Elm](http://elm-lang.org).
