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
                var inlet = node.addOutlet('spec/any', 'foo');
                patch.inputs([ inlet ]);

                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'patch/set-inputs',
                                               inputs: jasmine.arrayContaining([ inlet ]) }));
            });
        });

    });

});
