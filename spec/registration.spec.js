var Rpd = Rpd, Kefir = Kefir;

var RpdMatchers = RpdMatchers;

if ((typeof Rpd === 'undefined')
 && (typeof Kefir === 'undefined')
 && (typeof RpdMatchers === 'undefined')
 && (typeof require !== 'undefined')) {
    Kefir = require('../vendor/kefir.min.js');
    Rpd = require('../src/rpd.js');
    RpdMatchers = require('./matchers.js');
}

Rpd.channeltype('spec/any', { });

describe('registering', function() {

// -----------------------------------------------------------------------------
// ===============================- renderer -==================================
// -----------------------------------------------------------------------------

describe('renderer', function() {
});

// -----------------------------------------------------------------------------
// =================================- node -====================================
// -----------------------------------------------------------------------------

function withNewModel(fn) {
    var updateSpy = jasmine.createSpy();
    var renderer = Rpd.renderer('foo', function(user_conf) {
        return updateSpy;
    });

    var model = Rpd.Model.start().renderWith('foo').attachTo({});

    fn(model, updateSpy);
}

describe('node type', function() {

    beforeEach(function() {
        jasmine.addMatchers({
            toHaveBeenOrderlyCalledWith: RpdMatchers.toHaveBeenOrderlyCalledWith
        });
    });

    it('could be registered with an empty object', function() {
        expect(function() {
            Rpd.nodetype('spec/foo', {});
        }).not.toThrow();
    });

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
            inlets: { 'a': { type: 'spec/any' } },
            outlets: { 'b': { type: 'spec/any' } }
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

    /*

    it('informs it\'s ready when all default channels were prepared');

    describe('processing', function() {

        //it('properly informs, and calls processing function, if defined, when some new value occured or some channels was modified');

        it('sums up all updates');

        it('does not reacts if updated channel was cold, but keeps its value for next update');

        it('passes single values to corresponding outlets');

        it('passes streamed values to corresponding outlets');

        //it('if no outlet was updated, does not calls the')

        it('still receives updates from hidden channels');

    });

    */

});

// -----------------------------------------------------------------------------
// ===============================- channel -===================================
// -----------------------------------------------------------------------------

describe('channel type', function() {

});

// -----------------------------------------------------------------------------
// =================================- link -====================================
// -----------------------------------------------------------------------------

describe('link type', function() {

});

// -----------------------------------------------------------------------------
// ============================- node renderer -================================
// -----------------------------------------------------------------------------

describe('node renderer', function() {

});

// -----------------------------------------------------------------------------
// ==========================- channel renderer -===============================
// -----------------------------------------------------------------------------

describe('channel renderer', function() {

});

});
