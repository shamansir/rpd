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

        it('does not pass the events to all the registered renderers, even if target is not specified', function() {
            var model = Rpd.Model.start();

            var fooUpdateSpy = jasmine.createSpy('foo');
            var fooRenderer = Rpd.renderer('foo', function(user_conf) {
                return fooUpdateSpy;
            });

            var barUpdateSpy = jasmine.createSpy('bar');
            var barRenderer = Rpd.renderer('bar', function(user_conf) {
                return barUpdateSpy;
            });

            Rpd.Model.start('foo')
                     .renderWith('foo')
                     .renderWith('bar');

            expect(fooUpdateSpy).not.toHaveBeenCalled();
            expect(barUpdateSpy).not.toHaveBeenCalled();
        });

        it('pass events to all the registered renderers, if at least one target was specified', function() {

            var model = Rpd.Model.start();

            var fooUpdateSpy = jasmine.createSpy('foo');
            var fooRenderer = Rpd.renderer('foo', function(user_conf) {
                return fooUpdateSpy;
            });

            var barUpdateSpy = jasmine.createSpy('bar');
            var barRenderer = Rpd.renderer('bar', function(user_conf) {
                return barUpdateSpy;
            });

            var targetOne = {}, targetTwo = {}, targetThree = {};

            Rpd.Model.start('foo')
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

        it('passes user configuration to renderer');

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
