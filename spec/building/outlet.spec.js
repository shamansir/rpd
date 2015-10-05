describe('building: outlet', function() {

    it('informs it has been added to a node', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var outlet = node.addOutlet('spec/any', 'foo');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-outlet',
                                           outlet: outlet })
            );

        });
    });

    it('informs it has been removed from a node', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var outlet = node.addOutlet('spec/any', 'foo');
            node.removeOutlet(outlet);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/remove-outlet',
                                           outlet: outlet })
            );

        });
    });

    it('sends no updates on creation', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var outlet = node.addOutlet('spec/any', 'foo');

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/update' }));

        });
    });

    it('sends default value on creation, if it was specified', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var outlet = node.addOutlet('spec/any', 'foo');

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/update' }));

        });
    });

    it('sends single value given explicitly by user', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var userValue = { 'foo': 'bar' };
            var outlet = node.addOutlet('spec/any', 'foo');
            outlet.send(userValue);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/update',
                                           outlet: outlet,
                                           value: userValue }));

        });
    });

    it('may send sequences of values from a stream', function(done) {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var userSequence = [ 2, 'foo', { 'foo': 'bar' } ];
            var period = 30;

            var outlet = node.addOutlet('spec/any', 'foo');
            outlet.stream(Kefir.sequentially(period, userSequence));

            setTimeout(function() {
                for (var i = 0; i < userSequence.length; i++) {
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'outlet/update',
                                                   outlet: outlet,
                                                   value: userSequence[i] }));
                }
                done();
            }, period * (userSequence.length + 1));

        });
    });

    it('stops receiving values when it was removed from a node', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var outlet = node.addOutlet('spec/any', 'foo');
            node.removeOutlet(outlet);

            outlet.send(10);

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/update' }));

        });
    });

    it('stops receiving streamed values when it was removed from a node', function(done) {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var sequence = [ 1, 2, 3 ];
            var period = 30;

            var outlet = node.addOutlet('spec/any', 'foo');
            node.removeOutlet(outlet);

            outlet.stream(Kefir.sequentially(period, sequence));

            setTimeout(function() {
                expect(updateSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'outlet/update' }));
                done();
            }, period * (sequence.length + 1));

        });
    });

    it('adds new stream to a previous one when new stream sent to it', function() {

        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var firstStream = Kefir.emitter();
            var secondStream = Kefir.emitter();

            var outlet = node.addOutlet('spec/any', 'foo');

            outlet.stream(firstStream.map(function() { return 1; }));
            firstStream.emit({});

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/update', value: 1 }));

            updateSpy.calls.reset();
            outlet.stream(secondStream.map(function() { return 2; }));
            secondStream.emit({});
            firstStream.emit({});

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/update', value: 2 }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/update', value: 1 }));

        });

    });

    it('disconnects all the links attached to the outlet after it was removed from a node', function() {
        withNewPatch(function(patch, updateSpy) {

            var nodeOne = patch.addNode('spec/empty');
            var nodeTwo = patch.addNode('spec/empty');
            var nodeThree = patch.addNode('spec/empty');

            var inletOne = nodeOne.addInlet('spec/any', 'one');
            var inletTwo = nodeTwo.addInlet('spec/any', 'two');
            var outlet = nodeTwo.addOutlet('spec/any', 'inlet');

            outlet.connect(inletOne, 'spec/pass');
            outlet.connect(inletTwo, 'spec/pass');

            nodeTwo.removeOutlet(outlet);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/disconnect',
                                           inlet: inletOne }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/disconnect',
                                           inlet: inletTwo }));

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
                if (update.type === 'node/remove-outlet') {
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'outlet/disconnect' }));
                }
            });

            nodeOne.removeOutlet(outlet);

            expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'node/remove-outlet' }));
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

            nodeOne.removeOutlet(outlet);
            nodeTwo.removeInlet(inlet);

            expect(deleteLinkSpy).toHaveBeenCalledOnce();
        });
    });

    it('does not disconnect links on outlet removal, which were disconnected before', function() {
        withNewPatch(function(patch, updateSpy) {
            var nodeOne = patch.addNode('spec/empty');
            var nodeTwo = patch.addNode('spec/empty');

            var outlet = nodeOne.addOutlet('spec/any', 'one');
            var inlet = nodeTwo.addInlet('spec/any', 'one');

            var link = outlet.connect(inlet, 'spec/pass');
            outlet.disconnect(link);

            updateSpy.calls.reset();

            nodeTwo.removeOutlet(outlet);

            expect(updateSpy).not.toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'outlet/disconnect',
                link: link
            }));
        });
    });


});
