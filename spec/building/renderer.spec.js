describe('building: renderer', function() {

    it('target could be empty, network case', function() {
        Rpd.renderer('foo', function() {});

        expect(function() {
            Rpd.renderNext('foo');
            Rpd.addPatch();
        }).not.toThrow();

        Rpd.stopRendering();
    });

    it('target could be empty, patch case', function() {
        Rpd.renderer('foo', function() {});

        expect(function() {
            Rpd.addPatch().render('foo');
        }).not.toThrow();
    });

    describe('object', function() {

        describe('network (Rpd.renderNext)', function() {

        });

        describe('patch (patch.render)', function() {

        });

    });

    describe('function', function() {

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
                patch.enter();

                expect(addNodeSpy).toHaveBeenCalledWith(jasmine.objectContaining({ node: node }));
                expect(addInletSpy).toHaveBeenCalledWith(jasmine.objectContaining({ inlet: inlet }));
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
                patch.enter();

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
                patchOne.enter();
                var patchTwo = Rpd.addPatch().render('bar', {});
                var nodeTwo = patchTwo.addNode('spec/empty');
                var inletTwo = nodeTwo.addInlet('spec/any', 'foo');
                patchTwo.enter();

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
                patchOne.enter();
                var patchTwo = Rpd.addPatch().render('bar', {});
                var nodeTwo = patchTwo.addNode('spec/empty');
                var inletTwo = nodeTwo.addInlet('spec/any', 'foo');
                patchTwo.enter();

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
                patchOne.enter();

                expect(fooAddNodeSpy).toHaveBeenCalledWith(jasmine.objectContaining({ node: nodeOne, patch: patchOne }));
                expect(barAddNodeSpy).not.toHaveBeenCalled();
                fooAddNodeSpy.calls.reset();

                var patchTwo = Rpd.addPatch().render('bar', {});
                var nodeTwo = patchTwo.addNode('spec/empty');
                patchTwo.enter();

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

        });

    });


});
