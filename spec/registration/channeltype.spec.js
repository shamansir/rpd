describe('registration: channel type', function() {

    it('could be registered with an empty object', function() {
        expect(function() {
            Rpd.channeltype('spec/foo', {});
        }).not.toReportAnyError();
    });

    it('could be used both for inlets and outlets', function() {
        Rpd.channeltype('spec/foo', {});
        Rpd.channeltype('spec/bar', {});

        withNewPatch(function(patch, updateSpy) {
            expect(function() {

                Rpd.nodetype('spec/test', {
                    inlets:  { 'in': { type: 'spec/foo' } },
                    outlets: { 'out': { type: 'spec/foo' } }
                });

                var node = patch.addNode('spec/test');
                node.addInlet('spec/bar', 'bar');
                node.addOutlet('spec/bar', 'bar');

            }).not.toReportAnyError();
        });
    });

   it('fires the proper error when unregistered type was used in a node definition, for inlet', function() {
        withNewPatch(function(patch, updateSpy) {
            expect(function() {

                Rpd.nodetype('spec/test', {
                    inlets: { 'in': { type: 'aaazzz/123456' } }
                });

                patch.addNode('spec/test');

            }).toReportError('inlet/error');
        });
    });

    it('fires the proper error when unregistered type was used in a node definition, for outlet', function() {
        withNewPatch(function(patch, updateSpy) {
            expect(function() {

                Rpd.nodetype('spec/test', {
                    outlets: { 'out': { type: 'aaazzz/123456' } }
                });

                patch.addNode('spec/test');

            }).toReportError('outlet/error');
        });
    });

    it('could have default value which is used when channel of this type was created', function() {
        Rpd.channeltype('spec/foo', { 'default': 5 });

        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/foo', 'foo');
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'inlet/update',
                    inlet: inlet,
                    value: 5
                })
            );
        });
    });

    it('could have default value being a stream', function() {
        jasmine.clock().install();

        var values = [ 'a', 7, { 'foo': 'bar' } ];
        var period = 30;

        Rpd.channeltype('spec/foo', { 'default': Kefir.sequentially(period, values) });

        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/foo', 'foo');

            jasmine.clock().tick(period * (values.length + 1));

            for (var i = 0; i < values.length; i++) {
                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'inlet/update',
                                               inlet: inlet,
                                               value: values[i] }));
            }

        });

        jasmine.clock().uninstall();
    });

    it('allows overriding its default value in a node type description', function() {
        Rpd.channeltype('spec/foo', { 'default': 5 });

        withNewPatch(function(patch, updateSpy) {
            Rpd.nodetype('spec/test', {
                inlets:  { 'in': { type: 'spec/foo', 'default': 17 } }
            });

            var node = patch.addNode('spec/test');
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'inlet/update', value: 5
                })
            );
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'inlet/update', value: 17
                })
            );
        });
    });

    it('may specify list of allowed channel types which are permitted to connect to each other', function() {
        Rpd.channeltype('spec/foo', { allow: [ 'spec/bar', 'spec/buz' ] });
        Rpd.channeltype('spec/bar', { allow: [ 'spec/foo' ] });
        Rpd.channeltype('spec/buz', {});

        withNewPatch(function(patch, updateSpy) {

            var firstNode = patch.addNode('spec/empty');
            var secondNode = patch.addNode('spec/empty');

            var fooOutlet = firstNode.addOutlet('spec/foo', 'foo');
            var barOutlet = firstNode.addOutlet('spec/bar', 'bar');
            var buzOutlet = firstNode.addOutlet('spec/buz', 'buz');
            var fooInlet  = secondNode.addInlet('spec/foo', 'foo');
            var barInlet  = secondNode.addInlet('spec/bar', 'bar');
            var buzInlet  = secondNode.addInlet('spec/buz', 'buz');

            // outlets of type spec/foo are allowed to connect to inlets of type spec/foo
            expect(function() { fooOutlet.connect(fooInlet); }).not.toReportAnyError();
            // outlets of type spec/bar are allowed to connect to inlets of type spec/foo
            expect(function() { barOutlet.connect(fooInlet); }).not.toReportAnyError();
            // outlets of type spec/buz are allowed to connect to inlets of type spec/foo
            expect(function() { buzOutlet.connect(fooInlet); }).not.toReportAnyError();

            // outlets of type spec/foo are allowed to connect to inlets of type spec/bar
            expect(function() { fooOutlet.connect(barInlet); }).not.toReportAnyError();
            // outlets of type spec/bar are allowed to connect to inlets of type spec/bar
            expect(function() { barOutlet.connect(barInlet); }).not.toReportAnyError();
            // outlets of type spec/buz are NOT allowed to connect to inlets of type spec/bar
            expect(function() { buzOutlet.connect(barInlet); }).toReportError('outlet/error');

            // outlets of type spec/foo are NOT allowed to connect to inlets of type spec/buz
            expect(function() { fooOutlet.connect(buzInlet); }).toReportError('outlet/error');
            // outlets of type spec/bar are NOT allowed to connect to inlets of type spec/buz
            expect(function() { barOutlet.connect(buzInlet); }).toReportError('outlet/error');
            // outlets of type spec/buz are allowed to connect to inlets of type spec/buz
            expect(function() { buzOutlet.connect(buzInlet); }).not.toReportAnyError();

        });
    });

    it('may specify adapting function, which adapts all values going through, streamed or not', function() {
        jasmine.clock().install();

        Rpd.channeltype('spec/foo', { 'default': 2,
                                      adapt: function(val) { return val * 3 } });

        var values = [ 3, 14, 15, 92 ];
        var period = 30;

        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/foo', 'foo');
            inlet.stream(Kefir.sequentially(period, values));
            inlet.receive(21);

            jasmine.clock().tick(period * (values.length + 1));

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           value: 2 * 3 }));
            for (var i = 0; i < values.length; i++) {
                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'inlet/update',
                                               value: values[i] * 3 }));
            }
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           value: 21 * 3 }));
        });

        jasmine.clock().uninstall();
    });

    it('may specify accepting function, which declines specific values, streamed or not', function() {
        jasmine.clock().install();

        Rpd.channeltype('spec/foo', { 'default': 2,
                                      accept: function(val) { return (val % 2) == 0; } });

        var values = [ 3, 14, 15, 92 ];
        var period = 30;

        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/foo', 'foo');
            inlet.stream(Kefir.sequentially(period, values));
            inlet.receive(21);

            jasmine.clock().tick(period * (values.length + 1));

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           value: 2 }));

            for (var i = 0; i < values.length; i++) {
                var expectation = (values[i] % 2) == 0 ? expect(updateSpy)
                                                       : expect(updateSpy).not;
                expectation.toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'inlet/update',
                                               value: values[i] }));
            }

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           value: 21 }));

        });

        jasmine.clock().uninstall();
    });

    it('uses accepting hanlder before the adapting one', function() {
        var adaptSpy = jasmine.createSpy('adapt'),
            acceptSpy = jasmine.createSpy('accept');

        Rpd.channeltype('spec/foo', { accept: acceptSpy.and.callFake(function(val) { return (val % 2) !== 0; }),
                                      adapt: adaptSpy.and.callFake(function(val) { return val * 2 }) });

        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/foo', 'foo');
            inlet.receive(21);
            expect(acceptSpy).toHaveBeenCalledWith(21);
            expect(adaptSpy).toHaveBeenCalledWith(21);
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           value: 42 }));
        });
    });

    xit('checks channel type before calling the accepting or adapting handler', function() {
        var acceptFooSpy = jasmine.createSpy('accept-foo'),
            acceptBarSpy = jasmine.createSpy('accept-bar'),
            adaptFooSpy = jasmine.createSpy('adapt-foo'),
            adaptBarSpy = jasmine.createSpy('adapt-bar');

        Rpd.channeltype('spec/foo', { allow: [ 'spec/bar' ],
                                      accept: acceptFooSpy.and.callFake(function() { return true; }),
                                      adapt: adaptFooSpy.and.callFake(function(v) { return v; }) });
        Rpd.channeltype('spec/bar', { allow: [ 'spec/foo' ],
                                      accept: acceptBarSpy.and.callFake(function() { return true; }),
                                      adapt: adaptBarSpy.and.callFake(function(v) { return v; }) });
        Rpd.channeltype('spec/buz', {});

        withNewPatch(function(patch, updateSpy) {

            var firstNode = patch.addNode('spec/empty');
            var secondNode = patch.addNode('spec/empty');

            var fooOutlet = firstNode.addOutlet('spec/foo', 'foo');
            var barInlet  = secondNode.addInlet('spec/bar', 'bar');
            var buzInlet  = secondNode.addInlet('spec/buz', 'buz');

            expect(function() { fooOutlet.connect(barInlet); }).not.toReportAnyError();
            expect(acceptFooSpy).toHaveBeenCalled();
            expect(acceptBarSpy).toHaveBeenCalled();
            expect(adaptFooSpy).toHaveBeenCalled();
            expect(adaptBarSpy).toHaveBeenCalled();

            acceptFooSpy.calls.reset();
            acceptBarSpy.calls.reset();
            adaptFooSpy.calls.reset();
            adaptBarSpy.calls.reset();

            expect(function() { fooOutlet.connect(buzInlet); }).toReportError('outlet/error');
            expect(acceptFooSpy).not.toHaveBeenCalled();
            expect(acceptBarSpy).not.toHaveBeenCalled();
            expect(adaptFooSpy).not.toHaveBeenCalled();
            expect(adaptBarSpy).not.toHaveBeenCalled();

        });
    });

    it('checks the allowed list before calling the accepting or adapting handler', function() {
        var acceptFooSpy = jasmine.createSpy('accept-foo'),
            acceptBarSpy = jasmine.createSpy('accept-bar'),
            adaptFooSpy = jasmine.createSpy('adapt-foo'),
            adaptBarSpy = jasmine.createSpy('adapt-bar');

        Rpd.channeltype('spec/foo', { accept: acceptFooSpy.and.callFake(function() { return true; }) });
        Rpd.channeltype('spec/bar', { accept: acceptBarSpy.and.callFake(function() { return true; }) });

        withNewPatch(function(patch, updateSpy) {

            var firstNode = patch.addNode('spec/empty');
            var secondNode = patch.addNode('spec/empty');

            var fooOutlet = firstNode.addOutlet('spec/foo', 'foo');
            var barInlet  = secondNode.addInlet('spec/bar', 'bar');

            expect(function() { fooOutlet.connect(barInlet); }).toReportError('outlet/error');

            expect(acceptFooSpy).not.toHaveBeenCalled();
            expect(acceptBarSpy).not.toHaveBeenCalled();
        });
    });

    xit('executes checks in order: allow, accept, adapt[, tune]', function() { });

    it('may specify tune function, which configures value stream', function() {
        Rpd.channeltype('spec/foo', { 'default': 'foo',
                                      tune: function(incoming) {
                                                return incoming.filter(function(val) {
                                                    return (val[0] === 'f');
                                                }).scan(function(prev, current) {
                                                    return prev + current;
                                                });
                                            }
                                    });

        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/foo', 'foo');
            inlet.receive('flux');
            inlet.receive('zoo');
            inlet.receive('flow');
            inlet.receive('fury');
            inlet.receive('jazz');
            inlet.receive('fever');
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           value: 'foofluxflow' }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           value: 'foofluxflowfuryfever' }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           value: 'zoo' }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           value: 'fury' }));
        });

    });

    it('could be defined as a single function which is executed for every channel and gets channel instance', function() {
        var definitionGenSpy = jasmine.createSpy('definition-generator')
                                .and.callFake(function(channel) {
            return { 'default': 12 };
        });

        Rpd.channeltype('spec/foo', definitionGenSpy);

        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            var inletA = node.addInlet('spec/foo', 'fooA');
            var inletB = node.addInlet('spec/foo', 'fooB');
            var outlet = node.addOutlet('spec/foo', 'fooC');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           value: 12 }));
            expect(updateSpy).not.toHaveBeenCalledWith( // outlets have no default value
                jasmine.objectContaining({ type: 'outlet/update',
                                           value: 12 }));

            expect(definitionGenSpy).toHaveBeenCalledTimes(3);
            expect(definitionGenSpy).toHaveBeenCalledWith(inletA);
            expect(definitionGenSpy).toHaveBeenCalledWith(inletB);
            expect(definitionGenSpy).toHaveBeenCalledWith(outlet);
        });
    });

    xit('allow, accept, adapt and tune are performed only for inlets', function() {

    });

});
