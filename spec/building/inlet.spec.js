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
            var inlet = node.addInlet('spec/any', 'foo', {
                'default': defaultValue
            });

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

    it('requires alias to be specified', function() {
        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            expect(function() {
                node.addInlet('spec/any');
            }).toThrow();
        });
    });

    it('sets label to alias, if it was not specified', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            node.addInlet('spec/any', 'foo');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: jasmine.objectContaining({ label: 'foo' }) }));
        });
    });

    it('sets the label, if it was specified (in contrast to alias)', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            node.addInlet('spec/any', 'foo', 'Foo');
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: jasmine.objectContaining({ label: 'Foo' }) }));

            updateSpy.calls.reset();
            node.addInlet('spec/any', 'foo', { label: 'Foo' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: jasmine.objectContaining({ label: 'Foo' }) }));

            updateSpy.calls.reset();
            node.addInlet('spec/any', 'foo', 'Foo', { label: 'Bar' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: jasmine.objectContaining({ label: 'Foo' }) }));

            updateSpy.calls.reset();
            node.addInlet('spec/any', 'foo', null, { label: 'Bar' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: jasmine.objectContaining({ label: 'Bar' }) }));

        });
    });

    it('sets the hidden and readonly flags, if they were specified', function() { // should also be checked for
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            node.addInlet('spec/any', 'foo');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: jasmine.objectContaining({ hidden: false, readonly: false }) }));

            updateSpy.calls.reset();

            node.addInlet('spec/any', 'foo', {
                readonly: true,
                hidden: true
            });

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: jasmine.objectContaining({ hidden: true, readonly: true }) }));

        });
    });

    it('sets the hidden and readonly flags, if they were specified', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            node.addInlet('spec/any', 'foo');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: jasmine.objectContaining({ hidden: false, readonly: false }) }));

            updateSpy.calls.reset();

            node.addInlet('spec/any', 'foo', {
                readonly: true,
                hidden: true
            });

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: jasmine.objectContaining({ hidden: true, readonly: true }) }));

        });
    });

    it('makes it hot by default and it could separately be set to be cold', function() {
        withNewPatch(function(patch, updateSpy) {

            var processSpy = jasmine.createSpy('process');

            var node = patch.addNode('spec/empty', { process: processSpy });

            var hotInlet = node.addInlet('spec/any', 'hot');

            hotInlet.receive(2);

            //expect(updateSpy).toHaveBeenCalledWith(
            //    jasmine.objectContaining({ type: 'node/add-inlet', inlet: hotInlet }));
            expect(processSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ hot: 2 }));

            var coldInlet = node.addInlet('spec/any', 'cold', {
                cold: true
            });

            processSpy.calls.reset();

            coldInlet.receive(4);

            //expect(updateSpy).toHaveBeenCalledWith(
            //    jasmine.objectContaining({ type: 'node/add-inlet', inlet: coldInlet }));
            expect(processSpy).not.toHaveBeenCalledWith(jasmine.objectContaining({ cold: 4 }));
            //expect(processSpy).not.toHaveBeenCalled();

        });
    });

    describe('allows to override channeltype properties', function() {

        it('allows to override allow property', function() {

        });

        it('allows to override accept property', function() {

        });

        it('allows to override adapt property', function() {

        });

        it('allows to override show property', function() {

        });

    });

    it('allows to subscribe to inlet events just from the description', function() {

        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');


        });

    });

});
