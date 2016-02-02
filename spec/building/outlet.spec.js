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

    it('requires alias to be specified', function() {
        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            expect(function() {
                node.addOutlet('spec/any');
            }).toThrow();
        });
    });

    it('sets label to alias, if it was not specified', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            node.addOutlet('spec/any', 'foo');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-outlet',
                                           inlet: jasmine.objectContaining({ label: 'foo' }) }));
        });
    });

    it('sets the label, if it was specified (in contrast to alias)', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            node.addOutlet('spec/any', 'foo', 'Foo');
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-outlet',
                                           inlet: jasmine.objectContaining({ label: 'Foo' }) }));

            updateSpy.calls.reset();
            node.addOutlet('spec/any', 'foo', { label: 'Foo' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-outlet',
                                           inlet: jasmine.objectContaining({ label: 'Foo' }) }));

            updateSpy.calls.reset();
            node.addOutlet('spec/any', 'foo', 'Foo', { label: 'Bar' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-outlet',
                                           inlet: jasmine.objectContaining({ label: 'Foo' }) }));

            updateSpy.calls.reset();
            node.addOutlet('spec/any', 'foo', null, { label: 'Bar' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-outlet',
                                           inlet: jasmine.objectContaining({ label: 'Bar' }) }));

        });
    });

    it('allows to set up or override channel `show` property', function() {
    });

    it('allows to set up or override channel `tune` function', function() {

    });

    it('connects only to the inlet of the same type', function() {
        Rpd.channeltype('spec/foo', {});
        Rpd.channeltype('spec/bar', {});

        withNewPatch(function(patch, updateSpy) {

            var firstNode = patch.addNode('spec/empty');
            var secondNode = patch.addNode('spec/empty');

            var fooOutlet = firstNode.addOutlet('spec/foo', 'foo');
            var barOutlet = firstNode.addOutlet('spec/bar', 'bar');
            var fooInlet  = secondNode.addInlet('spec/foo', 'foo');
            var barInlet  = secondNode.addInlet('spec/bar', 'bar');

            expect(function() { fooOutlet.connect(barInlet); }).toThrow();
            expect(function() { barOutlet.connect(fooInlet); }).toThrow();
            expect(function() { fooOutlet.connect(fooInlet); }).not.toThrow();
            expect(function() { barOutlet.connect(barInlet); }).not.toThrow();

        });
    });

});
