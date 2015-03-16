var Rpd = Rpd;

if (typeof require !== 'undefined') {
    Rpd = require('../src/rpd.js');
}

describe("model", function() {

    it("could be started without a name", function() {
        Rpd.Model.start();
    });

  it("contains spec with an expectation", function() {
    expect(true).toBe(true);
  });

});

describe("nodes", function() {

  xit("contains spec with an expectation", function() {
    expect(true).toBe(false);
  });

});

describe("channels", function() {

  xit("contains spec with an expectation", function() {
    expect(true).toBe(false);
  });

});

describe("links", function() {

  xit("contains spec with an expectation", function() {
    expect(true).toBe(false);
  });

});

describe("renderers", function() {

  xit("contains spec with an expectation", function() {
    expect(true).toBe(false);
  });

});
