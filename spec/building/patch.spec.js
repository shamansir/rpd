describe('building: patch', function() {

    //beforeEach(function() { Rpd.network.clear(); });

    it('disallows creating nodes without starting any instance of it', function() {
        expect(function() {
            // no patch started at this point
            var node = patch.addNode('spec/empty', 'Test Node');
        }).toThrow();
    });

    it('could be started both with or without a name', function() {
        var unnamed = Rpd.Patch.start();
        expect(unnamed).toBeDefined();

        var named = Rpd.Patch.start('some-name');
        expect(named).toBeDefined();
    });

    it('accepts modifications without any renderer or target', function() {
        var patch = Rpd.Patch.start();
        var node = patch.addNode('spec/empty', 'Test Node');
        expect(node).toBeDefined();
    });

    it('is accessible from Rpd core while being current one'); /* Rpd.getCurrentPatch() */

    xit('is not allowed to start from constructor', function() {
        expect(function() {
            new Rpd.Patch();
        }).toThrow();

        expect(function() {
            new Rpd.Patch('foo');
        }).toThrow();
    });

    it('could be started in several instances', function() {
        expect(function() {
            Rpd.Patch.start();
            Rpd.Patch.start();
        }).not.toThrow();
    });

    it('provides access to inner events', function() {
        var addNodeSpy = jasmine.createSpy('add-node');

        var patch = Rpd.Patch.start();
        patch.event['node/add'].onValue(addNodeSpy);

        var node = patch.addNode('spec/empty');
        expect(addNodeSpy).toHaveBeenCalled();
    });

});
