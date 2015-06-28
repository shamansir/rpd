describe('registration: node renderer', function() {

    it('could be defined as an empty object', function() {
        expect(function() {
            Rpd.noderenderer('spec/empty', 'spec', {});
        }).not.toThrow();
    });

    describe('transferring with the events', function() {

        var updateSpy;
        var model;

        beforeEach(function() {
            updateSpy = jasmine.createSpy('update');

            Rpd.renderer('spec', function() { return updateSpy; });
            Rpd.nodetype('spec/foo', {
                process: function() {}
            });

            model = Rpd.Model.start().renderWith('spec').attachTo({});
        });

        it('even if it\'s an empty object, passed with node adding and processing event', function() {

            var renderer = {};

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var node = model.addNode('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: renderer
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/process',
                    render: renderer
                }));

        });

        xit('the normal update stream should not set this field to an update event', function() {

            var modelEventsSpy = jasmine.createSpy('model-events');
            model.events.onValue(modelEventsSpy);

            var node = model.addNode('spec/foo');
            var nodeEventsSpy = jasmine.createSpy('node-events');
            node.events.onValue(nodeEventsSpy);

            var renderer = {};

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(modelEventsSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add', render: renderer }));
            expect(modelEventsSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/process', render: renderer }));

            expect(nodeEventsSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/process', render: renderer }));

        });

        it('one could define render-first function which is passed with node adding event', function() {

            var renderFirst = function() {};
            var renderer = { first: renderFirst };

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var node = model.addNode('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: { first: renderFirst }
                }));

        });

        it('one could define render-always function which is passed both with node adding event and node processing events', function() {

            var renderAlways = function() {};
            var renderer = { always: renderAlways };

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var node = model.addNode('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: { always: renderAlways }
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/process',
                    render: { always: renderAlways }
                }));

        });

        it('one could define both render-first and render-always functions which are passed with node adding and node processing events', function() {

            var renderFirst  = function() {},
                renderAlways = function() {};
            var renderer = { first:  renderFirst,
                             always: renderAlways };

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var node = model.addNode('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: { first: renderFirst,
                              always: renderAlways }
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/process',
                    render: jasmine.objectContaining({ always: renderAlways })
                }));

        });

        it('one could define a single function which is executed on every node creation and returns the renderer for that node', function() {

            var renderers = {};
            var rendererGenSpy = jasmine.createSpy('renderer-generator')
                                        .and.callFake(function(node) {
                return (renderers[node.name] = {
                    first: function() { },
                    always: function() { },
                });
            });

            Rpd.noderenderer('spec/foo', 'spec', rendererGenSpy);

            var nodeOne = model.addNode('spec/foo', 'node-1');
            nodeOne.addInlet('spec/any', 'a').receive('a');

            expect(rendererGenSpy).toHaveBeenCalledOnce();
            expect(rendererGenSpy).toHaveBeenCalledWith(nodeOne);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: renderers['node-1']
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/process',
                    render: renderers['node-1']
                }));

            var nodeTwo = model.addNode('spec/foo', 'node-2');
            nodeTwo.addInlet('spec/any', 'a').receive('b');

            expect(rendererGenSpy).toHaveBeenCalledTwice();
            expect(rendererGenSpy).toHaveBeenCalledWith(nodeTwo);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: renderers['node-2']
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/process',
                    render: renderers['node-2']
                }));

        });

        it('not passes this renderer if current renderer is different from the registered one', function() {

            var renderFirst  = function() {},
                renderAlways = function() {};
            var renderer = { first:  renderFirst,
                             always: renderAlways };

            Rpd.noderenderer('spec/foo', 'sp_c', renderer);

            var node = model.addNode('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: jasmine.objectContaining({ first: renderFirst })
                }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: jasmine.objectContaining({ always: renderAlways })
                }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/process',
                    render: jasmine.objectContaining({ always: renderAlways })
                }));

        });

    });

});
