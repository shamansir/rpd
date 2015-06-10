var Rpd = Rpd, Kefir = Kefir, prettify = prettify;

var RpdMatchers = RpdMatchers;

if ((typeof Rpd === 'undefined')
 && (typeof Kefir === 'undefined')
 && (typeof RpdMatchers === 'undefined')
 && (typeof prettify === 'undefined')
 && (typeof require !== 'undefined')) {
    Kefir = require('../vendor/kefir.min.js');
    Rpd = require('../src/rpd.js');
    RpdMatchers = require('./matchers.js');
    prettify = require('./prettify.js');
}

prettify(Rpd); // inject pretty-print for Jasmine

// SPEC CODE

Rpd.nodetype('spec/empty', { name: 'Mock' });
Rpd.channeltype('spec/any', { });
Rpd.linktype('spec/pass', {});

describe('building', function() {

describe('model', function() {

    // -------------------------------------------------------------------------
    // ==============================- model -==================================
    // -------------------------------------------------------------------------

    it('disallows creating nodes without starting any instance of it', function() {
        expect(function() {
            // no model started at this point
            var node = new Rpd.Node('spec/empty', 'Test Node');
        }).toThrow();
    });

    it('could be started both with or without a name', function() {
        var unnamed = Rpd.Model.start();
        expect(unnamed).toBeTruthy();

        var named = Rpd.Model.start('some-name');
        expect(named).toBeTruthy();
    });

    it('accepts modifications without any renderer or target', function() {
        var model = Rpd.Model.start();
        var node = new Rpd.Node('spec/empty', 'Test Node');
        expect(node).toBeTruthy();
    });

    // -------------------------------------------------------------------------
    // =============================- renderer -================================
    // -------------------------------------------------------------------------

    describe('renderer', function() {

        xit('should have an alias', function() {
            expect(function() {
                Rpd.renderer();
            }).toThrow();
        });

        it('receives no events if no target was specified', function() {

            var fooUpdateSpy = jasmine.createSpy();
            var fooRenderer = Rpd.renderer('foo', function(user_conf) {
                return fooUpdateSpy;
            });

            var barUpdateSpy = jasmine.createSpy();
            var barRenderer = Rpd.renderer('bar', function(user_conf) {
                return barUpdateSpy;
            });

            Rpd.Model.start('foo')
                     .renderWith('foo')
                     .renderWith('bar');

            expect(fooUpdateSpy).not.toHaveBeenCalled();
            expect(barUpdateSpy).not.toHaveBeenCalled();

        });

        it('receives all events, if at least one target was specified', function() {

            var fooUpdateSpy = jasmine.createSpy();
            var fooRenderer = Rpd.renderer('foo', function(user_conf) {
                return fooUpdateSpy;
            });

            var barUpdateSpy = jasmine.createSpy();
            var barRenderer = Rpd.renderer('bar', function(user_conf) {
                return barUpdateSpy;
            });

            var targetOne = {}, targetTwo = {}, targetThree = {};

            Rpd.Model.start()
                     .renderWith('foo')
                     .attachTo(targetOne)
                     .attachTo(targetTwo)
                     .renderWith('bar')
                     .attachTo(targetThree);

            expect(fooUpdateSpy).toHaveBeenCalledWith(targetOne,
                                 jasmine.objectContaining({ type: 'model/new' }));
            expect(fooUpdateSpy).toHaveBeenCalledWith(targetTwo,
                                 jasmine.objectContaining({ type: 'model/new' }));
            expect(fooUpdateSpy).toHaveBeenCalledWith(targetThree,
                                 jasmine.objectContaining({ type: 'model/new' }));

            expect(barUpdateSpy).toHaveBeenCalledWith(targetOne,
                                 jasmine.objectContaining({ type: 'model/new' }));
            expect(barUpdateSpy).toHaveBeenCalledWith(targetTwo,
                                 jasmine.objectContaining({ type: 'model/new' }));
            expect(barUpdateSpy).toHaveBeenCalledWith(targetThree,
                                 jasmine.objectContaining({ type: 'model/new' }));

        });

        it('receives configuration passed from a user', function() {
            var configurationSpy = jasmine.createSpy('conf');
            var renderer = Rpd.renderer('foo', function(user_conf) {
                configurationSpy(user_conf);
                return function() {};
            });

            var confMock = {};

            Rpd.Model.start().renderWith('foo', confMock);

            expect(configurationSpy).toHaveBeenCalledWith(confMock);
        });

        it('receives events from all started models');

    });

    // -------------------------------------------------------------------------
    // =============================- model (cont.) -===========================
    // -------------------------------------------------------------------------

    function withNewModel(fn) {
        var updateSpy = jasmine.createSpy('update');
        var renderer = Rpd.renderer('foo', function(user_conf) {
            return updateSpy;
        });

        var model = Rpd.Model.start().renderWith('foo').attachTo({});

        fn(model, updateSpy);
    }

    it('informs user that it was created', function() {
        withNewModel(function(model, updateSpy) {
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'model/new',
                                           model: model }));
        });
    });

    // -------------------------------------------------------------------------
    // =============================- node -====================================
    // -------------------------------------------------------------------------

    describe('node', function() {

        it('should be created with a registered type', function() {
            var renderer = Rpd.renderer('foo', function() {});
            Rpd.Model.start();
            expect(function() {
                new Rpd.Node('foo/bar');
            }).toThrow();
        });

        it('uses its type as a name if name wasn\'t specified on creation');

        it('informs it was added to a model with an event', function() {
            withNewModel(function(model, updateSpy) {
                var node = new Rpd.Node('spec/empty');

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'node/add',
                                               node: node }));
            });
        });

        it('informs it was removed from a model with an event', function() {
            withNewModel(function(model, updateSpy) {
                var node = new Rpd.Node('spec/empty');
                model.removeNode(node);

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'node/remove',
                                               node: node }));
            });
        });

        it('fires no events after it was removed from a model', function() {
            withNewModel(function(model, updateSpy) {
                var node = new Rpd.Node('spec/empty');
                model.removeNode(node);

                updateSpy.calls.reset();

                node.addInlet('spec/any', 'foo');

                expect(updateSpy).not.toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'inlet/add' }));
            });
        });

        it('may have any number of inlets and outlets');

        // ---------------------------------------------------------------------
        // ===========================- inlet -=================================
        // ---------------------------------------------------------------------

        describe('inlet', function() {

            it('informs it has been added to a node', function() {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var inlet = node.addInlet('spec/any', 'foo');

                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/add',
                                                   inlet: inlet }));

                });
            });

            it('informs it has been removed from a node', function() {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var inlet = node.addInlet('spec/any', 'foo');
                    node.removeInlet(inlet);

                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/remove',
                                                   inlet: inlet }));

                });
            });

            it('receives no updates on creation', function() {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var inlet = node.addInlet('spec/any', 'foo');

                    expect(updateSpy).not.toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update' }));

                });
            });

            it('receives default value on creation, if it was specified', function() {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var defaultValue = { 'foo': 'bar' };
                    var inlet = node.addInlet('spec/any', 'foo', 'Foo', defaultValue);

                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   inlet: inlet,
                                                   value: defaultValue }));

                });
            });

            it('receives single value given explicitly by user', function() {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var userValue = { 'foo': 'bar' };
                    var inlet = node.addInlet('spec/any', 'foo');
                    inlet.receive(userValue);

                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   inlet: inlet,
                                                   value: userValue }));

                });
            });

            it('receives values when follows a stream provided by user', function() {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var userValue = { 'foo': 'bar' };
                    var inlet = node.addInlet('spec/any', 'foo');
                    inlet.stream(Kefir.constant(userValue));

                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   inlet: inlet,
                                                   value: userValue }));

                });
            });

            it('may receive sequences of values from a stream', function(done) {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var userSequence = [ 2, 'foo', { 'foo': 'bar' } ];
                    var period = 30;

                    var inlet = node.addInlet('spec/any', 'foo');
                    inlet.stream(Kefir.sequentially(period, userSequence));

                    setTimeout(function() {
                        for (var i = 0; i < userSequence.length; i++) {
                            expect(updateSpy).toHaveBeenCalledWith(
                                jasmine.anything(),
                                jasmine.objectContaining({ type: 'inlet/update',
                                                           inlet: inlet,
                                                           value: userSequence[i] }));
                        }
                        done();
                    }, period * (userSequence.length + 1));

                });
            });

            xit('does not receive any values if it\'s readonly');

            xit('still sends values when it\'s hidden');

            xit('does not send values, but saves them, when it\'s cold');

            it('stops receiving values when it was removed from a node', function() {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var inlet = node.addInlet('spec/any', 'foo');
                    node.removeInlet(inlet);

                    inlet.receive(10);

                    expect(updateSpy).not.toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update' }));

                });
            });

            it('stops receiving streamed values when it was removed from a node', function(done) {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var sequence = [ 1, 2, 3 ];
                    var period = 30;

                    var inlet = node.addInlet('spec/any', 'foo');
                    node.removeInlet(inlet);

                    inlet.stream(Kefir.sequentially(period, sequence));

                    setTimeout(function() {
                        expect(updateSpy).not.toHaveBeenCalledWith(
                            jasmine.anything(),
                            jasmine.objectContaining({ type: 'inlet/update' }));
                        done();
                    }, period * (sequence.length + 1));

                });
            });

            it('able to receive values in any moment');

            it('disables default stream of values when new value was sent');

            it('disables default stream of values when new stream was plugged in');

            it('disables previous stream of values when separate value was sent');

            it('disables previous stream of values when new stream was plugged in');

        });

        // ---------------------------------------------------------------------
        // ===========================- outlet -================================
        // ---------------------------------------------------------------------

        describe('outlet', function() {

            it('informs it has been added to a node', function() {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var outlet = node.addOutlet('spec/any', 'foo');

                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'outlet/add',
                                                   outlet: outlet })
                    );

                });
            });

            it('informs it has been removed from a node', function() {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var outlet = node.addOutlet('spec/any', 'foo');
                    node.removeOutlet(outlet);

                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'outlet/remove',
                                                   outlet: outlet })
                    );

                });
            });

            it('sends no updates on creation', function() {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var outlet = node.addOutlet('spec/any', 'foo');

                    expect(updateSpy).not.toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'outlet/update' }));

                });
            });

            it('sends default value on creation, if it was specified', function() {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var outlet = node.addOutlet('spec/any', 'foo');

                    expect(updateSpy).not.toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'outlet/update' }));

                });
            });

            it('sends single value given explicitly by user', function() {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var userValue = { 'foo': 'bar' };
                    var outlet = node.addOutlet('spec/any', 'foo');
                    outlet.send(userValue);

                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'outlet/update',
                                                   outlet: outlet,
                                                   value: userValue }));

                });
            });

            it('may send sequences of values from a stream', function(done) {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var userSequence = [ 2, 'foo', { 'foo': 'bar' } ];
                    var period = 30;

                    var outlet = node.addOutlet('spec/any', 'foo');
                    outlet.stream(Kefir.sequentially(period, userSequence));

                    setTimeout(function() {
                        for (var i = 0; i < userSequence.length; i++) {
                            expect(updateSpy).toHaveBeenCalledWith(
                                jasmine.anything(),
                                jasmine.objectContaining({ type: 'outlet/update',
                                                           outlet: outlet,
                                                           value: userSequence[i] }));
                        }
                        done();
                    }, period * (userSequence.length + 1));

                });
            });

            it('stops receiving values when it was removed from a node', function() {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var outlet = node.addOutlet('spec/any', 'foo');
                    node.removeOutlet(outlet);

                    outlet.send(10);

                    expect(updateSpy).not.toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'outlet/update' }));

                });
            });

            it('stops receiving streamed values when it was removed from a node', function(done) {
                withNewModel(function(model, updateSpy) {

                    var node = new Rpd.Node('spec/empty');

                    var sequence = [ 1, 2, 3 ];
                    var period = 30;

                    var outlet = node.addOutlet('spec/any', 'foo');
                    node.removeOutlet(outlet);

                    outlet.stream(Kefir.sequentially(period, sequence));

                    setTimeout(function() {
                        expect(updateSpy).not.toHaveBeenCalledWith(
                            jasmine.anything(),
                            jasmine.objectContaining({ type: 'outlet/update' }));
                        done();
                    }, period * (sequence.length + 1));

                });
            });

            it('able to send values in any moment');

            it('disables default stream of values when new value was sent');

            it('disables default stream of values when new stream was plugged in');

            it('disables previous stream of values when separate value was sent');

            it('disables previous stream of values when new stream was plugged in');

        });

        // ---------------------------------------------------------------------
        // =============================- link -================================
        // ---------------------------------------------------------------------

        describe('link', function() {

            it('should be connected to both ends');

            it('knows all individual values going through', function() {
                withNewModel(function(model, updateSpy) {

                    var sending = new Rpd.Node('spec/empty');
                    var outlet = sending.addOutlet('spec/any', 'bar');

                    var receiving = new Rpd.Node('spec/empty');
                    var inlet = receiving.addInlet('spec/any', 'foo');

                    var link = outlet.connect(inlet, null, 'spec/pass');
                    outlet.send(5);

                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'link/pass',
                                                   link: link,
                                                   value: 5 }));
                });
            });

            it('knows streams of values going through', function(done) {
                withNewModel(function(model, updateSpy) {

                    var sending = new Rpd.Node('spec/empty');
                    var outlet = sending.addOutlet('spec/any', 'bar');

                    var receiving = new Rpd.Node('spec/empty');
                    var inlet = receiving.addInlet('spec/any', 'foo');

                    var link = outlet.connect(inlet, null, 'spec/pass');

                    var userSequence = [ 2, 'foo', { 'foo': 'bar' } ];
                    var period = 30;

                    outlet.stream(Kefir.sequentially(period, userSequence));

                    setTimeout(function() {
                        for (var i = 0; i < userSequence.length; i++) {
                            expect(updateSpy).toHaveBeenCalledWith(
                                jasmine.anything(),
                                jasmine.objectContaining({ type: 'link/pass',
                                                           link: link,
                                                           value: userSequence[i] }));
                        }
                        done();
                    }, period * (userSequence.length + 1));
                });
            });

            it('gets individual values from connected outlet and passes them to connected inlet', function() {
                withNewModel(function(model, updateSpy) {

                    var sending = new Rpd.Node('spec/empty');
                    var outlet = sending.addOutlet('spec/any', 'bar');

                    var receiving = new Rpd.Node('spec/empty');
                    var inlet = receiving.addInlet('spec/any', 'foo');

                    var link = outlet.connect(inlet, null, 'spec/pass');
                    outlet.send(5);

                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   inlet: inlet,
                                                   value: 5 }));

                });
            });

            it('gets streams of values from connected outlet and passes them to connected inlet', function(done) {
                withNewModel(function(model, updateSpy) {

                    var sending = new Rpd.Node('spec/empty');
                    var outlet = sending.addOutlet('spec/any', 'bar');

                    var receiving = new Rpd.Node('spec/empty');
                    var inlet = receiving.addInlet('spec/any', 'foo');

                    var link = outlet.connect(inlet, null, 'spec/pass');

                    var userSequence = [ 2, 'foo', { 'foo': 'bar' } ];
                    var period = 30;

                    outlet.stream(Kefir.sequentially(period, userSequence));

                    setTimeout(function() {
                        for (var i = 0; i < userSequence.length; i++) {
                            expect(updateSpy).toHaveBeenCalledWith(
                                jasmine.anything(),
                                jasmine.objectContaining({ type: 'inlet/update',
                                                           inlet: inlet,
                                                           value: userSequence[i] }));

                        }
                        done();
                    }, period * (userSequence.length + 1));
                });
            });

            it('could be disabled', function() {
                withNewModel(function(model, updateSpy) {

                    var sending = new Rpd.Node('spec/empty');
                    var outlet = sending.addOutlet('spec/any', 'bar');

                    var receiving = new Rpd.Node('spec/empty');
                    var inlet = receiving.addInlet('spec/any', 'foo');

                    var link = outlet.connect(inlet, null, 'spec/pass');
                    link.disable();
                    outlet.send(5);

                    expect(updateSpy).not.toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   inlet: inlet }));
                });
            });

            it('receives last value again when it was enabled back', function() {
                withNewModel(function(model, updateSpy) {

                    var sending = new Rpd.Node('spec/empty');
                    var outlet = sending.addOutlet('spec/any', 'bar');

                    var receiving = new Rpd.Node('spec/empty');
                    var inlet = receiving.addInlet('spec/any', 'foo');

                    var link = outlet.connect(inlet, null, 'spec/pass');
                    outlet.send(1);
                    outlet.send(5);
                    link.disable();

                    updateSpy.calls.reset();
                    link.enable();

                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   inlet: inlet,
                                                   value: 5 }));
                });
            });

            it('receives last value when it was enabled back, even when this value was sent while it was disabled', function() {
                withNewModel(function(model, updateSpy) {

                    var sending = new Rpd.Node('spec/empty');
                    var outlet = sending.addOutlet('spec/any', 'bar');

                    var receiving = new Rpd.Node('spec/empty');
                    var inlet = receiving.addInlet('spec/any', 'foo');

                    var link = outlet.connect(inlet, null, 'spec/pass');
                    outlet.send(1);
                    link.disable();
                    outlet.send(5);

                    updateSpy.calls.reset();
                    link.enable();

                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   inlet: inlet,
                                                   value: 5 }));
                });
            });

            it('uses the adapter function, if defined, and applies adapted value to a connected inlet', function() {
                withNewModel(function(model, updateSpy) {

                    var sending = new Rpd.Node('spec/empty');
                    var outlet = sending.addOutlet('spec/any', 'bar');

                    var receiving = new Rpd.Node('spec/empty');
                    var inlet = receiving.addInlet('spec/any', 'foo');

                    var adapter = jasmine.createSpy('adapter',
                            function(x) { return x * 7; })
                            .and.callThrough();

                    var link = outlet.connect(inlet, adapter, 'spec/pass');
                    outlet.send(2);

                    expect(adapter).toHaveBeenCalled();
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'link/pass',
                                                   link: link,
                                                   value: 2 }));
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'link/adapt',
                                                   link: link,
                                                   before: 2,
                                                   after: 14 }));
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   inlet: inlet,
                                                   value: 14 }));

                });
            });

            xit('handles recursive connections');

        });

        // ---------------------------------------------------------------------
        // =============================- node (cont.) -========================
        // ---------------------------------------------------------------------

        it('turned on at start');

        it('could be turned off');

        it('receives values from other nodes');

        it('passes values to other nodes');

        it('fires no process events until the node is ready (default inlets/outlets are set up)');

        // TODO: process event

    });


});

});
