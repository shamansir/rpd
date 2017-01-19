describe('building: node', function() {

    it('should be created with a registered type', function() {
        var renderer = Rpd.renderer('foo', function() {});
        var patch = Rpd.addPatch();
        expect(function() {
            patch.addNode('foo/bar');
        }).toReportError('node/error');
    });

    it('does not requires a title to be set', function() {
        withNewPatch(function(patch, updateSpy) {
            expect(function() {
                patch.addNode('spec/empty');
            }).not.toReportAnyError();
        });
    });

    it('saves the node title', function() {
        withNewPatch(function(patch, updateSpy) {
            function nodeWithTitle(value) {
                return jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: value })
                });
            }

            patch.addNode('spec/empty');
            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/add-node',
                                           node: nodeWithTitle(jasmine.any(String)) }));

            updateSpy.calls.reset();
            patch.addNode('spec/empty', 'Foo');
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/add-node',
                                           node: nodeWithTitle('Foo') }));

            updateSpy.calls.reset();
            patch.addNode('spec/empty', { title: 'Bar' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/add-node',
                                           node: nodeWithTitle('Bar') }));

            updateSpy.calls.reset();
            patch.addNode('spec/empty', null, { title: 'Buz' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/add-node',
                                           node: nodeWithTitle('Buz') }));

            updateSpy.calls.reset();
            patch.addNode('spec/empty', 'Foo', { title: 'Buz' });
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/add-node',
                                           node: nodeWithTitle('Foo') }));
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

    it('allows to override processing function', function() {
        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty', {
                process: function(inlets) {
                    return {
                        'out': inlets.in * 2
                    }
                }
            });
            var inlet = node.addInlet('spec/any', 'in');
            var outlet = node.addOutlet('spec/any', 'out');

            updateSpy.calls.reset();

            inlet.receive(2);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/update',
                                           outlet: outlet,
                                           value: 4 }));
        });
    });

    it('allows to add inlets from node definition', function() {
        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty', {
                inlets: {
                    'in': { type: 'spec/any' }
                }
            });

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-inlet',
                                           inlet: jasmine.objectContaining({
                                               type: 'spec/any'
                                           })
                                        }));
        });
    });

    it('allows to add outlets from node definition', function() {
        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty', {
                outlets: {
                    'out': { type: 'spec/any' }
                }
            });

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-outlet',
                                           outlet: jasmine.objectContaining({
                                               type: 'spec/any'
                                           })
                                        }));
        });
    });

    describe('allows to subscribe node events', function() {

        it('node/add-inlet', function() {
            withNewPatch(function(patch, updateSpy) {
                var addInletSpy = jasmine.createSpy('add-inlet');

                var node = patch.addNode('spec/empty', {
                    handle: {
                        'node/add-inlet': addInletSpy
                    }
                });

                var inlet = node.addInlet('spec/any', 'foo');

                expect(addInletSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({
                        type: 'node/add-inlet',
                        node: node,
                        inlet: inlet
                    }));
            });
        });

    });

    it('core/basic node type exists', function() {

        withNewPatch(function(patch, updateSpy) {
            expect(function() {
                patch.addNode('core/basic');
            }).not.toReportAnyError();
        });

    });

    it('allows to send rendering props', function() {
        withNewPatch(function(patch, updateSpy) {
            var node = patch.addNode('spec/empty');

            var propsObj = { foo: 'bar' };

            node.sendProps(propsObj);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/send-props',
                                           props: propsObj
                                         })
            );
        });
    })

    xit('allows to substitute/extend renderer', function() {
        // i#311
    });

});
