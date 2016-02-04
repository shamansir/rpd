describe('registration: channel renderer', function() {

    it('could be defined as an empty object', function() {
        expect(function() {
            Rpd.channelrenderer('spec/foo', 'spec', {});
        }).not.toThrow();
    });

    describe('transferring with the events', function() {

        var addInletSpy, addOutletSpy;
        var inletUpdateSpy, outletUpdateSpy;

        var patch;
        var node;

        beforeEach(function() {
            addInletSpy = jasmine.createSpy('add-inlet');
            addOutletSpy = jasmine.createSpy('add-outlet');
            inletUpdateSpy = jasmine.createSpy('inlet-update');
            outletUpdateSpy = jasmine.createSpy('outlet-update');

            Rpd.channeltype('spec/foo');

            Rpd.renderer('spec', function(patch) {
                return function(target, conf) {
                    return {
                        'node/add-inlet': addInletSpy,
                        'node/add-outlet': addOutletSpy,
                        'inlet/update': inletUpdateSpy,
                        'outlet/update': outletUpdateSpy
                    }
                }
            });

            patch = Rpd.addPatch().render('spec', {}).enter();

            node = patch.addNode('spec/empty');
        });

        it('even if it\'s an empty object, passed with channel adding and updating event', function() {

            var renderer = {};

            Rpd.channelrenderer('spec/foo', 'spec', renderer);

            var inlet = node.addInlet('spec/foo', 'a');
            inlet.receive('a');
            var outlet = node.addOutlet('spec/foo', 'b');
            outlet.send('b');

            expect(addInletSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderer
                }));
            expect(addOutletSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderer
                }));
            expect(inletUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderer
                }));
            expect(outletUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderer
                }));

        });

        it('the normal update stream should not set this field to an update event', function() {
             var patchEventsSpy = jasmine.createSpy('patch-events');
             patch.events.onValue(patchEventsSpy);
             var nodeEventsSpy = jasmine.createSpy('node-events');
             node.events.onValue(nodeEventsSpy);

             var renderer = {};

             Rpd.channelrenderer('spec/foo', 'spec', renderer);

             var inlet = node.addInlet('spec/foo', 'a');
             inlet.receive('a');
             var outlet = node.addOutlet('spec/foo', 'b');
             outlet.send('b');

             expect(patchEventsSpy).not.toHaveBeenCalledWith(
                 jasmine.objectContaining({ type: 'inlet/add', render: renderer }));
             expect(patchEventsSpy).not.toHaveBeenCalledWith(
                 jasmine.objectContaining({ type: 'inlet/update', render: renderer }));
             expect(patchEventsSpy).not.toHaveBeenCalledWith(
                 jasmine.objectContaining({ type: 'outlet/add', render: renderer }));
             expect(patchEventsSpy).not.toHaveBeenCalledWith(
                 jasmine.objectContaining({ type: 'outlet/update', render: renderer }));

             expect(nodeEventsSpy).not.toHaveBeenCalledWith(
                 jasmine.objectContaining({ type: 'inlet/add', render: renderer }));
             expect(nodeEventsSpy).not.toHaveBeenCalledWith(
                 jasmine.objectContaining({ type: 'inlet/update', render: renderer }));
             expect(nodeEventsSpy).not.toHaveBeenCalledWith(
                 jasmine.objectContaining({ type: 'outlet/add', render: renderer }));
             expect(nodeEventsSpy).not.toHaveBeenCalledWith(
                 jasmine.objectContaining({ type: 'outlet/update', render: renderer }));

         });

        it('one could define render-show function which is passed both with channel adding and updating event', function() {

            var renderShow = function() {};
            var renderer = { show: renderShow };

            Rpd.channelrenderer('spec/foo', 'spec', renderer);

            var inlet = node.addInlet('spec/foo', 'a');
            inlet.receive('a');
            var outlet = node.addOutlet('spec/foo', 'b');
            outlet.send('b');

            expect(addInletSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { show: renderShow }
                }));

            expect(addOutletSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { show: renderShow }
                }));
            expect(inletUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { show: renderShow }
                }));
            expect(outletUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { show: renderShow }
                }));

        });

        it('one could define render-edit function which is passed both with node adding event and node processing events', function() {

            var renderEdit = function() {};
            var renderer = { edit: renderEdit };

            Rpd.channelrenderer('spec/foo', 'spec', renderer);

            var inlet = node.addInlet('spec/foo', 'a');
            inlet.receive('a');
            var outlet = node.addOutlet('spec/foo', 'b');
            outlet.send('b');

            expect(addInletSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { edit: renderEdit }
                }));
            expect(addOutletSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { edit: renderEdit }
                }));
            expect(inletUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { edit: renderEdit }
                }));
            expect(outletUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { edit: renderEdit }
                }));

        });

        it('one could define both render-show and render-edit functions which are passed with channel adding and updating events', function() {

            var renderShow = function() {},
                renderEdit = function() {};
            var renderer = { show: renderShow,
                             edit: renderEdit };

            Rpd.channelrenderer('spec/foo', 'spec', renderer);

            var inlet = node.addInlet('spec/foo', 'a');
            inlet.receive('a');
            var outlet = node.addOutlet('spec/foo', 'b');
            outlet.send('b');

            expect(addInletSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { show: renderShow,
                              edit: renderEdit }
                }));
            expect(addOutletSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { show: renderShow,
                              edit: renderEdit }
                }));
            expect(inletUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { show: renderShow,
                              edit: renderEdit }
                }));
            expect(outletUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: { show: renderShow,
                              edit: renderEdit }
                }));

        });

        it('one could define a single function which is executed on every node creation, gets channel instance and returns the renderer for that node', function() {
            var renderers = {};

            var rendererGenSpy = jasmine.createSpy('renderer-generator')
                                        .and.callFake(function(channel) {
                return (renderers[channel.id] = {
                    show: function() { },
                    edit: function() { },
                });
            });

            Rpd.channelrenderer('spec/foo', 'spec', rendererGenSpy);

            var inletA = node.addInlet('spec/foo', 'inlet-a');
            inletA.receive('a');

            expect(rendererGenSpy).toHaveBeenCalledOnce();
            expect(rendererGenSpy).toHaveBeenCalledWith(inletA);

            expect(addInletSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderers[inletA.id]
                }));
            expect(inletUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderers[inletA.id]
                }));

            var inletB = node.addInlet('spec/foo', 'inlet-b');
            inletB.receive('b');

            expect(rendererGenSpy).toHaveBeenCalledTwice();
            expect(rendererGenSpy).toHaveBeenCalledWith(inletB);

            expect(addInletSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderers[inletB.id]
                }));
            expect(inletUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderers[inletB.id]
                }));

            var outletA = node.addOutlet('spec/foo', 'outlet-a');
            outletA.send('a');

            expect(rendererGenSpy).toHaveBeenCalledTimes(3);
            expect(rendererGenSpy).toHaveBeenCalledWith(outletA);

            expect(addOutletSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: renderers[outletA.id]
                }));
            expect(outletUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'outlet/update',
                    render: renderers[outletA.id]
                }));

        });

        it('not passes this renderer if current renderer is different from the registered one', function() {

            var renderShow = function() {},
                renderEdit = function() {};
            var renderer = { show: renderShow,
                             edit: renderEdit };

            Rpd.channelrenderer('spec/foo', 'sp_c', renderer);

            node.addInlet('spec/foo','a').receive('a');
            node.addInlet('spec/foo','b').receive('b');
            node.addOutlet('spec/foo','c').send('c');

            expect(addInletSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: jasmine.objectContaining({ show: renderShow })
                }));
            expect(addInletSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: jasmine.objectContaining({ edit: renderEdit })
                }));
            expect(inletUpdateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: jasmine.objectContaining({ show: renderShow })
                }));
            expect(inletUpdateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: jasmine.objectContaining({ edit: renderEdit })
                }));
            expect(addOutletSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: jasmine.objectContaining({ show: renderShow })
                }));
            expect(addOutletSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: jasmine.objectContaining({ edit: renderEdit })
                }));
            expect(outletUpdateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: jasmine.objectContaining({ show: renderShow })
                }));
            expect(outletUpdateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    render: jasmine.objectContaining({ edit: renderEdit })
                }));

        });

    });

});
