var Rpd = Rpd;

if ((typeof Rpd === 'undefined')
 && (typeof require !== 'undefined')) {
    Rpd = require('../src/rpd.js');
}

describe('building', function() {

// ==================== model ====================

describe('model', function() {

    it('could be started without a name', function() {
        var model = Rpd.Model.start();
        expect(model).toBeTruthy();
    });

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

// ================== renderers ==================

describe('renderers', function() {

});

});
