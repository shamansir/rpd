describe('registration: link type', function() {

    it('could be registered with an empty object', function() {
        expect(function() {
            Rpd.linktype('spec/foo', {});
        }).not.toThrow();
    });

    it('may specify adapting function, which adapts all values going through, streamed or not', function(done) {
        Rpd.linktype('spec/foo', { adapt: function(val) { return val * 3 } });

        var values = [ 3, 14, 15, 92 ];
        var period = 30;

        withNewPatch(function(patch, updateSpy) {
            var firstNode = patch.addNode('spec/empty'),
                secondNode = patch.addNode('spec/empty');
            var inlet = secondNode.addInlet('spec/any', 'foo'),
                outlet = firstNode.addOutlet('spec/any', 'foo');
            var link = outlet.connect(inlet, 'spec/foo');
            outlet.stream(Kefir.sequentially(period, values));
            outlet.send(21);

            setTimeout(function() {
                for (var i = 0; i < values.length; i++) {
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   value: values[i] * 3 }));
                }
                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({ type: 'inlet/update',
                                               value: 21 * 3 }));
                done();
            }, period * (values.length + 1));
        });
    });

});
