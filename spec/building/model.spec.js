describe('building: model', function() {

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

    it('is accessible from Rpd core while being current one'); /* Rpd.getCurrentModel() */

    it('informs user that it was created', function() {
        withNewModel(function(model, updateSpy) {
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'model/new',
                                           model: model }));
        });
    });

});
