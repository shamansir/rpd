describe('building: patch', function() {

    it('could be started both with or without a name', function() {
        var unnamed = Rpd.addPatch();
        expect(unnamed).toBeDefined();

        var named = Rpd.addPatch('some-name');
        expect(named).toBeDefined();
    });

    it('accepts modifications without any renderer or target', function() {
        var patch = Rpd.addPatch();
        var node = patch.addNode('spec/empty', 'Test Node');
        expect(node).toBeDefined();
    });

    it('is not allowed to start from constructor', function() {
        expect(function() {
            new Rpd.Patch();
        }).toThrow();

        expect(function() {
            new Rpd.Patch('foo');
        }).toThrow();
    });

    it('could be started in several instances', function() {
        expect(function() {
            Rpd.addPatch();
            Rpd.addPatch();
        }).not.toThrow();
    });

    it('provides access to inner events', function() {
        var addNodeSpy = jasmine.createSpy('add-node');

        var patch = Rpd.addPatch();
        patch.event['patch/add-node'].onValue(addNodeSpy);

        var node = patch.addNode('spec/empty');
        expect(addNodeSpy).toHaveBeenCalled();
    });

    xit('allows to subscribe inner events', function() {
        // i#107
    });

    xit('allows to substitute/extend renderer', function() {
        // i#311
    });

});
