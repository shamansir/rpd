prettify(Rpd); // inject pretty-print for Jasmine

Rpd.nodetype('spec/empty', {});
Rpd.channeltype('spec/any', {});
Rpd.linktype('spec/pass', {});

describe('registering', function() {

beforeEach(function() {
    jasmine.addMatchers({
        toHaveBeenOrderlyCalledWith: RpdMatchers.toHaveBeenOrderlyCalledWith,
        toHaveBeenCalledOnce: RpdMatchers.toHaveBeenCalledOnce,
        toHaveBeenCalledTwice: RpdMatchers.toHaveBeenCalledTwice,
        toHaveBeenCalledTimes: RpdMatchers.toHaveBeenCalledTimes
    });
});

// -----------------------------------------------------------------------------
// ===============================- renderer -==================================
// -----------------------------------------------------------------------------

describe('renderer', function() {
});

describe('subrenderer', function() {
});

// -----------------------------------------------------------------------------
// =================================- node -====================================
// -----------------------------------------------------------------------------

function withNewModel(fn) {
    var updateSpy = jasmine.createSpy('update');
    var renderer = Rpd.renderer('foo', function(user_conf) {
        return updateSpy;
    });

    var model = Rpd.Model.start().renderWith('foo').attachTo({});

    fn(model, updateSpy);
}

describe('node type', function() {

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

            var node = new Rpd.Node('spec/foo');

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

            var node = new Rpd.Node('spec/foo');

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

            var node = new Rpd.Node('spec/foo');

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

            var node = new Rpd.Node('spec/foo');

            updateSpy.calls.reset();

            node.addInlet('spec/any', 'foo');

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'node/ready' }));

        });
    });

    it('informs inlet was updated when its default value was set');

    it('informs outlet was updated when its default value was set');

    it('accepts streams as default values for inlets');

    it('accepts streams as default values for outlets');

    it('still informs about update when inlet is hidden');

    it('still informs about update when inlet is cold');

    describe('processing function', function() {

        var processSpy;

        beforeEach(function() { processSpy = jasmine.createSpy('process'); });

        it('is not called when inlets have no default values', function() {

            Rpd.nodetype('spec/foo', {
                inlets:  { 'a': { type: 'spec/any' },
                           'b': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {
                var node = new Rpd.Node('spec/foo');
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
                var node = new Rpd.Node('spec/foo');
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
                var node = new Rpd.Node('spec/foo');
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

                var node = new Rpd.Node('spec/foo');

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
                var node = new Rpd.Node('spec/foo');
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

                var node = new Rpd.Node('spec/foo');

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
                var node = new Rpd.Node('spec/foo');
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

                var node = new Rpd.Node('spec/foo');

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

                var node = new Rpd.Node('spec/foo');

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

                var node = new Rpd.Node('spec/foo');

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
                var node = new Rpd.Node('spec/foo');
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
                var node = new Rpd.Node('spec/foo');
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

        it('does not reacts if updated inlet was cold, but keeps its value for next update', function() {
            Rpd.nodetype('spec/foo', {
                inlets: { 'foo': { type: 'spec/any',
                                   cold: true,
                                   default: 'a' },
                          'bar': { type: 'spec/any', cold: true },
                          'buz': { type: 'spec/any' } },
                process: processSpy
            });

            withNewModel(function(model, updateSpy) {
                var node = new Rpd.Node('spec/foo');
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

        it('does not reacts if updated inlet was cold and contained a stream, but keeps its value for next update')

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

                var node = new Rpd.Node('spec/foo');

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

        it('passes single values to corresponding outlets', function() {

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

                var node = new Rpd.Node('spec/foo');

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

                var node = new Rpd.Node('spec/foo');

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

        it('updates the outlet value even when processing function was executed before this outlet was created');

        it('switches off previous stream when new one was plugged to outlet');

        it('if no outlet was updated, does not fires the update for this outlet', function() {

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

                var node = new Rpd.Node('spec/foo');

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

                var node = new Rpd.Node('spec/foo');

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

                var node = new Rpd.Node('spec/foo');

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

            var firstNode = new Rpd.Node('spec/foo');
            var secondNode = new Rpd.Node('spec/foo');

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

            var node = new Rpd.Node('spec/foo');

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

// -----------------------------------------------------------------------------
// ===============================- channel -===================================
// -----------------------------------------------------------------------------

describe('channel type', function() {

    it('could be registered with an empty object', function() {
        expect(function() {
            Rpd.channeltype('spec/foo', {});
        }).not.toThrow();
    });

    it('one could define alias for it');

    it('one could define name for it');

    it('could be used both for inlets and outlets', function() {
        Rpd.channeltype('spec/foo', {});
        Rpd.channeltype('spec/bar', {});

        withNewModel(function(model, updateSpy) {
            expect(function() {

                Rpd.nodetype('spec/test', {
                    inlets:  { 'in': { type: 'spec/foo' } },
                    outlets: { 'out': { type: 'spec/foo' } }
                });

                var node = new Rpd.Node('spec/test');
                node.addInlet('spec/bar', 'bar');
                node.addOutlet('spec/bar', 'bar');

            }).not.toThrow();
        });
    });

    it('could have default value which is used when channel of this type was created', function() {
        Rpd.channeltype('spec/foo', { default: 5 });

        withNewModel(function(model, updateSpy) {
            var node = new Rpd.Node('spec/empty');
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

        withNewModel(function(model, updateSpy) {

            var node = new Rpd.Node('spec/empty');
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

        withNewModel(function(model, updateSpy) {
            Rpd.nodetype('spec/test', {
                inlets:  { 'in': { type: 'spec/foo', default: 17 } }
            });

            var node = new Rpd.Node('spec/test');
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

        withNewModel(function(model, updateSpy) {
            var node = new Rpd.Node('spec/empty');
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

        withNewModel(function(model, updateSpy) {
            var node = new Rpd.Node('spec/empty');
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

        withNewModel(function(model, updateSpy) {
            var node = new Rpd.Node('spec/empty');
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

        withNewModel(function(model, updateSpy) {
            var node = new Rpd.Node('spec/empty');
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

// -----------------------------------------------------------------------------
// =================================- link -====================================
// -----------------------------------------------------------------------------

describe('link type', function() {

    it('could be registered with an empty object', function() {
        expect(function() {
            Rpd.linktype('spec/foo', {});
        }).not.toThrow();
    });

    it('one could define name for it');

    it('may specify adapting function, which adapts all values going through, streamed or not', function(done) {
        Rpd.linktype('spec/foo', { adapt: function(val) { return val * 3 } });

        var values = [ 3, 14, 15, 92 ];
        var period = 30;

        withNewModel(function(model, updateSpy) {
            var firstNode = new Rpd.Node('spec/empty'),
                secondNode = new Rpd.Node('spec/empty');
            var inlet = secondNode.addInlet('spec/any', 'foo'),
                outlet = firstNode.addOutlet('spec/any', 'foo');
            var link = outlet.connect(inlet, null, 'spec/foo');
            outlet.stream(Kefir.sequentially(period, values));
            outlet.send(21);

            setTimeout(function() {
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

    it('adapter specified at connection time overrides the adapter specified in type desctiption');

    it('both channel and link could have adapting function');

});

it('node, channel, and link types could have matching names but should use the corresponding definition');

// -----------------------------------------------------------------------------
// ============================- node renderer -================================
// -----------------------------------------------------------------------------

describe('node renderer', function() {

    it('could be defined as an empty object', function() {
        expect(function() {
            Rpd.noderenderer('spec/foo', 'spec', {});
        }).not.toThrow();
    });

    describe('transferring with the events', function() {

        var updateSpy;
        var model;

        beforeEach(function() {
            updateSpy = jasmine.createSpy('update');

            Rpd.renderer('spec', function() { return updateSpy; });
            Rpd.nodetype('spec/foo', {
                process: function() {}
            });

            model = Rpd.Model.start().renderWith('spec').attachTo({});
        });

        it('even if it\'s an empty object, passed with node adding and processing event', function() {

            var renderer = {};

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var node = new Rpd.Node('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: renderer
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/process',
                    render: renderer
                }));

        });

        xit('the normal update stream should not set this field to an update event', function() {

            var modelEventsSpy = jasmine.createSpy('model-events');
            model.events.onValue(modelEventsSpy);

            var node = new Rpd.Node('spec/foo');
            var nodeEventsSpy = jasmine.createSpy('node-events');
            node.events.onValue(nodeEventsSpy);

            var renderer = {};

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(modelEventsSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add', render: renderer }));
            expect(modelEventsSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/process', render: renderer }));

            expect(nodeEventsSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/process', render: renderer }));

        });

        it('one could define render-first function which is passed with node adding event', function() {

            var renderFirst = function() {};
            var renderer = { first: renderFirst };

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var node = new Rpd.Node('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: { first: renderFirst }
                }));

        });

        it('one could define render-always function which is passed both with node adding event and node processing events', function() {

            var renderAlways = function() {};
            var renderer = { always: renderAlways };

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var node = new Rpd.Node('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: { always: renderAlways }
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/process',
                    render: { always: renderAlways }
                }));

        });

        it('one could define both render-first and render-always functions which are passed with node adding and node processing events', function() {

            var renderFirst  = function() {},
                renderAlways = function() {};
            var renderer = { first:  renderFirst,
                             always: renderAlways };

            Rpd.noderenderer('spec/foo', 'spec', renderer);

            var node = new Rpd.Node('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: { first: renderFirst,
                              always: renderAlways }
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/process',
                    render: jasmine.objectContaining({ always: renderAlways })
                }));

        });

        it('one could define a single function which is executed on every node creation and returns the renderer for that node', function() {

            var renderers = {};
            var rendererGenSpy = jasmine.createSpy('renderer-generator')
                                        .and.callFake(function(node) {
                return (renderers[node.name] = {
                    first: function() { },
                    always: function() { },
                });
            });

            Rpd.noderenderer('spec/foo', 'spec', rendererGenSpy);

            var nodeOne = new Rpd.Node('spec/foo', 'node-1');
            nodeOne.addInlet('spec/any', 'a').receive('a');

            expect(rendererGenSpy).toHaveBeenCalledOnce();
            expect(rendererGenSpy).toHaveBeenCalledWith(nodeOne);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: renderers['node-1']
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/process',
                    render: renderers['node-1']
                }));

            var nodeTwo = new Rpd.Node('spec/foo', 'node-2');
            nodeTwo.addInlet('spec/any', 'a').receive('b');

            expect(rendererGenSpy).toHaveBeenCalledTwice();
            expect(rendererGenSpy).toHaveBeenCalledWith(nodeTwo);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: renderers['node-2']
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/process',
                    render: renderers['node-2']
                }));

        });

        it('not passes this renderer if current renderer is different from the registered one', function() {

            var renderFirst  = function() {},
                renderAlways = function() {};
            var renderer = { first:  renderFirst,
                             always: renderAlways };

            Rpd.noderenderer('spec/foo', 'sp_c', renderer);

            var node = new Rpd.Node('spec/foo');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive('a');

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: jasmine.objectContaining({ first: renderFirst })
                }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/add',
                    render: jasmine.objectContaining({ always: renderAlways })
                }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'node/process',
                    render: jasmine.objectContaining({ always: renderAlways })
                }));

        });

    });

});

// -----------------------------------------------------------------------------
// ==========================- channel renderer -===============================
// -----------------------------------------------------------------------------

describe('channel renderer', function() {

    it('could be defined as an empty object', function() {
        expect(function() {
            Rpd.channelrenderer('spec/foo', 'spec', {});
        }).not.toThrow();
    });

    describe('transferring with the events', function() {

        var updateSpy;
        var model;
        var node;

        beforeEach(function() {
            updateSpy = jasmine.createSpy('update');

            Rpd.renderer('spec', function() { return updateSpy; });
            Rpd.channeltype('spec/foo');

            model = Rpd.Model.start().renderWith('spec').attachTo({});

            node = new Rpd.Node('spec/empty');
        });

        it('even if it\'s an empty object, passed with channel adding and updating event', function() {

            var renderer = {};

            Rpd.channelrenderer('spec/foo', 'spec', renderer);

            var inlet = node.addInlet('spec/foo', 'a');
            inlet.receive('a');
            var outlet = node.addOutlet('spec/foo', 'b');
            outlet.send('b');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/add',
                    render: renderer
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update',
                    render: renderer
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/add',
                    render: renderer
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/update',
                    render: renderer
                }));

        });

        xit('the normal update stream should not set this field to an update event', function() {
            var modelEventsSpy = jasmine.createSpy('model-events');
            model.events.onValue(modelEventsSpy);
            var nodeEventsSpy = jasmine.createSpy('node-events');
            node.events.onValue(nodeEventsSpy);

            var renderer = {};

            Rpd.channelrenderer('spec/foo', 'spec', renderer);

            var inlet = node.addInlet('spec/foo', 'a');
            inlet.receive('a');
            var outlet = node.addOutlet('spec/foo', 'b');
            outlet.send('b');

            expect(modelEventsSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/add', render: renderer }));
            expect(modelEventsSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'inlet/update', render: renderer }));
            expect(modelEventsSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/add', render: renderer }));
            expect(modelEventsSpy).not.toHaveBeenCalledWith(
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

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/add',
                    render: { show: renderShow }
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update',
                    render: { show: renderShow }
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/add',
                    render: { show: renderShow }
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/update',
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

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/add',
                    render: { edit: renderEdit }
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update',
                    render: { edit: renderEdit }
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/add',
                    render: { edit: renderEdit }
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/update',
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

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/add',
                    render: { show: renderShow,
                              edit: renderEdit }
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update',
                    render: { show: renderShow,
                              edit: renderEdit }
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/add',
                    render: { show: renderShow,
                              edit: renderEdit }
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/update',
                    render: { show: renderShow,
                              edit: renderEdit }
                }));

        });

        it('one could define a single function which is executed on every node creation and returns the renderer for that node', function() {

            var renderers = {};
            var rendererGenSpy = jasmine.createSpy('renderer-generator')
                                        .and.callFake(function(channel) {
                return (renderers[channel.name] = {
                    show: function() { },
                    edit: function() { },
                });
            });

            Rpd.channelrenderer('spec/foo', 'spec', rendererGenSpy);

            var inletA = node.addInlet('spec/foo', 'inlet-a');
            inletA.receive('a');

            expect(rendererGenSpy).toHaveBeenCalledOnce();
            expect(rendererGenSpy).toHaveBeenCalledWith(inletA);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/add',
                    render: renderers['inlet-a']
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update',
                    render: renderers['inlet-a']
                }));

            var inletB = node.addInlet('spec/foo', 'inlet-b');
            inletB.receive('b');

            expect(rendererGenSpy).toHaveBeenCalledTwice();
            expect(rendererGenSpy).toHaveBeenCalledWith(inletB);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/add',
                    render: renderers['inlet-b']
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update',
                    render: renderers['inlet-b']
                }));

            var outletA = node.addOutlet('spec/foo', 'outlet-a');
            outletA.send('a');

            expect(rendererGenSpy).toHaveBeenCalledTimes(3);
            expect(rendererGenSpy).toHaveBeenCalledWith(outletA);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/add',
                    render: renderers['outlet-a']
                }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/update',
                    render: renderers['outlet-a']
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

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/add',
                    render: jasmine.objectContaining({ show: renderShow })
                }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/add',
                    render: jasmine.objectContaining({ edit: renderEdit })
                }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update',
                    render: jasmine.objectContaining({ show: renderShow })
                }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'inlet/update',
                    render: jasmine.objectContaining({ edit: renderEdit })
                }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/add',
                    render: jasmine.objectContaining({ show: renderShow })
                }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/add',
                    render: jasmine.objectContaining({ edit: renderEdit })
                }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/update',
                    render: jasmine.objectContaining({ show: renderShow })
                }));
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    type: 'outlet/update',
                    render: jasmine.objectContaining({ edit: renderEdit })
                }));

        });

    });

});

});

// this function is required due to the fact processing function receives the same object
// modified through time, so if these checks are preformed after the calls, they do fail
// see: https://github.com/shamansir/rpd/issues/89
// and: https://github.com/jasmine/jasmine/issues/872
function handleNextCalls(spy, handlers) {
    var timesCalled = 0;

    spy.and.callFake(function() {
        expect(handlers[timesCalled]).toBeTruthy('No handler for a call #' + timesCalled);
        handlers[timesCalled](spy);
        timesCalled++;
    });

    return function() {
        expect(spy).toHaveBeenCalledTimes(handlers.length);
    }
}
