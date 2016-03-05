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

        it('inner patch could be projected', function() {
            withNewPatch('root', function(rootPatch, rootUpdateSpy) {
                var rootNode = rootPatch.addNode('spec/empty');

                withNewPatch('inner', function(innerPatch, innerUpdateSpy) {
                    var innerPatch = Rpd.addPatch();

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

        it('inner patch could be projected when inputs and outputs were specified', function() {
            withNewPatch('root', function(rootPatch, rootUpdateSpy) {
                var rootNode = rootPatch.addNode('spec/empty');

                withNewPatch('inner', function(innerPatch, innerUpdateSpy) {
                    var innerPatch = Rpd.addPatch();
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

    });

});
