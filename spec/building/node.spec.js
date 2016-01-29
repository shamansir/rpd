describe('building: node', function() {

    it('should be created with a registered type', function() {
        var renderer = Rpd.renderer('foo', function() {});
        var patch = Rpd.addPatch();
        expect(function() {
            patch.addNode('foo/bar');
        }).toThrow();
    });


    it('does not requires a title to be set', function() {
        withNewPatch(function(patch, updateSpy) {
            expect(function() {
                patch.addNode('spec/empty');
            }).not.toThrow();
        });
    });

    it('saves the node title', function() {
        withNewPatch(function(patch, updateSpy) {
            patch.addNode('spec/empty');
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/add-node',
                                           node: jasmine.objectContaining({ title: 'spec/empty' }) }));

            updateSpy.calls.reset();
            patch.addNode('spec/empty', 'Foo');
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/add-node',
                                           node: jasmine.objectContaining({ title: 'Foo' }) }));

            updateSpy.calls.reset();
            patch.addNode('spec/empty', { title: 'Bar' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/add-node',
                                           node: jasmine.objectContaining({ title: 'Bar' }) }));

            updateSpy.calls.reset();
            patch.addNode('spec/empty', null, { title: 'Buz' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/add-node',
                                           node: jasmine.objectContaining({ title: 'Buz' }) }));

            updateSpy.calls.reset();
            patch.addNode('spec/empty', 'Foo', { title: 'Buz' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/add-node',
                                           node: jasmine.objectContaining({ title: 'Foo' }) }));
        });
    });

    it('informs it was added to a patch with an event', function() {
        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/add-node',
                                           node: node }));
        });
    });

    it('informs it was removed from a patch with an event', function() {
        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');
            patch.removeNode(node);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/remove-node',
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
                jasmine.objectContaining({ type: 'node/add-inlet' }));
        });
    });

    it('allows to subscribe node events', function() {

    });

});
