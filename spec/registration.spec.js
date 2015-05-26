var Rpd = Rpd, Kefir = Kefir;

if ((typeof Rpd === 'undefined')
 && (typeof Kefir === 'undefined')
 && (typeof require !== 'undefined')) {
    Kefir = require('../vendor/kefir.min.js');
    Rpd = require('../src/rpd.js');
}

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

    it('could be registered with empty object', function() {
        expect(function() {
            Rpd.nodetype('spec/foo', {});
        }).not.toThrow();
    });

    it('redefining the type re-writes previous type');

    it('passes the specified name to every created instance');

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
