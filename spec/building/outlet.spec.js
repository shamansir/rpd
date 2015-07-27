describe('building: outlet', function() {

    it('informs it has been added to a node', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var outlet = node.addOutlet('spec/any', 'foo');

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/add-outlet',
                                           outlet: outlet })
            );

        });
    });

    it('informs it has been removed from a node', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var outlet = node.addOutlet('spec/any', 'foo');
            node.removeOutlet(outlet);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'node/remove-outlet',
                                           outlet: outlet })
            );

        });
    });

    it('sends no updates on creation', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var outlet = node.addOutlet('spec/any', 'foo');

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/update' }));

        });
    });

    it('sends default value on creation, if it was specified', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var outlet = node.addOutlet('spec/any', 'foo');

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/update' }));

        });
    });

    it('sends single value given explicitly by user', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var userValue = { 'foo': 'bar' };
            var outlet = node.addOutlet('spec/any', 'foo');
            outlet.send(userValue);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/update',
                                           outlet: outlet,
                                           value: userValue }));

        });
    });

    it('may send sequences of values from a stream', function(done) {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var userSequence = [ 2, 'foo', { 'foo': 'bar' } ];
            var period = 30;

            var outlet = node.addOutlet('spec/any', 'foo');
            outlet.stream(Kefir.sequentially(period, userSequence));

            setTimeout(function() {
                for (var i = 0; i < userSequence.length; i++) {
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'outlet/update',
                                                   outlet: outlet,
                                                   value: userSequence[i] }));
                }
                done();
            }, period * (userSequence.length + 1));

        });
    });

    it('stops receiving values when it was removed from a node', function() {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var outlet = node.addOutlet('spec/any', 'foo');
            node.removeOutlet(outlet);

            outlet.send(10);

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'outlet/update' }));

        });
    });

    it('stops receiving streamed values when it was removed from a node', function(done) {
        withNewPatch(function(patch, updateSpy) {

            var node = patch.addNode('spec/empty');

            var sequence = [ 1, 2, 3 ];
            var period = 30;

            var outlet = node.addOutlet('spec/any', 'foo');
            node.removeOutlet(outlet);

            outlet.stream(Kefir.sequentially(period, sequence));

            setTimeout(function() {
                expect(updateSpy).not.toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'outlet/update' }));
                done();
            }, period * (sequence.length + 1));

        });
    });

});
