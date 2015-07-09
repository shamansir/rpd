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

        Rpd.Model.start('foo')
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

        Rpd.Model.start()
                 .renderWith('foo')
                 .attachTo(targetOne)
                 .attachTo(targetTwo)
                 .renderWith('bar')
                 .attachTo(targetThree);

        expect(fooUpdateSpy).toHaveBeenCalledWith(targetOne,
                             jasmine.objectContaining({ type: 'model/new' }));
        expect(fooUpdateSpy).toHaveBeenCalledWith(targetTwo,
                             jasmine.objectContaining({ type: 'model/new' }));
        expect(fooUpdateSpy).toHaveBeenCalledWith(targetThree,
                             jasmine.objectContaining({ type: 'model/new' }));

        expect(barUpdateSpy).toHaveBeenCalledWith(targetOne,
                             jasmine.objectContaining({ type: 'model/new' }));
        expect(barUpdateSpy).toHaveBeenCalledWith(targetTwo,
                             jasmine.objectContaining({ type: 'model/new' }));
        expect(barUpdateSpy).toHaveBeenCalledWith(targetThree,
                             jasmine.objectContaining({ type: 'model/new' }));

    });

    it('is called once for every new model', function() {
        var updateSpy = jasmine.createSpy('update');
        var rendererSpy = jasmine.createSpy('renderer').and.returnValue(function() {});

        Rpd.renderer('foo', rendererSpy);

        Rpd.Model.start().renderWith('foo');
        expect(rendererSpy).toHaveBeenCalledOnce();
        Rpd.Model.start().renderWith('foo');
        expect(rendererSpy).toHaveBeenCalledTwice();

    });

    it('receives configuration passed from a user', function() {
        var configurationSpy = jasmine.createSpy('configuration');
        var renderer = Rpd.renderer('foo', function(user_conf) {
            configurationSpy(user_conf);
            return function() {};
        });

        var confMock = {};

        Rpd.Model.start().renderWith('foo', confMock);

        expect(configurationSpy).toHaveBeenCalledWith(confMock);
    });

    it('could handle specific events', function() {
        var newModelSpy = jasmine.createSpy('new-node');
        var renderer = Rpd.renderer('foo', function() {
            return function(root, update) {
                if (update.type === 'model/new') newModelSpy();
            };
        });

        var model = Rpd.Model.start().renderWith('foo').attachTo({});

        model.addNode('spec/empty');

        expect(newModelSpy).toHaveBeenCalled();
    });

    xdescribe('with entering and exiting models', function() {

        it('gets construction events happened before renderer was set', function() {
            var updateSpy = jasmine.createSpy('update');

            var renderer = Rpd.renderer('foo', function() { return updateSpy; });

            var model = Rpd.Model.start();
            var node = model.addNode('spec/empty');
            var inlet = node.addInlet('spec/pass', 'foo');

            model.renderWith('foo');
            expect(updateSpy).not.toHaveBeenCalled();
            model.attachTo({});

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

        it('entering model from the start is equivalent to just starting it', function() {

        });

        it('also buffers construction events while user exits from the model', function() {
            var updateSpy = jasmine.createSpy('update');
            var renderer = Rpd.renderer('foo', function() { return updateSpy; });

            var model = Rpd.Model.start().renderWith('foo').attachTo({});
            var node = model.addNode('spec/empty');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    node: node
                }));
            updateSpy.calls.reset();

            model.exit();

            var inlet = node.addInlet('spec/pass', 'foo');
            expect(updateSpy).not.toHaveBeenCalled();

            model.enter();

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/add',
                    inlet: inlet
                }));
        });

        it('only fires the update with the last value of the inlet when model was entered back', function() {
            var updateSpy = jasmine.createSpy('update');
            var renderer = Rpd.renderer('foo', function() { return updateSpy; });

            var model = Rpd.Model.start().renderWith('foo').attachTo({});
            var node = model.addNode('spec/empty');
            var inlet = node.addInlet('spec/pass', 'foo');
            inlet.receive(5);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update',
                    value: 5
                }));

            model.exit();

            inlet.receive(3);
            inlet.receive(17);
            inlet.receive(10);

            model.enter();

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update',
                    value: 17
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update',
                    value: 10
                }));

        });

        it('passes rendering to other models user made active', function() {
            var updateSpy = jasmine.createSpy('update');
            var renderer = Rpd.renderer('foo', function() { return updateSpy; });

            var model1 = Rpd.Model.start().renderWith('foo').attachTo({});
            var model2 = Rpd.Model.start().exit().renderWith('foo').attachTo({});

            var node1 = model1.addNode('spec/empty');
            var node2 = model2.addNode('spec/empty');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    node: node1
                }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    value: node2
                }));

            updateSpy.calls.reset();

            model1.exit();
            model2.enter();

            node1 = model1.addNode('spec/empty');
            node2 = model2.addNode('spec/empty');

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    node: node1
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    value: node2
                }));

        });

        it('passes rendering to several renderers if they were assigned to same active model');

        it('receives \'new model\' event at least once');

    });

});
