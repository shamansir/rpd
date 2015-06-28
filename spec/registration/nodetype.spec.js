describe('registration: node type', function() {

    it('could be registered with an empty object', function() {
        expect(function() {
            Rpd.nodetype('spec/foo', {});
        }).not.toThrow();
    });

    it('one could define name for it');

    it('redefining the type re-writes previous type');

    it('passes the specified name to every created instance');

    it('creates specified inlets for the node instance', function() {
        Rpd.nodetype('spec/foo', {
            inlets: {
                'a': { type: 'spec/any' },
                'b': { type: 'spec/any' }
            }
        });

        withNewModel(function(model, updateSpy) {

            var node = model.addNode('spec/foo');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining(
                    { type: 'inlet/add',
                      inlet: jasmine.objectContaining({
                          name: 'a',
                          type: 'spec/any'
                      }) })
            );

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining(
                    { type: 'inlet/add',
                      inlet: jasmine.objectContaining({
                          name: 'b',
                          type: 'spec/any'
                      }) })
            );

        });
    });

    it('creates specified outlets for the node instance', function() {

        Rpd.nodetype('spec/foo', {
            outlets: {
                'a': { type: 'spec/any' },
                'b': { type: 'spec/any' }
            }
        });

        withNewModel(function(model, updateSpy) {

            var node = model.addNode('spec/foo');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining(
                    { type: 'outlet/add',
                      outlet: jasmine.objectContaining({
                          name: 'a',
                          type: 'spec/any'
                      }) })
            );

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining(
                    { type: 'outlet/add',
                      outlet: jasmine.objectContaining({
                          name: 'b',
                          type: 'spec/any'
                      }) })
            );

        });
    });

    it('informs it is ready when all inlets and outlets are ready', function() {

        Rpd.nodetype('spec/foo', {
            inlets:  { 'a': { type: 'spec/any' },
                       'b': { type: 'spec/any' } },
            outlets: { 'c': { type: 'spec/any' },
                       'd': { type: 'spec/any' } }
        });

        withNewModel(function(model, updateSpy) {

            var node = model.addNode('spec/foo');

            expect(updateSpy).toHaveBeenOrderlyCalledWith([
                [ jasmine.anything(), jasmine.objectContaining({ type: 'inlet/add' }) ],
                [ jasmine.anything(), jasmine.objectContaining({ type: 'outlet/add' }) ],
                [ jasmine.anything(), jasmine.objectContaining({ type: 'node/ready' }) ]
            ]);

        });
    });

    it('informs it is ready only once', function() {

        Rpd.nodetype('spec/foo', {
            inlets:  { 'a': { type: 'spec/any' } },
            outlets: { 'b': { type: 'spec/any' } }
        });

        withNewModel(function(model, updateSpy) {

            var node = model.addNode('spec/foo');

            updateSpy.calls.reset();

            node.addInlet('spec/any', 'foo');

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'node/ready' }));

        });
    });

    it('could be a function which is called for every new node and returns type description');

    it('informs inlet was updated when its default value was set');

    it('informs outlet was updated when its default value was set');

    it('accepts streams as default values for inlets');

    it('accepts streams as default values for outlets');

    it('still informs about update when inlet is hidden');

    it('still informs about update when inlet is cold');

    describe('processing function', function() {

        var processSpy;

        beforeEach(function() { processSpy = jasmine.createSpy('process'); });

        it('gets node instance as context of a call', function() {

            Rpd.nodetype('spec/foo', {
                inlets:  { 'a': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {
                var node = model.addNode('spec/foo');
                processSpy.and.callFake(function() {
                    expect(this).toBe(node);
                });
                node.inlets['a'].receive(2);
                expect(processSpy).toHaveBeenCalled();
            });

        })

        it('is not called when inlets have no default values', function() {

            Rpd.nodetype('spec/foo', {
                inlets:  { 'a': { type: 'spec/any' },
                           'b': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {
                var node = model.addNode('spec/foo');
                expect(processSpy).not.toHaveBeenCalled();
            });

        });

        it('is still not called when inlets have no default values and there is an outlet', function() {

            Rpd.nodetype('spec/foo', {
                inlets:  { 'a': { type: 'spec/any' },
                           'b': { type: 'spec/any' } },
                outlets: { 'c': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {
                var node = model.addNode('spec/foo');
                expect(processSpy).not.toHaveBeenCalled();
            });

        });

        it('is called once when single inlet has some default value', function() {

            Rpd.nodetype('spec/foo', {
                inlets:  { 'a': { type: 'spec/any', default: 10 },
                           'b': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {
                var node = model.addNode('spec/foo');
                expect(processSpy).toHaveBeenCalledWith({ 'a': 10 }, jasmine.anything());
                expect(processSpy).toHaveBeenCalledOnce();
            });

        });

        it('is called for every inlet which have a default value', function() {

            Rpd.nodetype('spec/foo', {
                inlets: { 'a': { type: 'spec/any', default: 10 },
                          'b': { type: 'spec/any', default: 5  } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {

                var ensureExecuted = handleNextCalls(processSpy, [
                    function() { expect(processSpy).toHaveBeenCalledWith({ 'a': 10 }, jasmine.anything()); },
                    function() { expect(processSpy).toHaveBeenCalledWith({ 'a': 10, 'b': 5 }, jasmine.anything()); }
                ]);

                var node = model.addNode('spec/foo');

                ensureExecuted();

            });

        });

        it('is not affected with number of outlets', function() {

            Rpd.nodetype('spec/foo', {
                inlets: { 'a': { type: 'spec/any', default: 10 },
                          'b': { type: 'spec/any', default: 5  } },
                outlets: { 'c': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {
                var node = model.addNode('spec/foo');
                expect(processSpy).toHaveBeenCalledTwice();
            });

        });

        it('gets values from inlets even when there\'s no outlets', function() {

            Rpd.nodetype('spec/foo', {
                inlets:  { 'a': { type: 'spec/any' },
                           'b': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {

                var node = model.addNode('spec/foo');

                node.inlets['a'].receive(2);
                expect(processSpy).toHaveBeenCalledWith({ a: 2 }, jasmine.anything());
                node.inlets['b'].receive('abc');
                expect(processSpy).toHaveBeenCalledWith({ a: 2, b: 'abc' }, jasmine.anything());

            });

        });

        it('sets outlets to their default values', function() {

            Rpd.nodetype('spec/foo', {
                inlets: { 'a': { type: 'spec/any' },
                          'b': { type: 'spec/any' } },
                outlets: { 'c': { type: 'spec/any', default: 17 } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {
                var node = model.addNode('spec/foo');
                var outlet = node.outlets['c'];
                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({
                        type: 'outlet/update',
                        outlet: outlet,
                        value: 17
                    })
                );
                expect(processSpy).not.toHaveBeenCalled();
            });

        });

        it('called only when node is ready', function() {
            var nodeReady = false;

            Rpd.nodetype('spec/foo', {
                inlets: { 'a': { type: 'spec/any', default: 5 },
                          'b': { type: 'spec/any', default: [ 2, 1 ] },
                          'c': { type: 'spec/any', default: {} },
                          'd': { type: 'spec/any', default: '' } },
                outlets: { 'e': { type: 'spec/any', default: 17 },
                           'f': { type: 'spec/any', default: [] } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {
                updateSpy.and.callFake(function(trg, update) {
                    if (update.type === 'node/ready') {
                        expect(processSpy).not.toHaveBeenCalled();
                        nodeReady = true;
                    } else if (!nodeReady) {
                        expect(processSpy).not.toHaveBeenCalled();
                    }
                }.bind(this));

                var node = model.addNode('spec/foo');

                expect(updateSpy).toHaveBeenCalled();
                expect(processSpy).toHaveBeenCalled();
            });
        });

        it('when inlet is set to transfer some stream by default, gets values from this stream one by one', function(done) {
            var values = [ 'a', 'b', 'c' ];
            var period = 30;

            Rpd.nodetype('spec/foo', {
                inlets: { 'char': { type: 'spec/any', default: Kefir.sequentially(period, values) } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {

                var ensureExecuted = handleNextCalls(processSpy, [
                    function() { expect(processSpy).toHaveBeenCalledWith({ char: values[0] }, jasmine.anything()); },
                    function() { expect(processSpy).toHaveBeenCalledWith({ char: values[1] }, jasmine.anything()); },
                    function() { expect(processSpy).toHaveBeenCalledWith({ char: values[2] }, jasmine.anything()); }
                ]);

                var node = model.addNode('spec/foo');

                setTimeout(function() {
                    ensureExecuted();
                    done();
                }, period * (values.length + 1));

            });
        });

        it('when stream was sent to the inlet, still gets values one by one', function(done) {
            var values = [ 'a', 'b', 'c' ];
            var period = 30;

            Rpd.nodetype('spec/foo', {
                inlets: { 'char': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {

                var node = model.addNode('spec/foo');

                var ensureExecuted = handleNextCalls(processSpy, [
                    function() { expect(processSpy).toHaveBeenCalledWith({ char: values[0] }, jasmine.anything()); },
                    function() { expect(processSpy).toHaveBeenCalledWith({ char: values[1] }, jasmine.anything()); },
                    function() { expect(processSpy).toHaveBeenCalledWith({ char: values[2] }, jasmine.anything()); }
                ]);

                node.inlets['char'].stream(Kefir.sequentially(period, values));

                setTimeout(function() {
                    ensureExecuted();
                    done();
                }, period * (values.length + 1));

            });
        });

        it('passes previous values with a call', function() {
            Rpd.nodetype('spec/foo', {
                inlets: { 'char': { type: 'spec/any', default: 'a' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {
                var node = model.addNode('spec/foo');
                node.inlets['char'].receive('b');
                expect(processSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ char: 'b' }),
                    jasmine.objectContaining({ char: 'a' })
                );
                node.inlets['char'].receive('c');
                expect(processSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ char: 'c' }),
                    jasmine.objectContaining({ char: 'b' })
                );
            });
        });

        it('still gets values from hidden inlets', function() {
            Rpd.nodetype('spec/foo', {
                inlets: { 'char': { type: 'spec/any',
                                    hidden: true,
                                    default: 'a' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {
                var node = model.addNode('spec/foo');
                expect(processSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ char: 'a' }),
                    jasmine.anything()
                );
                node.inlets['char'].receive('b');
                expect(processSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ char: 'b' }),
                    jasmine.anything()
                );
            });
        });

        it('does not react if updated inlet was cold, but keeps its value for next update', function() {
            Rpd.nodetype('spec/foo', {
                inlets: { 'foo': { type: 'spec/any',
                                   cold: true,
                                   default: 'a' },
                          'bar': { type: 'spec/any', cold: true },
                          'buz': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {
                var node = model.addNode('spec/foo');
                expect(processSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ foo: 'a' }),
                    jasmine.anything()
                );
                node.inlets['foo'].receive('b');
                expect(processSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ foo: 'b' }),
                    jasmine.anything()
                );
                node.inlets['bar'].receive(12);
                expect(processSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ bar: 12 }),
                    jasmine.anything()
                );
                node.inlets['buz'].receive('jazz');
                expect(processSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ bar: 12, foo: 'b', buz: 'jazz' }),
                    jasmine.objectContaining({ foo: 'a' })
                );
            });
        });

        it('does not react if updated inlet was cold and contained a stream, but keeps its value for next update');

        it('passes values to corresponding outlets based on default inlets values', function() {

            processSpy.and.callFake(function(inlets) {
                return { 'c': (inlets.a || 0) * (inlets.b || 1) };
            });

            Rpd.nodetype('spec/foo', {
                inlets:  { 'a': { type: 'spec/any', default: 7 },
                           'b': { type: 'spec/any', default: 2 } },
                outlets: { 'c': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {

                var node = model.addNode('spec/foo');

                var outlet = node.outlets['c'];

                expect(processSpy).toHaveBeenCalled();

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({
                        type: 'outlet/update',
                        outlet: outlet,
                        value: 7 * 1
                    })
                );

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({
                        type: 'outlet/update',
                        outlet: outlet,
                        value: 2 * 7
                    })
                );

            });

        });

        it('passes single values to corresponding outlets, even in sequences', function() {

            processSpy.and.callFake(function(inlets) {
                return { 'c': inlets.a * (inlets.b || 1),
                         'd': (inlets.b || 0) * 3 };
            });

            Rpd.nodetype('spec/foo', {
                inlets:  { 'a': { type: 'spec/any' },
                           'b': { type: 'spec/any' } },
                outlets: { 'c': { type: 'spec/any' },
                           'd': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {

                var node = model.addNode('spec/foo');

                node.inlets['a'].receive(7);
                node.inlets['b'].receive(2);
                node.inlets['b'].receive(6);

                var outletC = node.outlets['c'];
                var outletD = node.outlets['d'];

                expect(processSpy).toHaveBeenCalled();

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({
                        type: 'outlet/update',
                        outlet: outletC,
                        value: 7 * 1
                    })
                );

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({
                        type: 'outlet/update',
                        outlet: outletC,
                        value: 7 * 2
                    })
                );

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({
                        type: 'outlet/update',
                        outlet: outletC,
                        value: 7 * 6
                    })
                );

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({
                        type: 'outlet/update',
                        outlet: outletD,
                        value: 0 * 3
                    })
                );

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({
                        type: 'outlet/update',
                        outlet: outletD,
                        value: 2 * 3
                    })
                );

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({
                        type: 'outlet/update',
                        outlet: outletD,
                        value: 6 * 3
                    })
                );

            });

        });

        it('passes streamed values to corresponding outlets', function(done) {

            var values = [ 3, 14, 15, 92 ];
            var period = 30;

            processSpy.and.callFake(function(inlets) {
                return { 'out': Kefir.sequentially(period, values)
                                     .map(function(value) {
                                         return (inlets.in * value);
                                     }) };
            });

            Rpd.nodetype('spec/foo', {
                inlets:  { 'in': { type: 'spec/any' } },
                outlets: { 'out': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {

                var node = model.addNode('spec/foo');

                node.inlets['in'].receive(7);

                var outlet = node.outlets['out'];

                expect(processSpy).toHaveBeenCalled();

                setTimeout(function() {
                    for (var i = 0; i < values.length; i++) {
                        expect(updateSpy).toHaveBeenCalledWith(
                            jasmine.anything(),
                            jasmine.objectContaining({ type: 'outlet/update',
                                                       outlet: outlet,
                                                       value: values[i] * 7 }));
                    }
                    done();
                }, period * (values.length + 1));

            });

        });

        it('passes outlet values to process event', function() {
            processSpy.and.callFake(function(inlets) {
                return { 'c': inlets.a * inlets.b,
                         'd': inlets.b - inlets.a };
            });

            Rpd.nodetype('spec/foo', {
                inlets:  { 'a': { type: 'spec/any' },
                           'b': { type: 'spec/any' } },
                outlets: { 'c': { type: 'spec/any' },
                           'd': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {

                var node = model.addNode('spec/foo');

                node.inlets['a'].receive(7);
                node.inlets['b'].receive(2);

                var outletC = node.outlets['c'];
                var outletD = node.outlets['d'];

                expect(processSpy).toHaveBeenCalled();

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({
                        type: 'node/process',
                        inlets: { a: 7, b : 2 },
                        outlets: { c: 7 * 2, d: 2 - 7 }
                    })
                );

            });
        });

        it('updates the outlet value even when processing function was executed before this outlet was created');

        it('switches off previous stream when new one was plugged to outlet');

        it('if no outlet was updated, does not fire the update for this outlet', function() {

            processSpy.and.callFake(function(inlets) {
                return {};
            });

            Rpd.nodetype('spec/foo', {
                inlets:  { 'a': { type: 'spec/any', default: 4 },
                           'b': { type: 'spec/any' } },
                outlets: { 'c': { type: 'spec/any' },
                           'd': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {

                var node = model.addNode('spec/foo');

                node.inlets['b'].receive(7);

                expect(updateSpy).not.toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'outlet/update' })
                );

            });

        });

        it('treats no return value as no update to any outlet', function() {
            processSpy.and.callFake(function(inlets) { });

            Rpd.nodetype('spec/foo', {
                inlets:  { 'a': { type: 'spec/any', default: 2 },
                           'b': { type: 'spec/any' } },
                outlets: { 'c': { type: 'spec/any' },
                           'd': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {

                var node = model.addNode('spec/foo');

                node.inlets['b'].receive(12);

                expect(updateSpy).not.toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'outlet/update' })
                );

                expect(processSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ a: 2 }),
                    jasmine.anything()
                );

                expect(processSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ b: 12 }),
                    jasmine.anything()
                );

            });
        });

        it('is not bound to the types of the values inlets or outlets receive');

        it('one could add inlets or outlets from the inside', function() {
            Rpd.nodetype('spec/foo', {
                inlets: { 'a': { type: 'spec/any', hidden: true } }, // force call to process function
                process: processSpy.and.callFake(function(inlets) {
                            if (!inlets.bar) this.addInlet('spec/any', 'bar');
                        })
            });

            withNewModel(function(model, updateSpy) {

                var node = model.addNode('spec/foo');
                node.inlets['a'].receive(2); // force call to process function

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({
                        type: 'inlet/add',
                        inlet: jasmine.objectContaining({ 'name': 'bar' })
                    })
                );

                expect(processSpy).toHaveBeenCalledOnce();

            });
        });

        it('incoming values stream could be tuned', function() {

            Rpd.nodetype('spec/foo', {
                inlets:  { 'a': { type: 'spec/any', default: -1 } },
                process: processSpy,
                tune: function(incoming) {
                    return incoming
                        .filter(function(update) {
                            return update.value !== 2;
                        })
                        .map(function(update) {
                            return { inlet: update.inlet,
                                     value: update.value * 10 };
                        });
                }
            });


            withNewModel(function(model, updateSpy) {

                var node = model.addNode('spec/foo');

                node.inlets['a'].receive(0);
                expect(processSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ a: 0 }),
                    jasmine.anything()
                );
                node.inlets['a'].receive(1);
                expect(processSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ a: 10 }),
                    jasmine.anything()
                );
                node.inlets['a'].receive(2);
                expect(processSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ a: 2 }),
                    jasmine.anything()
                );
                expect(processSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ a: 20 }),
                    jasmine.anything()
                );
                node.inlets['a'].receive(3);
                expect(processSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ a: 30 }),
                    jasmine.anything()
                );
            });

        });

        it('incoming values stream still could be tuned even when they\'re streamed');

    });

    it('updates could be handled with custom handle function', function() {
        var inletUpdateSpy = jasmine.createSpy('inlet-update');
        var outletConnectSpy = jasmine.createSpy('outlet-connect');

        Rpd.nodetype('spec/foo', {
            inlets:  { 'in': { type: 'spec/any' } },
            outlets: { 'out': { type: 'spec/any' } },
            handle: {
                'inlet/update': inletUpdateSpy,
                'outlet/connect': outletConnectSpy
            }
        });

        withNewModel(function(model, updateSpy) {

            var firstNode = model.addNode('spec/foo');
            var secondNode = model.addNode('spec/foo');

            var fromOutlet = firstNode.outlets['out'];
            var toInlet = secondNode.inlets['in'];

            toInlet.receive(12);

            expect(inletUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update',
                                           inlet: toInlet,
                                           value: 12 }));

            var link = fromOutlet.connect(toInlet, null, 'spec/pass');

            expect(outletConnectSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/connect',
                                           link: link }));

        });
    });

    it('default inlets and outlets could be prepared with custom prepare function', function() {
        var prepareSpy = jasmine.createSpy('prepare');

        Rpd.nodetype('spec/foo', {
            inlets:  { 'a': { type: 'spec/any' },
                       'b': { type: 'spec/any' } },
            outlets: { 'c': { type: 'spec/any' } },
            prepare: prepareSpy
        });

        withNewModel(function(model, updateSpy) {

            updateSpy.and.callFake(function(update) {
                if (update.type === 'node/ready') {
                    expect(prepareSpy).toHaveBeenCalled();
                }
            });

            var node = model.addNode('spec/foo');

            expect(prepareSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    a: node.inlets['a'],
                    b: node.inlets['b']
                }),
                jasmine.objectContaining({
                    c: node.outlets['c']
                })
            );
            expect(prepareSpy).toHaveBeenCalledOnce();

        });

    });

});
