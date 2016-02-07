describe('registration: node renderer', function() {

    it('could be defined as an empty object', function() {
        expect(function() {
            Rpd.noderenderer('spec/empty', 'spec', {});
        }).not.toThrow();
    });

    describe('transferring with the events', function() {

        var addNodeSpy, processSpy;
        var patch;

        beforeEach(function() {
            addNodeSpy = jasmine.createSpy('add-node');
            processSpy = jasmine.createSpy('process');

            Rpd.nodetype('spec/foo', {
                process: function() {}
            });

            Rpd.renderer('spec', function(patch) {
                return function(target, conf) {
                    return {
                        'patch/add-node': addNodeSpy,
                        'node/process': processSpy
                    }
                }
            });

            patch = Rpd.addPatch().render('spec', {}).enter();
        });

        it('even if it\'s an empty object, passed with node adding and processing event', function() {

            var renderer = {};

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var node = patch.addNode('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(addNodeSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderer
                }));
            expect(processSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderer
                }));

        });

        it('the normal update stream should not set this field to an update event', function() {

             var patchEventsSpy = jasmine.createSpy('patch-events');
             patch.events.onValue(patchEventsSpy);

             var node = patch.addNode('spec/foo');
             var nodeEventsSpy = jasmine.createSpy('node-events');
             node.events.onValue(nodeEventsSpy);

             var renderer = {};

             Rpd.noderenderer('spec/foo', 'spec', renderer);

             var inlet = node.addInlet('spec/any', 'a');
             inlet.receive('a');

             expect(patchEventsSpy).not.toHaveBeenCalledWith(
                 jasmine.objectContaining({ type: 'patch/add-node', render: renderer }));
             expect(patchEventsSpy).not.toHaveBeenCalledWith(
                 jasmine.objectContaining({ type: 'node/process', render: renderer }));

             expect(nodeEventsSpy).not.toHaveBeenCalledWith(
                 jasmine.objectContaining({ type: 'node/process', render: renderer }));

         });

        it('one could define render-first function which is passed with node adding event', function() {

            var renderFirst = function() {};
            var renderer = { first: renderFirst };

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var node = patch.addNode('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(addNodeSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { first: renderFirst }
                }));

        });

        it('one could define render-always function which is passed both with node adding event and node processing events', function() {

            var renderAlways = function() {};
            var renderer = { always: renderAlways };

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var node = patch.addNode('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(addNodeSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/add-node',
                    render: { always: renderAlways }
                }));
            expect(processSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { always: renderAlways }
                }));

        });

        it('one could define both render-first and render-always functions which are passed with node adding and node processing events', function() {

            var renderFirst  = function() {},
                renderAlways = function() {};
            var renderer = { first:  renderFirst,
                             always: renderAlways };

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var node = patch.addNode('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(addNodeSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { first: renderFirst,
                              always: renderAlways }
                }));
            expect(processSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: jasmine.objectContaining({ always: renderAlways })
                }));

        });

        it('one could define a single function which is executed on every node creation, gets node instance and returns the renderer for that node', function() {

            var renderers = {};
            var rendererGenSpy = jasmine.createSpy('renderer-generator')
                                        .and.callFake(function(node) {
                return (renderers[node.id] = {
                    first: function() { },
                    always: function() { },
                });
            });

            Rpd.noderenderer('spec/foo', 'spec', rendererGenSpy);

            var nodeOne = patch.addNode('spec/foo');
            nodeOne.addInlet('spec/any', 'a').receive('a');

            expect(rendererGenSpy).toHaveBeenCalledOnce();
            expect(rendererGenSpy).toHaveBeenCalledWith(nodeOne);

            expect(addNodeSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderers[nodeOne.id]
                }));
            expect(processSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderers[nodeOne.id]
                }));

            var nodeTwo = patch.addNode('spec/foo');
            nodeTwo.addInlet('spec/any', 'a').receive('b');

            expect(rendererGenSpy).toHaveBeenCalledTwice();
            expect(rendererGenSpy).toHaveBeenCalledWith(nodeTwo);

            expect(addNodeSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderers[nodeTwo.id]
                }));
            expect(processSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderers[nodeTwo.id]
                }));

        });

        it('not passes this renderer if current renderer is different from the registered one', function() {

            var renderFirst  = function() {},
                renderAlways = function() {};
            var renderer = { first:  renderFirst,
                             always: renderAlways };

            Rpd.noderenderer('spec/foo', 'sp_c', renderer);

            var node = patch.addNode('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(addNodeSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: jasmine.objectContaining({ first: renderFirst })
                }));
            expect(addNodeSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: jasmine.objectContaining({ always: renderAlways })
                }));
            expect(processSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: jasmine.objectContaining({ always: renderAlways })
                }));

        });

    });

});
