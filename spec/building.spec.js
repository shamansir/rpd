var Rpd = Rpd;

if ((typeof Rpd === 'undefined')
 && (typeof require !== 'undefined')) {
    Rpd = require('../src/rpd.js');
}

Rpd.nodetype('spec/empty', { name: 'Mock' });
Rpd.channeltype('spec/any', { });

describe('building', function() {

// ==================== model ====================

describe('model', function() {

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

    // ================== renderers ==================

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

    function withNewModel(fn) {
        var updateSpy = jasmine.createSpy();
        var renderer = Rpd.renderer('foo', function(user_conf) {
            return updateSpy;
        });

        var model = Rpd.Model.start().renderWith('foo').attachTo({});

        fn(model, updateSpy);
    }

    // ==================== nodes ====================

    describe('node', function() {

        it('should be created with a registered type', function() {
            var renderer = Rpd.renderer('foo', function() {});
            Rpd.Model.start();
            expect(function() {
                new Rpd.Node('foo/bar');
            }).toThrow();
        });

        it('informs it was added to a model with an event', function() {
            withNewModel(function(model, updateSpy) {
                var node = new Rpd.Node('spec/empty');

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'node/add',
                                               node: node })
                );
            });
        });

        it('informs it was removed from a model with an event', function() {
            withNewModel(function(model, updateSpy) {
                var node = new Rpd.Node('spec/empty');
                model.removeNode(node);

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'node/remove',
                                               node: node })
                );
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
                    jasmine.objectContaining({ type: 'inlet/add' })
                );
            });
        });

        it('informs it\'s ready when all channels were prepared');

        it('calls processing function when some new value occured or channels were modified');

        it('could be turned on and off');

    });

    // =================== channels ==================

    describe('channel', function() {

        it('informs it has been added to a node', function() {
            withNewModel(function(model, updateSpy) {

                var node = new Rpd.Node('spec/empty');

                var inlet = node.addInlet('spec/any', 'foo');

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'inlet/add',
                                               inlet: inlet })
                );

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

                var inlet = node.addInlet('spec/any', 'foo');
                node.removeInlet(inlet);

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'inlet/remove',
                                               inlet: inlet })
                );

                var outlet = node.addOutlet('spec/any', 'foo');
                node.removeOutlet(outlet);

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'outlet/remove',
                                               outlet: outlet })
                );

            });
        });

        it('stops sending values when it was removed from a node');

        it('sends default value on connection');

    });

    // ==================== links ====================

    describe('links', function() {

    });

});

});
