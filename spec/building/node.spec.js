describe('building: node', function() {

    it('should be created with a registered type', function() {
        var renderer = Rpd.renderer('foo', function() {});
        var patch = Rpd.addPatch();
        expect(function() {
            patch.addNode('foo/bar');
        }).toThrow();
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

    it('disconnects all the links attached to the node after it was removed from a patch', function() {
        withNewPatch(function(patch, updateSpy) {

            var nodeOne = patch.addNode('spec/empty');
            var nodeTwo = patch.addNode('spec/empty');
            var nodeThree = patch.addNode('spec/empty');

            var outletOne = nodeOne.addOutlet('spec/any', 'one');
            var inletOne = nodeTwo.addInlet('spec/any', 'one');

            var outletTwo = nodeTwo.addOutlet('spec/any', 'two');
            var inletTwo = nodeThree.addInlet('spec/any', 'two');

            outletOne.connect(inletOne, 'spec/pass');
            outletTwo.connect(inletTwo, 'spec/pass');

            patch.removeNode(nodeTwo);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/disconnect',
                                           outlet: outletOne }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/disconnect',
                                           outlet: outletTwo }));

        });
    });

    it('fires disconnect events before the remove event', function() {
        withNewPatch(function(patch, updateSpy) {
            var nodeOne = patch.addNode('spec/empty');
            var nodeTwo = patch.addNode('spec/empty');

            var outlet = nodeOne.addOutlet('spec/any', 'one');
            var inlet = nodeTwo.addInlet('spec/any', 'one');

            outlet.connect(inlet, 'spec/pass');

            updateSpy.and.callFake(function(update) {
                if (update.type === 'patch/remove-node') {
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'outlet/disconnect' }));
                }
            });

            patch.removeNode(nodeOne);

            expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'patch/remove-node' }));
        });
    });

    it('does not disconnect same link twice on node removal', function() {
        withNewPatch(function(patch, updateSpy) {
            var nodeOne = patch.addNode('spec/empty');
            var nodeTwo = patch.addNode('spec/empty');

            var outlet = nodeOne.addOutlet('spec/any', 'one');
            var inlet = nodeTwo.addInlet('spec/any', 'one');

            var link = outlet.connect(inlet, 'spec/pass');

            var deleteLinkSpy = jasmine.createSpy('delete-link-' + link.id);

            updateSpy.and.callFake(function(update) {
                if ((update.type === 'outlet/disconnect') &&
                    (update.link.id === link.id)) {
                    deleteLinkSpy();
                }
            });

            patch.removeNode(nodeTwo);
            patch.removeNode(nodeOne);

            expect(deleteLinkSpy).toHaveBeenCalledOnce();
        });
    });

    it('does not disconnect links, which were disconnected before', function() {
        withNewPatch(function(patch, updateSpy) {
            var nodeOne = patch.addNode('spec/empty');
            var nodeTwo = patch.addNode('spec/empty');

            var outlet = nodeOne.addOutlet('spec/any', 'one');
            var inlet = nodeTwo.addInlet('spec/any', 'one');

            var link = outlet.connect(inlet, 'spec/pass');
            outlet.disconnect(link);

            patch.removeNode(nodeOne);

            expect(updateSpy).not.toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'outlet/disconnect',
                link: link
            }));
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

});
