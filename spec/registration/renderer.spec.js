describe('registration: renderer', function() {

    describe('network (Rpd.renderNext)', function() {

        afterEach(function() {
            Rpd.stopRendering(); // TODO: test stopRendering itself
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

        it('outer function is called once for patch and inner is called once for target', function() {
            var fooPatchRenderSpy = jasmine.createSpy('foo-patch');
            var fooTargetRenderSpy = jasmine.createSpy('foo-target');

            Rpd.renderer('foo', fooPatchRenderSpy.and.callFake(function(patch) { return fooTargetRenderSpy; }));

            var targetOne = { };
            var targetTwo = { };
            Rpd.renderNext('foo', [ targetOne, targetTwo ]);

            Rpd.addPatch();
            Rpd.addPatch();

            expect(fooPatchRenderSpy).toHaveBeenCalledTwice();
            expect(fooTargetRenderSpy.calls.count()).toBe(4);
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

        xit('if patch is closed, renderer gets no events, but they are pushed to it later', function() {
            // see #322

            var addNodeSpy  = jasmine.createSpy('add-node'),
                addInletSpy = jasmine.createSpy('add-inlet');

            Rpd.renderer('foo', function(patch) {
                return function(target, conf) {
                    return { 'patch/add-node': addNodeSpy,
                             'node/add-inlet': addInletSpy }
                };
            });

            Rpd.renderNext('foo', {});

            var patch = Rpd.addClosedPatch();
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/any', 'foo');

            expect(addNodeSpy).not.toHaveBeenCalled();
            expect(addInletSpy).not.toHaveBeenCalled();

            patch.open();

            expect(addNodeSpy).toHaveBeenCalled();
            expect(addInletSpy).toHaveBeenCalled();
        });

        xit('renderer still gets no events while patch is closed second time, but receives them later', function() {
            // see #322
        });

        xit('merges inlets and outlets updates happened while patch was closed', function() {
            // see #322
        });

        describe('canvases and subpatches', function() {

            function createRoot() {
                return { canvases: [] };
            }

            function createCanvasMock(patch) {
                return { patch: patch };
            }

            function createRendererMock() {

                return function(patch) {
                    return function(root, conf) {
                        var conf = conf || {};

                        var canvasAttached = false;

                        var canvas = createCanvasMock(patch);

                        return {
                            'patch/open': function(update) {
                                if (canvasAttached) return;
                                if (conf.closeParent && update.parent) update.parent.close();
                                root.canvases.push(canvas);
                                canvasAttached = true;
                            },
                            'patch/close': function(update) {
                                if (!canvasAttached) return;
                                var position = root.canvases.indexOf(canvas/*patchToCanvas[patch.id]*/);
                                root.canvases.splice(position, 1);
                                canvasAttached = false;
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
                    var root = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', root);

                    expect(root.canvases.length).toBe(0);

                    var firstPatch = Rpd.addPatch('first');

                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    var secondPatch = Rpd.addPatch('second');

                    expect(root.canvases.length).toBe(2);
                    expect(root.canvases[1]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                });

                it('when patch was added as closed, do not appends its canvas to the root', function() {
                    var root = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', root);

                    var firstPatch = Rpd.addClosedPatch('first');

                    expect(root.canvases.length).toBe(0);

                    var secondPatch = Rpd.addPatch('second');

                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                });

                it('when patch was added as closed (with `patch.close` method), do not appends its canvas to the root', function() {
                    var root = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', root);

                    var firstPatch = Rpd.addPatch('first').close();

                    expect(root.canvases.length).toBe(0);

                    var secondPatch = Rpd.addPatch('second');

                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                });

                it('when patch was closed later, also removes its canvas from the root', function() {
                    var root = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', root);

                    expect(root.canvases.length).toBe(0);

                    var firstPatch = Rpd.addPatch('first');

                    expect(root.canvases.length).toBe(1);
                    firstPatch.addNode('spec/empty', 'Foo');

                    firstPatch.close();

                    expect(root.canvases.length).toBe(0);

                    var secondPatch = Rpd.addPatch('second');
                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));

                    secondPatch.close();
                    expect(root.canvases.length).toBe(0);
                });

                it('opening and closing properly works in sequences', function() {

                    var root = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', root);

                    var firstPatch = Rpd.addPatch('first');

                    expect(root.canvases.length).toBe(1);

                    var secondPatch = Rpd.addClosedPatch('second');

                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    var thirdPatch = Rpd.addClosedPatch('third');

                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    secondPatch.open();

                    expect(root.canvases.length).toBe(2);
                    expect(root.canvases[1]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));

                    firstPatch.close();
                    thirdPatch.open();
                    expect(root.canvases.length).toBe(2);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                    expect(root.canvases[1]).toEqual(jasmine.objectContaining({
                        patch: thirdPatch
                    }));

                });

                it('always closes parent patch with `conf.closeParent` option', function() {
                    var root = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', root, { closeParent: true });

                    var firstPatch = Rpd.addPatch('first');

                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    var secondPatch = Rpd.addPatch('second', null, firstPatch); // set firstPatch as a parent
                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));

                });

            });

            describe('several roots', function() {

                it('properly adds patches to a separate roots', function() {
                    var firstRoot = createRoot(),
                        secondRoot = createRoot(),
                        thirdRoot = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', firstRoot);

                    expect(firstRoot.canvases.length).toBe(0);

                    Rpd.addPatch('root-1-patch-1');
                    expect(firstRoot.canvases.length).toBe(1);
                    Rpd.addPatch('root-1-patch-2');
                    expect(firstRoot.canvases.length).toBe(2);
                    Rpd.addPatch('root-1-patch-3');
                    expect(firstRoot.canvases.length).toBe(3);

                    Rpd.renderNext('mock', secondRoot);

                    Rpd.addPatch('root-2-patch-1');
                    expect(secondRoot.canvases.length).toBe(1);
                    Rpd.addPatch('root-2-patch-2');
                    expect(secondRoot.canvases.length).toBe(2);
                    Rpd.addPatch('root-2-patch-3');
                    expect(secondRoot.canvases.length).toBe(3);

                    expect(firstRoot.canvases.length).toBe(3);

                    Rpd.renderer('mock-2', createRendererMock());
                    Rpd.renderNext('mock-2', thirdRoot);
                    Rpd.addPatch('root-3-patch-1');
                    expect(thirdRoot.canvases.length).toBe(1);
                    expect(secondRoot.canvases.length).toBe(3);

                });

                it('properly opens and closes patches', function() {
                    var firstRoot = createRoot(),
                        secondRoot = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', firstRoot);

                    expect(firstRoot.canvases.length).toBe(0);

                    Rpd.addPatch('root-1-patch-1');
                    var rootOnePatchTwo = Rpd.addPatch('root-1-patch-2');
                    var rootOnePatchThree = Rpd.addClosedPatch('root-1-patch-3');
                    // root-1-patch-1 [o]
                    // root-1-patch-2 [o]
                    // root-1-patch-3 [x]
                    expect(firstRoot.canvases.length).toBe(2);

                    Rpd.renderNext('mock', secondRoot);

                    Rpd.addPatch('root-2-patch-1');
                    expect(secondRoot.canvases.length).toBe(1);
                    var rootTwoPatchTwo = Rpd.addPatch('root-2-patch-2');
                    expect(secondRoot.canvases.length).toBe(2);
                    var rootTwoPatchThree = Rpd.addPatch('root-2-patch-3');
                    // root-2-patch-1 [o]
                    // root-2-patch-2 [o]
                    // root-2-patch-3 [o]
                    expect(secondRoot.canvases.length).toBe(3);
                    expect(secondRoot.canvases[1]).toEqual(jasmine.objectContaining({
                        patch: rootTwoPatchTwo
                    }));

                    rootOnePatchTwo.close();
                    // root-1-patch-1 [o]
                    // root-1-patch-2 [x]
                    // root-1-patch-3 [x]
                    expect(firstRoot.canvases.length).toBe(1);
                    expect(secondRoot.canvases.length).toBe(3);

                    rootTwoPatchTwo.close();
                    // root-2-patch-1 [o]
                    // root-2-patch-2 [x]
                    // root-2-patch-3 [o]
                    expect(firstRoot.canvases.length).toBe(1);
                    expect(secondRoot.canvases.length).toBe(2);
                    expect(secondRoot.canvases[1]).toEqual(jasmine.objectContaining({
                        patch: rootTwoPatchThree
                    }));

                    rootOnePatchThree.open();
                    // root-1-patch-1 [o]
                    // root-1-patch-2 [x]
                    // root-1-patch-3 [o]
                    expect(firstRoot.canvases.length).toBe(2);
                    expect(secondRoot.canvases.length).toBe(2);
                    expect(firstRoot.canvases[1]).toEqual(jasmine.objectContaining({
                        patch: rootOnePatchThree
                    }));
                });

                it('always closes parent patch with `conf.closeParent` option', function() {
                    var firstRoot = createRoot(),
                        secondRoot = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    Rpd.renderNext('mock', firstRoot, { closeParent: true });

                    var rootOnePatchOne = Rpd.addPatch('root-1-patch-1');

                    expect(firstRoot.canvases.length).toBe(1);
                    expect(firstRoot.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: rootOnePatchOne
                    }));

                    var rootOnePatchTwo = Rpd.addPatch('root-1-patch-2', null, rootOnePatchOne); // set rootOnePatchOne as a parent
                    expect(firstRoot.canvases.length).toBe(1);
                    expect(firstRoot.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: rootOnePatchTwo
                    }));

                    Rpd.renderNext('mock', secondRoot, { closeParent: true });

                    var rootTwoPatchOne = Rpd.addPatch('root-2-patch-1');

                    expect(secondRoot.canvases.length).toBe(1);
                    expect(secondRoot.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: rootTwoPatchOne
                    }));

                    var rootTwoPatchTwo = Rpd.addClosedPatch('root-2-patch-2').open(rootTwoPatchOne); // set rootTwoPatchOne as a parent
                    expect(secondRoot.canvases.length).toBe(1);
                    expect(secondRoot.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: rootTwoPatchTwo
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

        it('outer function is called once for patch and inner is called once for target', function() {
            var fooPatchRenderSpy = jasmine.createSpy('foo-patch');
            var fooTargetRenderSpy = jasmine.createSpy('foo-target');

            Rpd.renderer('foo', fooPatchRenderSpy.and.callFake(function(patch) { return fooTargetRenderSpy; }));

            var targetOne = { };
            var targetTwo = { };

            Rpd.addPatch().render('foo', [ targetOne, targetTwo ]);
            Rpd.addPatch().render('foo', [ targetOne, targetTwo ]);

            expect(fooPatchRenderSpy).toHaveBeenCalledTwice();
            expect(fooTargetRenderSpy.calls.count()).toBe(4);
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

        xit('if patch is closed, renderer gets no events, but they are pushed to it later', function() {
            // see #322
            var addNodeSpy  = jasmine.createSpy('add-node'),
                addInletSpy = jasmine.createSpy('add-inlet');

            Rpd.renderer('foo', function(patch) {
                return function(target, conf) {
                    return { 'patch/add-node': addNodeSpy,
                             'node/add-inlet': addInletSpy }
                };
            });

            var patch = Rpd.addClosedPatch().render('foo', {});
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/any', 'foo');

            expect(addNodeSpy).not.toHaveBeenCalled();
            expect(addInletSpy).not.toHaveBeenCalled();

            patch.open();

            expect(addNodeSpy).toHaveBeenCalled();
            expect(addInletSpy).toHaveBeenCalled();
        });

        xit('renderer still gets no events while patch is closed second time, but receives them later', function() {
            // see #322
        });

        xit('merges inlets and outlets updates happened while patch was closed', function() {
            // see #322
        });

        describe('canvases and subpatches', function() {

            function createRoot() {
                return { canvases: [] };
            }

            function createCanvasMock(patch) {
                return { patch: patch };
            }

            function createRendererMock() {

                return function(patch) {
                    return function(root, conf) {
                        var conf = conf || {};

                        var canvasAttached = false;

                        var canvas = createCanvasMock(patch);

                        return {
                            'patch/open': function(update) {
                                if (canvasAttached) return;
                                if (conf.closeParent && update.parent)  update.parent.close();
                                root.canvases.push(canvas);
                                canvasAttached = true;
                            },
                            'patch/close': function(update) {
                                if (!canvasAttached) return;
                                var position = root.canvases.indexOf(canvas/*patchToCanvas[patch.id]*/);
                                root.canvases.splice(position, 1);
                                canvasAttached = false;
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
                    var root = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    expect(root.canvases.length).toBe(0);

                    var firstPatch = Rpd.addPatch('first').render('mock', root);

                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    var secondPatch = Rpd.addPatch('second').render('mock', root);

                    expect(root.canvases.length).toBe(2);
                    expect(root.canvases[1]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                });

                it('when patch was added as closed, do not appends its canvas to the root', function() {
                    var root = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    var firstPatch = Rpd.addClosedPatch('first').render('mock', root);

                    expect(root.canvases.length).toBe(0);

                    var secondPatch = Rpd.addPatch('second').render('mock', root);

                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                });

                it('when patch was added as closed (with `patch.close` method), do not appends its canvas to the root', function() {
                    var root = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    var firstPatch = Rpd.addPatch('first').render('mock', root).close();

                    expect(root.canvases.length).toBe(0);

                    var secondPatch = Rpd.addPatch('second').render('mock', root);

                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                });

                it('when patch was closed later, also removes its canvas from the root', function() {
                    var root = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    expect(root.canvases.length).toBe(0);

                    var firstPatch = Rpd.addPatch('first').render('mock', root);

                    expect(root.canvases.length).toBe(1);
                    firstPatch.addNode('spec/empty', 'Foo');

                    firstPatch.close();

                    expect(root.canvases.length).toBe(0);

                    var secondPatch = Rpd.addPatch('second').render('mock', root);
                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));

                    secondPatch.close();
                    expect(root.canvases.length).toBe(0);
                });

                it('opening and closing properly works in sequences', function() {

                    var root = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    var firstPatch = Rpd.addPatch('first').render('mock', root);

                    expect(root.canvases.length).toBe(1);

                    var secondPatch = Rpd.addClosedPatch('second').render('mock', root);

                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    var thirdPatch = Rpd.addClosedPatch('third').render('mock', root);

                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    secondPatch.open();

                    expect(root.canvases.length).toBe(2);
                    expect(root.canvases[1]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));

                    firstPatch.close();
                    thirdPatch.open();
                    expect(root.canvases.length).toBe(2);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));
                    expect(root.canvases[1]).toEqual(jasmine.objectContaining({
                        patch: thirdPatch
                    }));

                });

                it('always closes previous patch with `conf.closeParent` option', function() {
                    var root = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    var firstPatch = Rpd.addPatch('first').render('mock', root);

                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: firstPatch
                    }));

                    var secondPatch = Rpd.addPatch('second', null, firstPatch) // set firstPatch as a parent
                                         .render('mock', root, { closeParent: true });
                    expect(root.canvases.length).toBe(1);
                    expect(root.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: secondPatch
                    }));

                });

            });

            describe('several roots', function() {

                it('properly adds patches to a separate roots', function() {
                    var firstRoot = createRoot(),
                        secondRoot = createRoot(),
                        thirdRoot = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    expect(firstRoot.canvases.length).toBe(0);

                    Rpd.addPatch('root-1-patch-1').render('mock', firstRoot);
                    expect(firstRoot.canvases.length).toBe(1);
                    Rpd.addPatch('root-1-patch-2').render('mock', firstRoot);
                    expect(firstRoot.canvases.length).toBe(2);
                    Rpd.addPatch('root-1-patch-3').render('mock', firstRoot);
                    expect(firstRoot.canvases.length).toBe(3);

                    Rpd.addPatch('root-2-patch-1').render('mock', secondRoot);
                    expect(secondRoot.canvases.length).toBe(1);
                    Rpd.addPatch('root-2-patch-2').render('mock', secondRoot);
                    expect(secondRoot.canvases.length).toBe(2);
                    Rpd.addPatch('root-2-patch-3').render('mock', secondRoot);
                    expect(secondRoot.canvases.length).toBe(3);

                    expect(firstRoot.canvases.length).toBe(3);

                    Rpd.renderer('mock-2', createRendererMock());
                    Rpd.addPatch('root-3-patch-1').render('mock-2', thirdRoot);
                    expect(thirdRoot.canvases.length).toBe(1);
                    expect(secondRoot.canvases.length).toBe(3);

                });

                it('properly opens and closes patches', function() {
                    var firstRoot = createRoot(),
                        secondRoot = createRoot();

                    Rpd.renderer('mock', rendererMock);

                    expect(firstRoot.canvases.length).toBe(0);

                    var rootOnePatchOne = Rpd.addPatch('root-1-patch-1').render('mock', firstRoot);
                    var rootOnePatchTwo = Rpd.addPatch('root-1-patch-2').render('mock', firstRoot);
                    // root-1-patch-1 [o]
                    // root-1-patch-2 [o]
                    expect(firstRoot.canvases.length).toBe(2);

                    Rpd.addPatch('root-2-patch-1').render('mock', secondRoot);
                    expect(secondRoot.canvases.length).toBe(1);
                    var rootTwoPatchTwo = Rpd.addPatch('root-2-patch-2').render('mock', secondRoot);;
                    expect(secondRoot.canvases.length).toBe(2);
                    var rootTwoPatchThree = Rpd.addPatch('root-2-patch-3').render('mock', secondRoot);;
                    expect(secondRoot.canvases.length).toBe(3);
                    // root-2-patch-1 [o]
                    // root-2-patch-2 [o]
                    // root-2-patch-3 [o]
                    expect(secondRoot.canvases[1]).toEqual(jasmine.objectContaining({
                        patch: rootTwoPatchTwo
                    }));

                    rootOnePatchTwo.close();
                    // root-1-patch-1 [o]
                    // root-1-patch-2 [x]
                    expect(firstRoot.canvases.length).toBe(1);
                    expect(secondRoot.canvases.length).toBe(3);

                    var rootOnePatchThree = Rpd.addClosedPatch('root-1-patch-3').render('mock', firstRoot);
                    // root-1-patch-1 [o]
                    // root-1-patch-2 [x]
                    // root-1-patch-3 [x]

                    rootTwoPatchTwo.close();
                    // root-2-patch-1 [o]
                    // root-2-patch-2 [x]
                    // root-2-patch-3 [o]
                    expect(firstRoot.canvases.length).toBe(1);
                    expect(secondRoot.canvases.length).toBe(2);
                    expect(secondRoot.canvases[1]).toEqual(jasmine.objectContaining({
                        patch: rootTwoPatchThree
                    }));

                    rootOnePatchOne.close();
                    rootOnePatchThree.open();
                    // root-1-patch-1 [x]
                    // root-1-patch-2 [x]
                    // root-1-patch-3 [o]
                    expect(firstRoot.canvases.length).toBe(1);
                    expect(secondRoot.canvases.length).toBe(2);
                    expect(firstRoot.canvases[0]).toEqual(jasmine.objectContaining({
                        patch: rootOnePatchThree
                    }));
                });

            });

        });

    });

});
