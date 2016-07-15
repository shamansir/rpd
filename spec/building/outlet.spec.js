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

    it('may send sequences of values from a stream', function() {
        jasmine.clock().install();

        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var userSequence = [ 2, 'foo', { 'foo': 'bar' } ];
            var period = 30;

            var outlet = node.addOutlet('spec/any', 'foo');
            outlet.stream(Kefir.sequentially(period, userSequence));

            jasmine.clock().tick(period * (userSequence.length + 1));

            for (var i = 0; i < userSequence.length; i++) {
                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'outlet/update',
                                               outlet: outlet,
                                               value: userSequence[i] }));
            }

        });

        jasmine.clock().uninstall();
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

    it('stops receiving streamed values when it was removed from a node', function() {
        jasmine.clock().install();

        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var sequence = [ 1, 2, 3 ];
            var period = 30;

            var outlet = node.addOutlet('spec/any', 'foo');
            node.removeOutlet(outlet);

            outlet.stream(Kefir.sequentially(period, sequence));

            jasmine.clock().tick(period * (sequence.length + 1));

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/update' }));


        });

        jasmine.clock().uninstall();
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
            }).toReportError('outlet/error');
        });
    });

    it('sets the label, if it was specified (in contrast to alias)', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            function outletWithLabel(value) {
                return jasmine.objectContaining({
                    def: jasmine.objectContaining({ label: value })
                });
            }

            node.addOutlet('spec/any', 'foo', 'Foo');
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-outlet',
                                           outlet: outletWithLabel('Foo') }));

            updateSpy.calls.reset();
            node.addOutlet('spec/any', 'foo', { label: 'Foo' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-outlet',
                                           outlet: outletWithLabel('Foo') }));

            updateSpy.calls.reset();
            node.addOutlet('spec/any', 'foo', 'Foo', { label: 'Bar' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-outlet',
                                           outlet: outletWithLabel('Foo') }));

            updateSpy.calls.reset();
            node.addOutlet('spec/any', 'foo', null, { label: 'Bar' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-outlet',
                                           outlet: outletWithLabel('Bar') }));

        });
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

            expect(function() { fooOutlet.connect(barInlet); }).toReportError('outlet/error');
            expect(function() { barOutlet.connect(fooInlet); }).toReportError('outlet/error');
            expect(function() { fooOutlet.connect(fooInlet); }).not.toReportAnyError();
            expect(function() { barOutlet.connect(barInlet); }).not.toReportAnyError();

        });
    });

    describe('overriding channel type definition', function() {

        it('there\'s no way to set/override default value for an instance', function() {
            Rpd.channeltype('spec/foo', { default: 42 });
            Rpd.channeltype('spec/bar', {});

            // compare with the same (but different) test in ./inlet.spec.js

            withNewPatch(function(patch, updateSpy) {
                var node = patch.addNode('spec/empty');
                var outletAny = node.addOutlet('spec/any', 'a', { default: 12 });

                expect(updateSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'outlet/update',
                                               outlet: outletAny,
                                               value: 12 }));

                updateSpy.calls.reset();

                var outletFoo = node.addOutlet('spec/foo', 'b', { default: 12 });

                expect(updateSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'outlet/update',
                                               outlet: outletFoo,
                                               value: 12 }));
                expect(updateSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'outlet/update',
                                               outlet: outletFoo,
                                               value: 42 }));

                updateSpy.calls.reset();

                var outletBar = node.addOutlet('spec/bar', 'c', { default: 12 });

                expect(updateSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'outlet/update',
                                               outlet: outletBar,
                                               value: 12 }));
            });
        });

        xit('overriding outlet tune function', function() {});

        xit('overriding outlet show function', function() {});

        xit('subscribing to outlet events', function() {});

    });

    xit('allows to substitute/extend renderer', function() {
        // i#311
    });

    it('core/any outlet type exists', function() {

        withNewPatch(function(patch, updateSpy) {
            expect(function() {
                patch.addNode('core/basic').addOutlet('core/any', 'foo');
            }).not.toReportAnyError();
        });

    });

    it('outlet of core/any type is not allowed to connect other types of inlets', function() {

        Rpd.channeltype('docs/foo', {});
        Rpd.channeltype('docs/bar', {});

        withNewPatch(function(patch, updateSpy) {
            expect(function() {
                var node = patch.addNode('core/basic')
                anyOutlet = node.addOutlet('core/any', 'any');

                var node = patch.addNode('core/basic')
                fooInlet = node.addInlet('docs/foo', 'foo');

                anyOutlet.connect(fooInlet);
            }).toReportError('outlet/error');
        });

        withNewPatch(function(patch, updateSpy) {
            expect(function() {
                var node = patch.addNode('core/basic')
                anyOutlet = node.addOutlet('core/any', 'any');

                var node = patch.addNode('core/basic')
                barInlet = node.addInlet('docs/bar', 'bar');

                anyOutlet.connect(barInlet);
            }).toReportError('outlet/error');
        });

    });

});
