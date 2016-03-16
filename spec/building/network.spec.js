describe('building: network', function() {

    describe('projecting patches', function() {

        it('outlet could be defined as patch output', function() {
            withNewPatch(function(patch, updateSpy) {
                var node = patch.addNode('spec/empty');
                var outlet = node.addOutlet('spec/any', 'foo');
                patch.outputs([ outlet ]);

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'patch/set-outputs',
                                               outputs: jasmine.arrayContaining([ outlet ]) }));
            });
        });

        it('inlet could be defined as patch output', function() {
            withNewPatch(function(patch, updateSpy) {
                var node = patch.addNode('spec/empty');
                var inlet = node.addInlet('spec/any', 'foo');
                patch.inputs([ inlet ]);

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'patch/set-inputs',
                                               inputs: jasmine.arrayContaining([ inlet ]) }));
            });
        });

        it('both outlets and inlets could be defined together', function() {
            withNewPatch(function(patch, updateSpy) {
                var node = patch.addNode('spec/empty');
                var inletOne  = node.addInlet('spec/any', 'foo');
                var inletTwo  = node.addInlet('spec/any', 'foo');
                var outletOne = node.addOutlet('spec/any', 'foo');
                var outletTwo = node.addOutlet('spec/any', 'foo');
                patch.inputs([ inletOne, inletTwo ]);
                patch.outputs([ outletOne, outletTwo ]);

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'patch/set-inputs',
                                               inputs: jasmine.arrayContaining([ inletOne, inletTwo ]) }));
                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'patch/set-outputs',
                                               outputs: jasmine.arrayContaining([ outletOne, outletTwo ]) }));
            });
        });

        it('inner patch could not be projected when no inputs or outputs were specified', function() {
            withNewPatch('root', function(rootPatch, rootUpdateSpy) {
                var rootNode = rootPatch.addNode('spec/empty');

                withNewPatch('inner', function(innerPatch, innerUpdateSpy) {

                    innerPatch.project(rootNode);

                    expect(innerUpdateSpy).not.toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'patch/project' }));

                    expect(rootUpdateSpy).not.toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'patch/refer' }));
                });
            });
        });

        it('inner patch could be projected when empty inputs and outputs sets were specified', function() {
            withNewPatch('root', function(rootPatch, rootUpdateSpy) {
                var rootNode = rootPatch.addNode('spec/empty');

                withNewPatch('inner', function(innerPatch, innerUpdateSpy) {
                    innerPatch.inputs([ ]);
                    innerPatch.outputs([ ]);

                    innerPatch.project(rootNode);

                    expect(innerUpdateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'patch/project',
                                                   node: rootNode,
                                                   target: rootPatch }));

                    expect(rootUpdateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'patch/refer',
                                                   node: rootNode,
                                                   target: innerPatch }));
                });

            });
        });

        it('inner patch could be projected when both inputs and outputs were specified', function() {
            withNewPatch('root', function(rootPatch, rootUpdateSpy) {
                var rootNode = rootPatch.addNode('spec/empty');

                withNewPatch('inner', function(innerPatch, innerUpdateSpy) {
                    var innerNodeOne = innerPatch.addNode('spec/empty');
                    var inputOne = innerNodeOne.addInlet('spec/any', 'foo');
                    var outputOne = innerNodeOne.addOutlet('spec/any', 'foo');
                    var outputTwo = innerNodeOne.addOutlet('spec/any', 'foo');
                    var innerNodeTwo = innerPatch.addNode('spec/empty');
                    var outputThree = innerNodeTwo.addOutlet('spec/any', 'foo');

                    innerPatch.inputs([ inputOne ]);
                    innerPatch.outputs([ outputOne, outputTwo, outputThree ]);

                    innerPatch.project(rootNode);

                    expect(innerUpdateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'patch/project',
                                                   node: rootNode,
                                                   target: rootPatch }));

                    expect(rootUpdateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'patch/refer',
                                                   node: rootNode,
                                                   target: innerPatch }));
                });

            });
        });

        it('patches are opened by default', function() {
            var networkUpdateSpy = jasmine.createSpy('network-update');
            Rpd.events.onValue(networkUpdateSpy);

            var patch = Rpd.addPatch();
            expect(networkUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/open',
                                           patch: patch }));

            Rpd.events.offValue(networkUpdateSpy);
        });

        it('may pass parent patch to an opened one', function() {
            var networkUpdateSpy = jasmine.createSpy('network-update');
            Rpd.events.onValue(networkUpdateSpy);

            var parent = Rpd.addPatch('parent');
            var patch = Rpd.addPatch('child', parent);
            expect(networkUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/open',
                                           patch: patch,
                                           parent: parent }));

            Rpd.events.offValue(networkUpdateSpy);
        });

        it('patch can be already closed when added', function() {
            var networkUpdateSpy = jasmine.createSpy('network-update');
            Rpd.events.onValue(networkUpdateSpy);

            var patch = Rpd.addClosedPatch('patch');
            expect(networkUpdateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/open' }));
            /* expect(networkUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/close',
                                           patch: patch })); */

            Rpd.events.offValue(networkUpdateSpy);
        });

        it('closing a patch fires corresponding event', function() {
            var networkUpdateSpy = jasmine.createSpy('network-update');
            Rpd.events.onValue(networkUpdateSpy);

            var patch = Rpd.addPatch('patch').close();
            expect(networkUpdateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'patch/close',
                                           patch: patch }));

            Rpd.events.offValue(networkUpdateSpy);
        });

        it('properly passes events between several patches', function() {
            withNewPatch('root', function(rootPatch, rootUpdateSpy) {
                withNewPatch('inner', function(innerPatch, innerUpdateSpy) {

                    innerNode = innerPatch.addNode('spec/empty');

                    expect(innerUpdateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'patch/add-node',
                                                   patch: innerPatch,
                                                   node: innerNode }));

                    var rootNode = rootPatch.addNode('spec/empty');
                    expect(rootUpdateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'patch/add-node',
                                                   patch: rootPatch,
                                                   node: rootNode }));

                });

            });
        });

        it('informs when patch was opened', function() {
            withNewPatch('root', function(rootPatch, rootUpdateSpy) {
                expect(rootUpdateSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'patch/open' }));

                rootPatch.open();

                expect(rootUpdateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'patch/open',
                                               patch: rootPatch }));

            });
        });

        it('parent patch could be passed to the opening event', function() {
            withNewPatch('root', function(rootPatch, rootUpdateSpy) {
                withNewPatch('inner', function(innerPatch, innerUpdateSpy) {
                    innerPatch.open(rootPatch);

                    expect(innerUpdateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'patch/open',
                                                   patch: innerPatch,
                                                   parent: rootPatch }));
                });

            });
        });

        it('informs when patch was closed', function() {
            withNewPatch('root', function(rootPatch, rootUpdateSpy) {
                expect(rootUpdateSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'patch/close' }));

                rootPatch.close();

                expect(rootUpdateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'patch/close',
                                               patch: rootPatch }));

            });
        });


    });

});
