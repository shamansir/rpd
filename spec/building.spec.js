var Rpd = Rpd;

if ((typeof Rpd === 'undefined')
 && (typeof require !== 'undefined')) {
    Rpd = require('../src/rpd.js');
}

Rpd.nodetype('core/custom', { name: 'Custom' });

describe('building', function() {

// ==================== model ====================

describe('model', function() {

    it('disallows creating nodes without starting any instance of it', function() {
        expect(function() {
            // no model started at this point
            var node = new Rpd.Node('core/custom', 'Test Node');
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
        var node = new Rpd.Node('core/custom', 'Test Node');
        expect(node).toBeTruthy();
    });

    // ================== renderers ==================

    describe('renderers', function() {

        xit('passes the events to all the registered renderers, with or without a target', function() {
            var model = Rpd.Model.start();
            var fooUpdateSpy = jasmine.createSpy('foo');
            var fooRenderer = Rpd.renderer('foo', function(user_conf) {
                return fooUpdateSpy;
            });

            var named = Rpd.Model.start('foo').renderWith('foo');
            expect(fooUpdateSpy).toHaveBeenCalledWith({ type: 'model/new' })
        });

        it('passes configuration to renderer');

        it('sends events only from a last model instance created');

    });

    // ==================== nodes ====================

    describe('nodes', function() {

    });

    // =================== channels ==================

    describe('channels', function() {

    });

    // ==================== links ====================

    describe('links', function() {

    });

});

});
