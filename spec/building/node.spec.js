describe('building: node', function() {

    it('should be created with a registered type', function() {
        var renderer = Rpd.renderer('foo', function() {});
        Rpd.Patch.start();
        expect(function() {
            patch.addNode('foo/bar');
        }).toThrow();
    });

    it('may fall back to default type if no type was specified by user');

    it('uses its type as a name if name wasn\'t specified on creation');

    it('informs it was added to a patch with an event', function() {
        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'node/add',
                                           node: node }));
        });
    });

    it('informs it was removed from a patch with an event', function() {
        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            patch.removeNode(node);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'node/remove',
                                           node: node }));
        });
    });

    it('fires no events after it was removed from a patch', function() {
        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            patch.removeNode(node);

            updateSpy.calls.reset();

            node.addInlet('spec/any', 'foo');

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'inlet/add' }));
        });
    });

    it('may have any number of inlets and outlets');

    it('could be turned off');

    it('receives values from other nodes');

    it('passes values to other nodes');

    it('fires no process events until the node is ready (default inlets/outlets are set up)');

    it('provides access to inner events');

});
