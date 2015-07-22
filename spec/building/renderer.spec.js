describe('building: renderer', function() {

    xit('should have an alias', function() {
        expect(function() {
            Rpd.renderer();
        }).toThrow();
    });

    it('receives no events if no target was specified', function() {

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

    it('receives all events, if at least one target was specified', function() {

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

    it('is called once for every new patch', function() {
        var updateSpy = jasmine.createSpy('update');
        var rendererSpy = jasmine.createSpy('renderer').and.returnValue(function() {});

        Rpd.renderer('foo', rendererSpy);

        Rpd.Patch.start().renderWith('foo');
        expect(rendererSpy).toHaveBeenCalledOnce();
        Rpd.Patch.start().renderWith('foo');
        expect(rendererSpy).toHaveBeenCalledTwice();

    });

    it('receives configuration passed from a user', function() {
        var configurationSpy = jasmine.createSpy('configuration');
        var renderer = Rpd.renderer('foo', function(user_conf) {
            configurationSpy(user_conf);
            return function() {};
        });

        var confMock = {};

        Rpd.Patch.start().renderWith('foo', confMock);

        expect(configurationSpy).toHaveBeenCalledWith(confMock);
    });

    it('could handle specific events', function() {
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

    xdescribe('with entering and exiting patchs', function() {

        it('gets construction events happened before renderer was set', function() {
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

        it('still gets these updates if there were several renderers set');

        it('entering patch from the start is equivalent to just starting it', function() {

        });

        it('also buffers construction events while user exits from the patch', function() {
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

        it('only fires the update with the last value of the inlet when patch was entered back', function() {
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

        it('passes rendering to other patchs user made active', function() {
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

        it('passes rendering to several renderers if they were assigned to same active patch');

        it('receives \'new patch\' event at least once');

    });

});
