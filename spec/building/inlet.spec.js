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

    it('may receive sequences of values from a stream', function() {
        jasmine.clock().install();

        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var userSequence = [ 2, 'foo', { 'foo': 'bar' } ];
            var period = 30;

            var inlet = node.addInlet('spec/any', 'foo');
            inlet.stream(Kefir.sequentially(period, userSequence));

            jasmine.clock().tick(period * (userSequence.length + 1));

            for (var i = 0; i < userSequence.length; i++) {
                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'inlet/update',
                                               inlet: inlet,
                                               value: userSequence[i] }));
            }

        });

        jasmine.clock().uninstall();
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

    it('stops receiving streamed values when it was removed from a node', function() {
        jasmine.clock().install();

        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var sequence = [ 1, 2, 3 ];
            var period = 30;

            var inlet = node.addInlet('spec/any', 'foo');
            node.removeInlet(inlet);

            inlet.stream(Kefir.sequentially(period, sequence));

            jasmine.clock().tick(period * (sequence.length + 1));

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update' }));

        });

        jasmine.clock().uninstall();
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
            }).toReportError('inlet/error');
        });
    });

    it('sets the label, if it was specified (in contrast to alias)', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            function inletWithLabel(value) {
                return inletWithDefinition({ label: value });
            }

            node.addInlet('spec/any', 'foo', 'Foo');
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: inletWithLabel('Foo') }));

            updateSpy.calls.reset();
            node.addInlet('spec/any', 'foo', { label: 'Foo' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: inletWithLabel('Foo') }));

            updateSpy.calls.reset();
            node.addInlet('spec/any', 'foo', 'Foo', { label: 'Bar' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: inletWithLabel('Foo') }));

            updateSpy.calls.reset();
            node.addInlet('spec/any', 'foo', null, { label: 'Bar' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: inletWithLabel('Bar') }));

        });
    });

    it('sets the hidden and readonly flags, if they were specified', function() { // should also be checked for
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            node.addInlet('spec/any', 'foo');

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: inletWithDefinition(
                                               jasmine.objectContaining({ hidden: true })
                                           ) }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: inletWithDefinition(
                                               jasmine.objectContaining({ readonly: true })
                                           ) }));

            updateSpy.calls.reset();

            node.addInlet('spec/any', 'foo', {
                readonly: true,
                hidden: true
            });

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: inletWithDefinition(
                                               jasmine.objectContaining({ hidden: true, readonly: true })
                                           ) }));

        });
    });

    it('makes it hot by default and it could separately be set to be cold', function() {
        withNewPatch(function(patch, updateSpy) {

            var processSpy = jasmine.createSpy('process');

            var node = patch.addNode('spec/empty', { process: processSpy });

            var hotInlet = node.addInlet('spec/any', 'hot');

            hotInlet.receive(2);

            expect(processSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ hot: 2 }), jasmine.any(Object));

            var coldInlet = node.addInlet('spec/any', 'cold', {
                cold: true
            });

            processSpy.calls.reset();

            coldInlet.receive(4);

            expect(processSpy).not.toHaveBeenCalledWith(jasmine.objectContaining({ cold: 4 }), jasmine.any(Object));
            expect(processSpy).not.toHaveBeenCalled();

            processSpy.calls.reset();

            hotInlet.receive(8);

            expect(processSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ hot: 8, cold: 4 }), jasmine.any(Object));

        });
    });

    describe('overriding channel type definition', function() {

        it('overriding inlet allow function', function() {

            withNewPatch(function(patch, updateSpy) {
                var node = patch.addNode('spec/empty');

                var inlet = node.addInlet('spec/any', {
                    allow: function(value) {
                        return value == 'foo';
                    }
                });

                inlet.receive('bar');

                expect(updateSpy).not.toHaveBeenCalledWith({
                    type: 'inlet/update', inlet: inlet
                });

                inlet.receive('foo');

                expect(updateSpy).toHaveBeenCalledWith({
                    type: 'inlet/update', inlet: inlet, value: 'foo'
                });
            });

        });

        it('allows to set/override default value for an instance', function() {
            Rpd.channeltype('spec/foo', { default: 42 });
            Rpd.channeltype('spec/bar', {});

            withNewPatch(function(patch, updateSpy) {
                var node = patch.addNode('spec/empty');
                var inletAny = node.addInlet('spec/any', 'a', { default: 12 });

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'inlet/update',
                                               inlet: inletAny,
                                               value: 12 }));

                updateSpy.calls.reset();

                var inletFoo = node.addInlet('spec/foo', 'b', { default: 12 });

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'inlet/update',
                                               inlet: inletFoo,
                                               value: 12 }));
                expect(updateSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'inlet/update',
                                               outlet: inletFoo,
                                               value: 42 }));

                updateSpy.calls.reset();

                var inletBar = node.addInlet('spec/bar', 'c', { default: 12 });

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'inlet/update',
                                               inlet: inletBar,
                                               value: 12 }));
            });
        });

        xit('overriding inlet accept function', function() {});

        xit('overriding inlet adapt function', function() {});

        xit('overriding inlet show function', function() {});

        xit('overriding inlet tune function', function() {});

        xit('subscribing to inlet events', function() {

            withNewPatch(function(patch, updateSpy) {

                var node = patch.addNode('spec/empty');


            });


        });

    });

    it('core/any inlet type exists', function() {

        withNewPatch(function(patch, updateSpy) {
            expect(function() {
                patch.addNode('core/basic').addInlet('core/any', 'foo');
            }).not.toReportAnyError();
        });

    });

    xdescribe('allowed connections', function() {

        it('inlets do not accept connection from other types of outlets by default', function() {
            Rpd.channeltype('docs/foo', {});
            Rpd.channeltype('docs/bar', {});

            withNewPatch(function(patch, updateSpy) {
                expect(function() {
                    var node = patch.addNode('core/basic')
                    fooOutlet = node.addOutlet('docs/foo', 'foo');

                    var node = patch.addNode('core/basic')
                    barInlet = node.addInlet('core/bar', 'bar');

                    fooOutlet.connect(barInlet);
                }).toReportError('outler/error');
            });

            withNewPatch(function(patch, updateSpy) {
                expect(function() {
                    var node = patch.addNode('core/basic')
                    barOutlet = node.addOutlet('docs/bar', 'bar');

                    var node = patch.addNode('core/basic')
                    fooInlet = node.addInlet('docs/foo', 'foo');

                    barOutlet.connect(fooInlet);
                }).toReportError('ffff');
            });
        });

        it('it is allowed to connect inlet and outlet of core/any types', function() {
            withNewPatch(function(patch, updateSpy) {
                expect(function() {
                    var node = patch.addNode('core/basic')
                    anyOutlet = node.addOutlet('core/any', 'any');

                    var node = patch.addNode('core/basic')
                    anyInlet = node.addInlet('core/any', 'any');

                    anyOutlet.connect(anyInlet);
                }).not.toReportAnyError();
            });
        });

        it('it is allowed to connect inlet and outlet of same types', function() {
            Rpd.channeltype('docs/foo', {});
            Rpd.channeltype('docs/bar', {});

            withNewPatch(function(patch, updateSpy) {
                expect(function() {
                    var node = patch.addNode('core/basic')
                    fooOutlet = node.addOutlet('docs/foo', 'foo');

                    var node = patch.addNode('core/basic')
                    fooInlet = node.addInlet('core/foo', 'foo');

                    fooOutlet.connect(fooInlet);
                }).not.toReportAnyError();
            });

            withNewPatch(function(patch, updateSpy) {
                expect(function() {
                    var node = patch.addNode('core/basic')
                    barOutlet = node.addOutlet('docs/bar', 'bar');

                    var node = patch.addNode('core/basic')
                    barInlet = node.addInlet('docs/bar', 'bar');

                    barOutlet.connect(barInlet);
                }).not.toReportAnyError();
            });
        });

        it('any inlet type allows connections from core/any type of outlet', function() {

            Rpd.channeltype('docs/foo', {});
            Rpd.channeltype('docs/bar', {});

            withNewPatch(function(patch, updateSpy) {
                expect(function() {
                    var node = patch.addNode('core/basic')
                    fooOutlet = node.addOutlet('docs/foo', 'foo');

                    var node = patch.addNode('core/basic')
                    anyInlet = node.addInlet('core/any', 'any');

                    fooOutlet.connect(anyInlet);
                }).not.toReportAnyError();
            });

            withNewPatch(function(patch, updateSpy) {
                expect(function() {
                    var node = patch.addNode('core/basic')
                    barOutlet = node.addOutlet('docs/foo', 'foo');

                    var node = patch.addNode('core/basic')
                    anyInlet = node.addInlet('core/any', 'foo');

                    barOutlet.connect(anyInlet);
                }).not.toReportAnyError();
            });

        });

    });

    xit('allows to substitute/extend renderer', function() {
        // i#311
    });

    function inletWithDefinition(defSample) {
        return jasmine.objectContaining({ def: defSample });
    }

});
