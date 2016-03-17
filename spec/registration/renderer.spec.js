describe('registration: renderer', function() {

    describe('network (Rpd.renderNext)', function() {

        afterEach(function() {
            Rpd.stopRendering();
        });

        it('the inner function is called with target element', function() {
            var fooTargetsSpy = jasmine.createSpy('foo-target');

            Rpd.renderer('foo', function(patch) {
                return fooTargetsSpy;
            });

            var target = { };
            Rpd.renderNext('foo', target);

            Rpd.addPatch();

            expect(fooTargetsSpy).toHaveBeenCalledWith(target, undefined);
        });

        it('called once for every patch', function() {
            var fooRendererSpy = jasmine.createSpy('foo-renderer');

            Rpd.renderer('foo', fooRendererSpy);

            Rpd.renderNext('foo', {});

            var firstPatch = Rpd.addPatch();
            var secondPatch = Rpd.addPatch();

            expect(fooRendererSpy).toHaveBeenCalledTwice();
            expect(fooRendererSpy).toHaveBeenCalledWith(firstPatch);
            expect(fooRendererSpy).toHaveBeenCalledWith(secondPatch);
        });

        it('the inner function is called for every target element and passes configuration there', function() {
            var fooTargetsSpy = jasmine.createSpy('foo-target');

            Rpd.renderer('foo', function(patch) {
                return fooTargetsSpy;
            });

            var targetOne = { };
            var targetTwo = { };
            var conf = { };
            Rpd.renderNext('foo', [ targetOne, targetTwo ], conf);

            Rpd.addPatch();

            expect(fooTargetsSpy).toHaveBeenCalledWith(targetOne, conf);
            expect(fooTargetsSpy).toHaveBeenCalledWith(targetTwo, conf);
        });

        it('the inner function is called for every renderer and target', function() {
            var fooTargetsSpy = jasmine.createSpy('foo-target');
            var barTargetsSpy = jasmine.createSpy('bar-target');

            Rpd.renderer('foo', function(patch) { return fooTargetsSpy; });
            Rpd.renderer('bar', function(patch) { return barTargetsSpy; });

            var targetOne = { };
            var targetTwo = { };
            var conf = {};
            Rpd.renderNext([ 'foo', 'bar' ], [ targetOne, targetTwo ], conf);

            Rpd.addPatch();

            expect(fooTargetsSpy).toHaveBeenCalled();
            expect(barTargetsSpy).toHaveBeenCalledWith(targetOne, conf);
            expect(barTargetsSpy).toHaveBeenCalledWith(targetTwo, conf);
        });

        it('turning off is not required for two renderNext in sequence', function() {
            var fooTargetsSpy = jasmine.createSpy('foo-target');
            var barTargetsSpy = jasmine.createSpy('bar-target');

            Rpd.renderer('foo', function(patch) { return fooTargetsSpy; });
            Rpd.renderer('bar', function(patch) { return barTargetsSpy; });

            var targetOne = { };
            var targetTwo = { };
            var conf = {};

            Rpd.renderNext('foo', targetOne, conf);

            Rpd.addPatch();

            expect(fooTargetsSpy).toHaveBeenCalledOnce();
            fooTargetsSpy.calls.reset();

            Rpd.renderNext('bar', targetTwo, conf);

            Rpd.addPatch();

            expect(fooTargetsSpy).not.toHaveBeenCalled();
            expect(barTargetsSpy).toHaveBeenCalledOnce();
        });

        it('passes the events to the handler object', function() {
            var addNodeSpy = jasmine.createSpy('add-node');
            var addInletSpy = jasmine.createSpy('add-inlet');

            Rpd.renderer('foo', function(patch) {
                return function(target, conf) {
                    return { 'patch/add-node': addNodeSpy,
                             'node/add-inlet': addInletSpy }
                };
            });

            Rpd.renderNext('foo', {});

            var patch = Rpd.addPatch();
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/any', 'foo');

            expect(addNodeSpy).toHaveBeenCalledWith(jasmine.objectContaining({ node: node }));
            expect(addInletSpy).toHaveBeenCalledWith(jasmine.objectContaining({ inlet: inlet }));
        });

        it('do not caches the events happened before setting up a renderer', function() {

            var addNodeSpy  = jasmine.createSpy('add-node'),
                addInletSpy = jasmine.createSpy('add-inlet');

            var patch = Rpd.addPatch();
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/any', 'foo');

            Rpd.renderer('foo', function(patch) {
                return function(target, conf) {
                    return { 'patch/add-node': addNodeSpy,
                             'node/add-inlet': addInletSpy }
                };
            });

            Rpd.renderNext('foo', {});

            expect(addNodeSpy).not.toHaveBeenCalled();
            expect(addInletSpy).not.toHaveBeenCalled();

        });

        it('if patch is closed, renderer gets no events, but they are pushed to it later', function() {
            var addNodeSpy  = jasmine.createSpy('add-node'),
                addInletSpy = jasmine.createSpy('add-inlet');

            Rpd.renderer('foo', function(patch) {
                return function(target, conf) {
                    return { 'patch/add-node': addNodeSpy,
                             'node/add-inlet': addInletSpy }
                };
            });

            Rpd.renderNext('foo', {});

            var patch = Rpd.addPatchClosed();
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/any', 'foo');

            expect(addNodeSpy).not.toHaveBeenCalled();
            expect(addInletSpy).not.toHaveBeenCalled();

            patch.open();

            expect(addNodeSpy).toHaveBeenCalled();
            expect(addInletSpy).toHaveBeenCalled();
        });

        describe('canvases and subpatches', function() {

            function createCanvasMock(patch) {
                return { patch: patch };
            }

            function createRendererMock() {

                return function(patch) {
                    return function(root, conf) {

                        var canvas = createCanvasMock(patch);

                        return {
                            'patch/open': function(update) {
                                if (patchToCanvas[patch.id]) return;
                                root.push(canvas);
                            },
                            'patch/close': function(update) {
                                if (!patchToCanvas[patch.id]) return;
                                var position = root.indexOf(canvas/*patchToCanvas[patch.id]*/);
                                root.splice(position, 1);
                            }
                        }
                    }
                }

            };

            var rendererMock;

            beforeEach(function() {
                rendererMock = createRendererMock();
            });

            describe('single root', function() {

                it('initially adds all the canvases to this root', function() {
                    var root = {};

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', root);

                    expect(root.length).toBe(0);

                    var firstPatch = Rpd.addPatch('first');

                    expect(root.length).toBe(1);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    var secondPatch = Rpd.addPatch('second');

                    expect(root.length).toBe(2);
                    expect(root[1]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                });

                it('when patch was added as closed, do not appends its canvas to the root', function() {
                    var root = {};

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', root);

                    var firstPatch = Rpd.addPatchClosed('first');

                    expect(root.length).toBe(0);

                    var secondPatch = Rpd.addPatch('second');

                    expect(root.length).toBe(1);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                });

                it('when patch was added as closed (with `patch.close` method), do not appends its canvas to the root', function() {
                    var root = {};

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', root);

                    var firstPatch = Rpd.addPatch('first').close();

                    expect(root.length).toBe(0);

                    var secondPatch = Rpd.addPatch('second');

                    expect(root.length).toBe(1);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                });

                it('when patch was closed later, also removes its canvas from the root', function() {
                    var root = {};

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', root);

                    expect(root.length).toBe(0);

                    var firstPatch = Rpd.addPatch('first');

                    expect(root.length).toBe(1);
                    firstPatch.addNode('spec/empty', 'Foo');

                    firstPatch.close();

                    expect(root.length).toBe(0);

                    var secondPatch = Rpd.addPatch('second');
                    expect(root.length).toBe(1);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));

                    secondPatch.close();
                    expect(root.length).toBe(0);
                });

                it('opening and closing properly works in sequences', function() {

                    var root = {};

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', root);

                    var firstPatch = Rpd.addPatch('first');

                    expect(root.length).toBe(1);

                    var secondPatch = Rpd.addPatchClosed('second');

                    expect(root.length).toBe(1);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    var thirdPatch = Rpd.addPatchClosed('third');

                    expect(root.length).toBe(1);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    secondPatch.open();

                    expect(root.length).toBe(2);
                    expect(root[1]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));

                    firstPatch.close();
                    thirdPatch.open();
                    expect(root.length).toBe(2);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                    expect(root[1]).toEqual(jasmine.objectContaining({
                        patch: thirdPatch
                    }));

                });

            });

            describe('several roots', function() {

                it('properly adds patches to a separate roots', function() {
                    var firstRoot = {},
                        secondRoot = {},
                        thirdRoot = {};

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', firstRoot);

                    expect(firstRoot.length).toBe(0);

                    Rpd.addPatch('root-1-patch-1');
                    expect(firstRoot.length).toBe(1);
                    Rpd.addPatch('root-1-patch-2');
                    expect(firstRoot.length).toBe(2);
                    Rpd.addPatch('root-1-patch-3');
                    expect(firstRoot.length).toBe(3);

                    Rpd.renderNext('mock', secondRoot);

                    Rpd.addPatch('root-2-patch-1');
                    expect(secondRoot.length).toBe(1);
                    Rpd.addPatch('root-2-patch-2');
                    expect(secondRoot.length).toBe(2);
                    Rpd.addPatch('root-2-patch-3');
                    expect(secondRoot.length).toBe(3);

                    expect(firstRoot.length).toBe(3);

                    Rpd.renderer('mock-2', createRendererMock());
                    Rpd.renderNext('mock-2', thirdRoot);
                    Rpd.addPatch('root-3-patch-1');
                    expect(thirdRoot.length).toBe(1);
                    expect(secondRoot.length).toBe(3);

                });

                it('properly opens and closes patches', function() {
                    var firstRoot = {},
                        secondRoot = {};

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', firstRoot);

                    expect(firstRoot.length).toBe(0);

                    Rpd.addPatch('root-1-patch-1');
                    var rootOnePatchTwo = Rpd.addPatch('root-1-patch-2');
                    var rootOnePatchThree = Rpd.addClosedPatch('root-1-patch-3');
                    expect(firstRoot.length).toBe(2);

                    Rpd.renderNext('mock', secondRoot);

                    Rpd.addPatch('root-2-patch-1');
                    expect(secondRoot.length).toBe(1);
                    var rootTwoPatchTwo = Rpd.addPatch('root-2-patch-2');
                    expect(secondRoot.length).toBe(2);
                    Rpd.addPatch('root-2-patch-3');
                    expect(secondRoot.length).toBe(3);
                    expect(secondRoot[1]).toEqual(jasmine.objectContaining({
                        patch: rootTwoPatchTwo
                    }));

                    rootOnePatchTwo.close();
                    expect(firstRoot.length).toBe(1);
                    expect(secondRoot.length).toBe(3);

                    rootTwoPatchTwo.close();
                    expect(firstRoot.length).toBe(1);
                    expect(secondRoot.length).toBe(2);
                    expect(firstRoot[0]).toEqual(jasmine.objectContaining({
                        patch: rootTwoPatchTwo
                    }));

                    rootOnePatchThree.open();
                    expect(firstRoot.length).toBe(2);
                    expect(secondRoot.length).toBe(2);
                    expect(firstRoot[1]).toEqual(jasmine.objectContaining({
                        patch: rootOnePatchThree
                    }));
                });

            });

        });

    });

    describe('patch (path.render)', function() {

        it('called once for every patch', function() {
            var fooRendererSpy = jasmine.createSpy('foo-renderer');

            Rpd.renderer('foo', fooRendererSpy);

            var firstPatch = Rpd.addPatch().render('foo', {});
            var secondPatch = Rpd.addPatch().render('foo', {});

            expect(fooRendererSpy).toHaveBeenCalledTwice();
            expect(fooRendererSpy).toHaveBeenCalledWith(firstPatch);
            expect(fooRendererSpy).toHaveBeenCalledWith(secondPatch);

            Rpd.stopRendering();
        });

        it('the inner function is called with target element', function() {
            var fooTargetsSpy = jasmine.createSpy('foo-target');

            Rpd.renderer('foo', function(patch) {
                return fooTargetsSpy;
            });

            var target = { };
            Rpd.addPatch().render('foo', target);

            expect(fooTargetsSpy).toHaveBeenCalledWith(target, undefined);
        });

        it('the inner function is called for every target element and passes configuration there', function() {
            var fooTargetsSpy = jasmine.createSpy('foo-target');

            Rpd.renderer('foo', function(patch) {
                return fooTargetsSpy;
            });

            var targetOne = { };
            var targetTwo = { };
            var conf = { };
            Rpd.addPatch().render('foo', [ targetOne, targetTwo ], conf);

            expect(fooTargetsSpy).toHaveBeenCalledWith(targetOne, conf);
            expect(fooTargetsSpy).toHaveBeenCalledWith(targetTwo, conf);
        });

        it('the inner function is called for every renderer and target', function() {
            var fooTargetsSpy = jasmine.createSpy('foo-target');
            var barTargetsSpy = jasmine.createSpy('bar-target');

            Rpd.renderer('foo', function(patch) { return fooTargetsSpy; });
            Rpd.renderer('bar', function(patch) { return barTargetsSpy; });

            var targetOne = { };
            var targetTwo = { };
            var conf = {};

            Rpd.addPatch().render([ 'foo', 'bar' ], [ targetOne, targetTwo ], conf);

            expect(fooTargetsSpy).toHaveBeenCalled();
            expect(barTargetsSpy).toHaveBeenCalledWith(targetOne, conf);
            expect(barTargetsSpy).toHaveBeenCalledWith(targetTwo, conf);
        });

        it('passes the events to the handler object', function() {
            var addNodeSpy = jasmine.createSpy('add-node');
            var addInletSpy = jasmine.createSpy('add-inlet');

            Rpd.renderer('foo', function(patch) {
                return function(target, conf) {
                    return { 'patch/add-node': addNodeSpy,
                             'node/add-inlet': addInletSpy }
                };
            });

            var patch = Rpd.addPatch().render('foo', {});
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/any', 'foo');

            expect(addNodeSpy).toHaveBeenCalledWith(jasmine.objectContaining({ node: node }));
            expect(addInletSpy).toHaveBeenCalledWith(jasmine.objectContaining({ inlet: inlet }));
        });

        it('provides events for all subscribed patches', function() {
            var addNodeSpy = jasmine.createSpy('add-node');
            var addInletSpy = jasmine.createSpy('add-inlet');

            Rpd.renderer('foo', function(patch) {
                return function(target, conf) {
                    return { 'patch/add-node': addNodeSpy }
                };
            });
            Rpd.renderer('bar', function(patch) {
                return function(target, conf) {
                    return { 'node/add-inlet': addInletSpy }
                };
            });

            var patchOne = Rpd.addPatch().render(['foo', 'bar'], {});
            var nodeOne = patchOne.addNode('spec/empty');
            var inletOne = nodeOne.addInlet('spec/any', 'foo');

            var patchTwo = Rpd.addPatch().render('bar', {});
            var nodeTwo = patchTwo.addNode('spec/empty');
            var inletTwo = nodeTwo.addInlet('spec/any', 'foo');

            expect(addNodeSpy).toHaveBeenCalledWith(jasmine.objectContaining({ node: nodeOne }));
            expect(addInletSpy).toHaveBeenCalledWith(jasmine.objectContaining({ inlet: inletOne }));
            expect(addInletSpy).toHaveBeenCalledWith(jasmine.objectContaining({ inlet: inletTwo }));
        });

        it('renderer could also return a function handling any event', function() {
            var fooEventSpy = jasmine.createSpy('foo-events');
            var barEventSpy = jasmine.createSpy('bar-events');

            Rpd.renderer('foo', function(patch) {
                return function(target, conf) {
                    return fooEventSpy;
                };
            });
            Rpd.renderer('bar', function(patch) {
                return function(target, conf) {
                    return barEventSpy;
                };
            });

            var patchOne = Rpd.addPatch().render(['foo', 'bar'], {});
            var nodeOne = patchOne.addNode('spec/empty');

            var patchTwo = Rpd.addPatch().render('bar', {});
            var nodeTwo = patchTwo.addNode('spec/empty');
            var inletTwo = nodeTwo.addInlet('spec/any', 'foo');

            expect(fooEventSpy).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'patch/add-node', node: nodeOne }));
            expect(barEventSpy).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'patch/add-node', node: nodeTwo }));
            expect(barEventSpy).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'node/add-inlet', inlet: inletTwo }));
            expect(fooEventSpy).not.toHaveBeenCalledWith(jasmine.objectContaining({ type: 'patch/add-inlet', inlet: inletTwo }));
        });

        it('continues rendering patches with assigned configurations', function() {
            var fooAddNodeSpy = jasmine.createSpy('foo-add-node');
            var fooAddInletSpy = jasmine.createSpy('foo-add-inlet');
            var barAddNodeSpy = jasmine.createSpy('bar-add-node');
            var barAddInletSpy = jasmine.createSpy('bar-add-inlet');

            Rpd.renderer('foo', function(patch) {
                return function(target, conf) {
                    return { 'patch/add-node': fooAddNodeSpy,
                             'node/add-inlet': fooAddInletSpy }
                };
            });

            Rpd.renderer('bar', function(patch) {
                return function(target, conf) {
                    return { 'patch/add-node': barAddNodeSpy,
                             'node/add-inlet': barAddInletSpy }
                };
            });

            var patchOne = Rpd.addPatch().render('foo', {});
            var nodeOne = patchOne.addNode('spec/empty');

            expect(fooAddNodeSpy).toHaveBeenCalledWith(jasmine.objectContaining({ node: nodeOne, patch: patchOne }));
            expect(barAddNodeSpy).not.toHaveBeenCalled();
            fooAddNodeSpy.calls.reset();

            var patchTwo = Rpd.addPatch().render('bar', {});
            var nodeTwo = patchTwo.addNode('spec/empty');

            expect(fooAddNodeSpy).not.toHaveBeenCalled();
            expect(barAddNodeSpy).toHaveBeenCalledWith(jasmine.objectContaining({ node: nodeTwo, patch: patchTwo }));

            var inletOne = nodeOne.addInlet('spec/any', 'foo');

            expect(fooAddInletSpy).toHaveBeenCalledWith(jasmine.objectContaining({ inlet: inletOne, node: nodeOne }));
            expect(barAddInletSpy).not.toHaveBeenCalled();
            fooAddInletSpy.calls.reset();

            var inletTwo = nodeTwo.addInlet('spec/any', 'bar');

            expect(fooAddInletSpy).not.toHaveBeenCalled();
            expect(barAddInletSpy).toHaveBeenCalledWith(jasmine.objectContaining({ inlet: inletTwo, node: nodeTwo }));
        });

        it('caches the events happened before setting up a renderer and passses them later', function() {

            var addNodeSpy  = jasmine.createSpy('add-node'),
                addInletSpy = jasmine.createSpy('add-inlet');

            var patch = Rpd.addPatch();
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/any', 'foo');

            Rpd.renderer('foo', function(patch) {
                return function(target, conf) {
                    return { 'patch/add-node': addNodeSpy,
                             'node/add-inlet': addInletSpy }
                };
            });

            expect(addNodeSpy).not.toHaveBeenCalled();
            expect(addInletSpy).not.toHaveBeenCalled();

            patch.render('foo', {});

            expect(addNodeSpy).toHaveBeenCalledWith(jasmine.objectContaining({ patch: patch, node: node }));
            expect(addInletSpy).toHaveBeenCalledWith(jasmine.objectContaining({ node: node, inlet: inlet }));

        });

        it('if patch is closed, renderer gets no events, but they are pushed to it later', function() {
            var addNodeSpy  = jasmine.createSpy('add-node'),
                addInletSpy = jasmine.createSpy('add-inlet');

            Rpd.renderer('foo', function(patch) {
                return function(target, conf) {
                    return { 'patch/add-node': addNodeSpy,
                             'node/add-inlet': addInletSpy }
                };
            });

            var patch = Rpd.addPatchClosed().render('foo', {});
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/any', 'foo');

            expect(addNodeSpy).not.toHaveBeenCalled();
            expect(addInletSpy).not.toHaveBeenCalled();

            patch.open();

            expect(addNodeSpy).toHaveBeenCalled();
            expect(addInletSpy).toHaveBeenCalled();
        });

        describe('canvases and subpatches', function() {

            function createCanvasMock(patch) {
                return { patch: patch };
            }

            function createRendererMock() {

                return function(patch) {
                    return function(root, conf) {

                        var canvas = createCanvasMock(patch);

                        return {
                            'patch/open': function(update) {
                                if (patchToCanvas[patch.id]) return;
                                root.push(canvas);
                            },
                            'patch/close': function(update) {
                                if (!patchToCanvas[patch.id]) return;
                                var position = root.indexOf(canvas/*patchToCanvas[patch.id]*/);
                                root.splice(position, 1);
                            }
                        }
                    }
                }

            };

            var rendererMock;

            beforeEach(function() {
                rendererMock = createRendererMock();
            });

            describe('single root', function() {

                it('properly adds all the canvases to the given root', function() {
                    var root = {};

                    Rpd.renderer('mock', rendererMock);

                    expect(root.length).toBe(0);

                    var firstPatch = Rpd.addPatch('first').render(mock, root);

                    expect(root.length).toBe(1);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    var secondPatch = Rpd.addPatch('second').render(mock, root);

                    expect(root.length).toBe(2);
                    expect(root[1]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                });

                it('when patch was added as closed, do not appends its canvas to the root', function() {
                    var root = {};

                    Rpd.renderer('mock', rendererMock);

                    var firstPatch = Rpd.addPatchClosed('first').render(mock, root);

                    expect(root.length).toBe(0);

                    var secondPatch = Rpd.addPatch('second').render(mock, root);

                    expect(root.length).toBe(1);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                });

                it('when patch was added as closed (with `patch.close` method), do not appends its canvas to the root', function() {
                    var root = {};

                    Rpd.renderer('mock', rendererMock);

                    var firstPatch = Rpd.addPatch('first').render(mock, root).close();

                    expect(root.length).toBe(0);

                    var secondPatch = Rpd.addPatch('second').render(mock, root);

                    expect(root.length).toBe(1);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                });

                it('when patch was closed later, also removes its canvas from the root', function() {
                    var root = {};

                    Rpd.renderer('mock', rendererMock);

                    expect(root.length).toBe(0);

                    var firstPatch = Rpd.addPatch('first').render(mock, root);

                    expect(root.length).toBe(1);
                    firstPatch.addNode('spec/empty', 'Foo');

                    firstPatch.close();

                    expect(root.length).toBe(0);

                    var secondPatch = Rpd.addPatch('second').render(mock, root);
                    expect(root.length).toBe(1);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));

                    secondPatch.close();
                    expect(root.length).toBe(0);
                });

                it('opening and closing properly works in sequences', function() {

                    var root = {};

                    Rpd.renderer('mock', rendererMock);

                    var firstPatch = Rpd.addPatch('first').render(mock, root);

                    expect(root.length).toBe(1);

                    var secondPatch = Rpd.addPatchClosed('second').render(mock, root);

                    expect(root.length).toBe(1);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    var thirdPatch = Rpd.addPatchClosed('third').render(mock, root);

                    expect(root.length).toBe(1);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    secondPatch.open();

                    expect(root.length).toBe(2);
                    expect(root[1]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));

                    firstPatch.close();
                    thirdPatch.open();
                    expect(root.length).toBe(2);
                    expect(root[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                    expect(root[1]).toEqual(jasmine.objectContaining({
                        patch: thirdPatch
                    }));

                });

            });

            describe('several roots', function() {

                it('properly adds patches to a separate roots', function() {
                    var firstRoot = {},
                        secondRoot = {},
                        thirdRoot = {};

                    Rpd.renderer('mock', rendererMock);

                    expect(firstRoot.length).toBe(0);

                    Rpd.addPatch('root-1-patch-1').render('mock', firstRoot);
                    expect(firstRoot.length).toBe(1);
                    Rpd.addPatch('root-1-patch-2').render('mock', firstRoot);
                    expect(firstRoot.length).toBe(2);
                    Rpd.addPatch('root-1-patch-3').render('mock', firstRoot);
                    expect(firstRoot.length).toBe(3);

                    Rpd.renderNext('mock', secondRoot);

                    Rpd.addPatch('root-2-patch-1').render('mock', secondRoot);
                    expect(secondRoot.length).toBe(1);
                    Rpd.addPatch('root-2-patch-2').render('mock', secondRoot);
                    expect(secondRoot.length).toBe(2);
                    Rpd.addPatch('root-2-patch-3').render('mock', secondRoot);
                    expect(secondRoot.length).toBe(3);

                    expect(firstRoot.length).toBe(3);

                    Rpd.renderer('mock-2', createRendererMock());
                    Rpd.addPatch('root-3-patch-1').render('mock-2', thirdRoot);
                    expect(thirdRoot.length).toBe(1);
                    expect(secondRoot.length).toBe(3);

                });

                it('properly opens and closes patches', function() {
                    var firstRoot = {},
                        secondRoot = {};

                    Rpd.renderer('mock', rendererMock);

                    expect(firstRoot.length).toBe(0);

                    Rpd.addPatch('root-1-patch-1').render('mock', firstRoot);
                    var rootOnePatchTwo = Rpd.addPatch('root-1-patch-2').render('mock', firstRoot);
                    expect(firstRoot.length).toBe(2);

                    Rpd.addPatch('root-2-patch-1').render('mock', secondRoot);
                    expect(secondRoot.length).toBe(1);
                    var rootTwoPatchTwo = Rpd.addPatch('root-2-patch-2').render('mock', secondRoot);;
                    expect(secondRoot.length).toBe(2);
                    Rpd.addPatch('root-2-patch-3').render('mock', secondRoot);;
                    expect(secondRoot.length).toBe(3);
                    expect(secondRoot[1]).toEqual(jasmine.objectContaining({
                        patch: rootTwoPatchTwo
                    }));

                    rootOnePatchTwo.close();
                    expect(firstRoot.length).toBe(1);
                    expect(secondRoot.length).toBe(3);

                    var rootOnePatchThree = Rpd.addClosedPatch('root-1-patch-3').render('mock', firstRoot);

                    rootTwoPatchTwo.close();
                    expect(firstRoot.length).toBe(1);
                    expect(secondRoot.length).toBe(2);
                    expect(firstRoot[0]).toEqual(jasmine.objectContaining({
                        patch: rootTwoPatchTwo
                    }));

                    rootOnePatchThree.open();
                    expect(firstRoot.length).toBe(2);
                    expect(secondRoot.length).toBe(2);
                    expect(firstRoot[1]).toEqual(jasmine.objectContaining({
                        patch: rootOnePatchThree
                    }));
                });

            });

        });

    });

});
