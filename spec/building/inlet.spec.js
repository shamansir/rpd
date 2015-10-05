describe('building: inlet', function() {

    it('informs it has been added to a node', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var inlet = node.addInlet('spec/any', 'foo');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: inlet }));

        });
    });

    it('informs it has been removed from a node with an event', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var inlet = node.addInlet('spec/any', 'foo');
            node.removeInlet(inlet);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/remove-inlet',
                                           inlet: inlet }));

        });
    });

    it('receives no updates on creation', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var inlet = node.addInlet('spec/any', 'foo');

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update' }));

        });
    });

    it('receives default value on creation, if it was specified', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var defaultValue = { 'foo': 'bar' };
            var inlet = node.addInlet('spec/any', 'foo', 'Foo', defaultValue);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           inlet: inlet,
                                           value: defaultValue }));

        });
    });

    it('receives single value given explicitly by user', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var userValue = { 'foo': 'bar' };
            var inlet = node.addInlet('spec/any', 'foo');
            inlet.receive(userValue);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           inlet: inlet,
                                           value: userValue }));

        });
    });

    it('receives values when follows a stream provided by user', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var userValue = { 'foo': 'bar' };
            var inlet = node.addInlet('spec/any', 'foo');
            inlet.stream(Kefir.constant(userValue));

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           inlet: inlet,
                                           value: userValue }));

        });
    });

    it('may receive sequences of values from a stream', function(done) {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var userSequence = [ 2, 'foo', { 'foo': 'bar' } ];
            var period = 30;

            var inlet = node.addInlet('spec/any', 'foo');
            inlet.stream(Kefir.sequentially(period, userSequence));

            setTimeout(function() {
                for (var i = 0; i < userSequence.length; i++) {
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   inlet: inlet,
                                                   value: userSequence[i] }));
                }
                done();
            }, period * (userSequence.length + 1));

        });
    });

    it('stops receiving values when it was removed from a node', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var inlet = node.addInlet('spec/any', 'foo');
            node.removeInlet(inlet);

            inlet.receive(10);

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update' }));

        });
    });

    it('stops receiving streamed values when it was removed from a node', function(done) {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var sequence = [ 1, 2, 3 ];
            var period = 30;

            var inlet = node.addInlet('spec/any', 'foo');
            node.removeInlet(inlet);

            inlet.stream(Kefir.sequentially(period, sequence));

            setTimeout(function() {
                expect(updateSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'inlet/update' }));
                done();
            }, period * (sequence.length + 1));

        });
    });

    it('adds new stream to a previous one when new stream sent to it', function() {

        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var firstStream = Kefir.emitter();
            var secondStream = Kefir.emitter();

            var inlet = node.addInlet('spec/any', 'foo');

            inlet.stream(firstStream.map(function() { return 1; }));
            firstStream.emit({});

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update', value: 1 }));

            updateSpy.calls.reset();
            inlet.stream(secondStream.map(function() { return 2; }));
            secondStream.emit({});
            firstStream.emit({});

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update', value: 2 }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update', value: 1 }));

        });


    });

    it('disconnects all the links attached to the inlet after it was removed from a node', function() {
        withNewPatch(function(patch, updateSpy) {

            var nodeOne = patch.addNode('spec/empty');
            var nodeTwo = patch.addNode('spec/empty');
            var nodeThree = patch.addNode('spec/empty');

            var outletOne = nodeOne.addOutlet('spec/any', 'one');
            var outletTwo = nodeTwo.addOutlet('spec/any', 'two');
            var inlet = nodeTwo.addInlet('spec/any', 'inlet');

            outletOne.connect(inlet, 'spec/pass');
            outletTwo.connect(inlet, 'spec/pass');

            nodeTwo.removeInlet(inlet);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/disconnect',
                                           outlet: outletOne }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/disconnect',
                                           outlet: outletTwo }));

        });
    });

    it('fires disconnect events before the remove event', function() {
        withNewPatch(function(patch, updateSpy) {
            var nodeOne = patch.addNode('spec/empty');
            var nodeTwo = patch.addNode('spec/empty');

            var outlet = nodeOne.addOutlet('spec/any', 'one');
            var inlet = nodeTwo.addInlet('spec/any', 'one');

            outlet.connect(inlet, 'spec/pass');

            updateSpy.and.callFake(function(update) {
                if (update.type === 'node/remove-inlet') {
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'outlet/disconnect' }));
                }
            });

            nodeTwo.removeInlet(inlet);

            expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'node/remove-inlet' }));
        });
    });

    it('does not disconnects same link twice on channel removal', function() {
        withNewPatch(function(patch, updateSpy) {
            var nodeOne = patch.addNode('spec/empty');
            var nodeTwo = patch.addNode('spec/empty');

            var outlet = nodeOne.addOutlet('spec/any', 'one');
            var inlet = nodeTwo.addInlet('spec/any', 'one');

            var link = outlet.connect(inlet, 'spec/pass');

            var deleteLinkSpy = jasmine.createSpy('delete-link-' + link.id);

            updateSpy.and.callFake(function(update) {
                if ((update.type === 'outlet/disconnect') &&
                    (update.link.id === link.id)) {
                    deleteLinkSpy();
                }
            });

            nodeTwo.removeInlet(inlet);
            nodeOne.removeOutlet(outlet);

            expect(deleteLinkSpy).toHaveBeenCalledOnce();
        });
    });

    it('does not disconnect links on inlet removal, which were disconnected before', function() {
        withNewPatch(function(patch, updateSpy) {
            var nodeOne = patch.addNode('spec/empty');
            var nodeTwo = patch.addNode('spec/empty');

            var outlet = nodeOne.addOutlet('spec/any', 'one');
            var inlet = nodeTwo.addInlet('spec/any', 'one');

            var link = outlet.connect(inlet, 'spec/pass');
            outlet.disconnect(link);

            updateSpy.calls.reset();

            nodeTwo.removeInlet(inlet);

            expect(updateSpy).not.toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'outlet/disconnect',
                link: link
            }));
        });
    });

});
