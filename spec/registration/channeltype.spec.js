describe('registration: channel type', function() {

    it('could be registered with an empty object', function() {
        expect(function() {
            Rpd.channeltype('spec/foo', {});
        }).not.toThrow();
    });

    it('one could define an alias for it');

    it('one could define a name for it');

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

            }).not.toThrow();
        });
    });

    it('could be a function which is called for every new channel and returns type description');

    it('could have default value which is used when channel of this type was created', function() {
        Rpd.channeltype('spec/foo', { default: 5 });

        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/foo', 'foo');
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update',
                    inlet: inlet,
                    value: 5
                })
            );
        });
    });

    it('could have default value being a stream', function(done) {
        var values = [ 'a', 7, { 'foo': 'bar' } ];
        var period = 30;

        Rpd.channeltype('spec/foo', { default: Kefir.sequentially(period, values) });

        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/foo', 'foo');

            setTimeout(function() {
                for (var i = 0; i < values.length; i++) {
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   inlet: inlet,
                                                   value: values[i] }));
                }
                done();
            }, period * (values.length + 1));

        });
    });

    it('allows overriding its default value in a node type description', function() {
        Rpd.channeltype('spec/foo', { default: 5 });

        withNewPatch(function(patch, updateSpy) {
            Rpd.nodetype('spec/test', {
                inlets:  { 'in': { type: 'spec/foo', default: 17 } }
            });

            var node = patch.addNode('spec/test');
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update', value: 5
                })
            );
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update', value: 17
                })
            );
        });
    });

    it('could be read-only and declines all the incoming values');

    it('being a read-only and having the default value, allows the latter to pass');

    it('allows overriding its read-only state in a node type description');

    it('may specify adapting function, which adapts all values going through, streamed or not', function(done) {
        Rpd.channeltype('spec/foo', { default: 2,
                                      adapt: function(val) { return val * 3 } });

        var values = [ 3, 14, 15, 92 ];
        var period = 30;

        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/foo', 'foo');
            inlet.stream(Kefir.sequentially(period, values));
            inlet.receive(21);

            setTimeout(function() {
                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'inlet/update',
                                               value: 2 * 3 }));
                for (var i = 0; i < values.length; i++) {
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   value: values[i] * 3 }));
                }
                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'inlet/update',
                                               value: 21 * 3 }));
                done();
            }, period * (values.length + 1));
        });
    });

    it('may specify accepting function, which declines specific values, streamed or not', function(done) {
        Rpd.channeltype('spec/foo', { default: 2,
                                      accept: function(val) { return (val % 2) == 0; } });

        var values = [ 3, 14, 15, 92 ];
        var period = 30;

        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/foo', 'foo');
            inlet.stream(Kefir.sequentially(period, values));
            inlet.receive(21);

            setTimeout(function() {
                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'inlet/update',
                                               value: 2 }));
                for (var i = 0; i < values.length; i++) {
                    var expectation = (values[i] % 2) == 0 ? expect(updateSpy)
                                                           : expect(updateSpy).not;
                    expectation.toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   value: values[i] }));
                }
                expect(updateSpy).not.toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'inlet/update',
                                               value: 21 }));
                done();
            }, period * (values.length + 1));
        });
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
                jasmine.anything(),
                jasmine.objectContaining({ type: 'inlet/update',
                                           value: 42 }));
        });
    });

    it('may specify tune function, which configures value stream', function() {
        Rpd.channeltype('spec/foo', { default: 'foo',
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
                jasmine.anything(),
                jasmine.objectContaining({ type: 'inlet/update',
                                            value: 'foofluxflow' }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'inlet/update',
                                            value: 'foofluxflowfuryfever' }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'inlet/update',
                                           value: 'zoo' }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'inlet/update',
                                           value: 'fury' }));
        });

    });

    it('may specify show function which returns string representation of a value');

});
