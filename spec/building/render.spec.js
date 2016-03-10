describe('building: renderer', function() {

    it('target could be empty, network case', function() {
        Rpd.renderer('foo', function() {});

        expect(function() {
            Rpd.renderNext('foo');
            Rpd.addPatch();
        }).not.toThrow();

        Rpd.stopRendering();
    });

    it('target could be empty, patch case', function() {
        Rpd.renderer('foo', function() {});

        expect(function() {
            Rpd.addPatch().render('foo');
        }).not.toThrow();

        Rpd.stopRendering();
    });

});
