describe('building: renderer', function() {

    xit('global rendering could be turned off');

    xit('should be registered before usage, network case', function() {
        var turnOff = Rpd.render('foo', {});

        expect(function() {
            Rpd.addPatch();
        }).toThrow();

        turnOff();
    });

    xit('should be registered before usage, patch case', function() {
        expect(function() {
            Rpd.addPatch().render('foo', {});
        }).toThrow();
    });

    it('called once for every patch', function() {
        var fooRendererSpy = jasmine.createSpy('foo-renderer');

        Rpd.renderer('foo', fooRendererSpy);

        var turnOff = Rpd.render('foo', {});

        var firstPatch = Rpd.addPatch();
        var secondPatch = Rpd.addPatch();

        expect(fooRendererSpy).toHaveBeenCalledTwice();
        expect(fooRendererSpy).toHaveBeenCalledWith(firstPatch);
        expect(fooRendererSpy).toHaveBeenCalledWith(secondPatch);

        turnOff();
    });

    it('target could be empty, network case', function() {
        var turnOff;

        expect(function() {
            turnOff = Rpd.render('foo');
            Rpd.addPatch();
        }).not.toThrow();

        if (turnOff) turnOff();
    });

    it('target could be empty, patch case', function() {
        expect(function() {
            Rpd.addPatch().render('foo');
        }).not.toThrow();
    });

    it('the inner function is called with target element, network case', function() {
        var fooTargetsSpy = jasmine.createSpy('foo-target');

        Rpd.renderer('foo', function(patch) {
            return fooTargetsSpy;
        });

        var target = { };
        var turnOff = Rpd.render('foo', target);

        Rpd.addPatch();

        expect(fooTargetsSpy).toHaveBeenCalledWith(target, undefined);

        turnOff();
    });

    it('the inner function is called with target element, patch case', function() {
        var fooTargetsSpy = jasmine.createSpy('foo-target');

        Rpd.renderer('foo', function(patch) {
            return fooTargetsSpy;
        });

        var target = { };
        Rpd.addPatch().render('foo', target);

        expect(fooTargetsSpy).toHaveBeenCalledWith(target, undefined);
    });

    it('the inner function is called for every target element and passes configuration there, network case', function() {
        var fooTargetsSpy = jasmine.createSpy('foo-target');

        Rpd.renderer('foo', function(patch) {
            return fooTargetsSpy;
        });

        var targetOne = { };
        var targetTwo = { };
        var conf = { };
        var turnOff = Rpd.render('foo', [ targetOne, targetTwo ], conf);

        Rpd.addPatch();

        expect(fooTargetsSpy).toHaveBeenCalledWith(targetOne, conf);
        expect(fooTargetsSpy).toHaveBeenCalledWith(targetTwo, conf);

        turnOff();
    });

    it('the inner function is called for every target element and passes configuration there, patch case', function() {
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

    it('the inner function is called for every renderer and target, network case', function() {
        var fooTargetsSpy = jasmine.createSpy('foo-target');
        var barTargetsSpy = jasmine.createSpy('bar-target');

        Rpd.renderer('foo', function(patch) { return fooTargetsSpy; });
        Rpd.renderer('bar', function(patch) { return barTargetsSpy; });

        var targetOne = { };
        var targetTwo = { };
        var conf = {};
        var turnOff = Rpd.render([ 'foo', 'bar' ], [ targetOne, targetTwo ], conf);

        Rpd.addPatch();

        expect(fooTargetsSpy).toHaveBeenCalled();
        expect(barTargetsSpy).toHaveBeenCalledWith(targetOne, conf);
        expect(barTargetsSpy).toHaveBeenCalledWith(targetTwo, conf);

        turnOff();
    });

    it('the inner function is called for every renderer and target, patch case', function() {
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

    it('passes the events to the handler object, network case', function() {
        var addNodeSpy = jasmine.createSpy('add-node');
        var addInletSpy = jasmine.createSpy('add-inlet');

        Rpd.renderer('foo', function(patch) {
            return function(target, conf) {
                return { 'patch/add-node': addNodeSpy,
                         'node/add-inlet': addInletSpy }
            };
        });

        var turnOff = Rpd.render('foo', {});

        var patch = Rpd.addPatch();
        var node = patch.addNode('spec/empty');
        var inlet = node.addInlet('spec/any', 'foo');
        patch.enter();

        expect(addNodeSpy).toHaveBeenCalledWith(jasmine.objectContaining({ node: node }));
        expect(addInletSpy).toHaveBeenCalledWith(jasmine.objectContaining({ inlet: inlet }));

        turnOff();
    });

    it('passes the events to the handler object, patch case', function() {
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

    xit('same cases for several patches');

    xit('buffering while entering and exiting');

    // ============================================================

    xit('receives no events if no target was specified', function() {

        var fooUpdateSpy = jasmine.createSpy('foo-update');
        var fooRenderer = Rpd.renderer('foo', function(user_conf) {
            return fooUpdateSpy;
        });

        var barUpdateSpy = jasmine.createSpy('bar-update');
        var barRenderer = Rpd.renderer('bar', function(user_conf) {
            return barUpdateSpy;
        });

        Rpd.Patch.start('foo')
                 .renderWith('foo')
                 .renderWith('bar');

        expect(fooUpdateSpy).not.toHaveBeenCalled();
        expect(barUpdateSpy).not.toHaveBeenCalled();

    });

    xit('receives all events, if at least one target was specified', function() {

        var fooUpdateSpy = jasmine.createSpy('foo-update');
        var fooRenderer = Rpd.renderer('foo', function(user_conf) {
            return fooUpdateSpy;
        });

        var barUpdateSpy = jasmine.createSpy('bar-update');
        var barRenderer = Rpd.renderer('bar', function(user_conf) {
            return barUpdateSpy;
        });

        var targetOne = {}, targetTwo = {}, targetThree = {};

        Rpd.Patch.start()
                 .renderWith('foo')
                 .attachTo(targetOne)
                 .attachTo(targetTwo)
                 .renderWith('bar')
                 .attachTo(targetThree);

        expect(fooUpdateSpy).toHaveBeenCalledWith(targetOne,
                             jasmine.objectContaining({ type: 'patch/new' }));
        expect(fooUpdateSpy).toHaveBeenCalledWith(targetTwo,
                             jasmine.objectContaining({ type: 'patch/new' }));
        expect(fooUpdateSpy).toHaveBeenCalledWith(targetThree,
                             jasmine.objectContaining({ type: 'patch/new' }));

        expect(barUpdateSpy).toHaveBeenCalledWith(targetOne,
                             jasmine.objectContaining({ type: 'patch/new' }));
        expect(barUpdateSpy).toHaveBeenCalledWith(targetTwo,
                             jasmine.objectContaining({ type: 'patch/new' }));
        expect(barUpdateSpy).toHaveBeenCalledWith(targetThree,
                             jasmine.objectContaining({ type: 'patch/new' }));

    });

    xit('is called once for every new patch', function() {
        var updateSpy = jasmine.createSpy('update');
        var rendererSpy = jasmine.createSpy('renderer').and.returnValue(function() {});

        Rpd.renderer('foo', rendererSpy);

        Rpd.Patch.start().renderWith('foo');
        expect(rendererSpy).toHaveBeenCalledOnce();
        Rpd.Patch.start().renderWith('foo');
        expect(rendererSpy).toHaveBeenCalledTwice();

    });

    xit('receives configuration passed from a user', function() {
        var configurationSpy = jasmine.createSpy('configuration');
        var renderer = Rpd.renderer('foo', function(user_conf) {
            configurationSpy(user_conf);
            return function() {};
        });

        var confMock = {};

        Rpd.Patch.start().renderWith('foo', confMock);

        expect(configurationSpy).toHaveBeenCalledWith(confMock);
    });

    xit('could handle specific events', function() {
        var newPatchSpy = jasmine.createSpy('new-node');
        var renderer = Rpd.renderer('foo', function() {
            return function(root, update) {
                if (update.type === 'patch/new') newPatchSpy();
            };
        });

        var patch = Rpd.Patch.start().renderWith('foo').attachTo({});

        patch.addNode('spec/empty');

        expect(newPatchSpy).toHaveBeenCalled();
    });

    xdescribe('with entering and exiting patches', function() {

        xit('gets construction events happened before renderer was set', function() {
            var updateSpy = jasmine.createSpy('update');

            var renderer = Rpd.renderer('foo', function() { return updateSpy; });

            var patch = Rpd.Patch.start();
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/pass', 'foo');

            patch.renderWith('foo');
            expect(updateSpy).not.toHaveBeenCalled();
            patch.attachTo({});

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    node: node
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/add',
                    inlet: inlet
                }));
        });

        xit('still gets these updates if there were several renderers set');

        xit('entering patch from the start is equivalent to just starting it', function() {

        });

        xit('also buffers construction events while user exits from the patch', function() {
            var updateSpy = jasmine.createSpy('update');
            var renderer = Rpd.renderer('foo', function() { return updateSpy; });

            var patch = Rpd.Patch.start().renderWith('foo').attachTo({});
            var node = patch.addNode('spec/empty');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'node/add',
                    node: node
                }));
            updateSpy.calls.reset();

            patch.exit();

            var inlet = node.addInlet('spec/pass', 'foo');
            expect(updateSpy).not.toHaveBeenCalled();

            patch.enter();

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'node/add-inlet',
                    inlet: inlet
                }));
        });

        xit('only fires the update with the last value of the inlet when patch was entered back', function() {
            var updateSpy = jasmine.createSpy('update');
            var renderer = Rpd.renderer('foo', function() { return updateSpy; });

            var patch = Rpd.Patch.start().renderWith('foo').attachTo({});
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/pass', 'foo');
            inlet.receive(5);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'inlet/update',
                    value: 5
                }));

            patch.exit();

            inlet.receive(3);
            inlet.receive(17);
            inlet.receive(10);

            patch.enter();

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'inlet/update',
                    value: 17
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'inlet/update',
                    value: 10
                }));

        });

        xit('passes rendering to other patches user made active', function() {
            var updateSpy = jasmine.createSpy('update');
            var renderer = Rpd.renderer('foo', function() { return updateSpy; });

            var patch1 = Rpd.Patch.start().renderWith('foo').attachTo({});
            var patch2 = Rpd.Patch.start().exit().renderWith('foo').attachTo({});

            var node1 = patch1.addNode('spec/empty');
            var node2 = patch2.addNode('spec/empty');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'node/add',
                    node: node1
                }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'node/add',
                    value: node2
                }));

            updateSpy.calls.reset();

            patch1.exit();
            patch2.enter();

            node1 = patch1.addNode('spec/empty');
            node2 = patch2.addNode('spec/empty');

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'node/add',
                    node: node1
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'node/add',
                    value: node2
                }));

        });

        xit('passes rendering to several renderers if they were assigned to same active patch');

        xit('receives \'new patch\' event at least once');

    });

});
