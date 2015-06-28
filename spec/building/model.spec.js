describe('building: model', function() {

    //beforeEach(function() { Rpd.network.clear(); });

    it('disallows creating nodes without starting any instance of it', function() {
        expect(function() {
            // no model started at this point
            var node = model.addNode('spec/empty', 'Test Node');
        }).toThrow();
    });

    it('could be started both with or without a name', function() {
        var unnamed = Rpd.Model.start();
        expect(unnamed).toBeDefined();

        var named = Rpd.Model.start('some-name');
        expect(named).toBeDefined();
    });

    it('accepts modifications without any renderer or target', function() {
        var model = Rpd.Model.start();
        var node = model.addNode('spec/empty', 'Test Node');
        expect(node).toBeDefined();
    });

    it('is accessible from Rpd core while being current one'); /* Rpd.getCurrentModel() */

    xit('is not allowed to start from constructor', function() {
        expect(function() {
            new Rpd.Model();
        }).toThrow();

        expect(function() {
            new Rpd.Model('foo');
        }).toThrow();
    });

    it('could be started in several instances', function() {
        expect(function() {
            Rpd.Model.start();
            Rpd.Model.start();
        }).not.toThrow();
    });

    it('provides access to inner events', function() {
        var addNodeSpy = jasmine.createSpy('add-node');

        var model = Rpd.Model.start();
        model.event['node/add'].onValue(addNodeSpy);

        var node = model.addNode('spec/empty');
        expect(addNodeSpy).toHaveBeenCalled();
    });

});
