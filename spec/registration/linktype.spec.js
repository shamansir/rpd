describe('registration: link type', function() {

    it('could be registered with an empty object', function() {
        expect(function() {
            Rpd.linktype('spec/foo', {});
        }).not.toThrow();
    });

    it('one could define name for it');

    it('may specify adapting function, which adapts all values going through, streamed or not', function(done) {
        Rpd.linktype('spec/foo', { adapt: function(val) { return val * 3 } });

        var values = [ 3, 14, 15, 92 ];
        var period = 30;

        withNewModel(function(model, updateSpy) {
            var firstNode = new Rpd.Node('spec/empty'),
                secondNode = new Rpd.Node('spec/empty');
            var inlet = secondNode.addInlet('spec/any', 'foo'),
                outlet = firstNode.addOutlet('spec/any', 'foo');
            var link = outlet.connect(inlet, null, 'spec/foo');
            outlet.stream(Kefir.sequentially(period, values));
            outlet.send(21);

            setTimeout(function() {
                for (var i = 0; i < values.length; i++) {
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   value: values[i] * 3 }));
                }
                expect(updateSpy).toHaveBeenCalledWith(
                    jasmine.anything(),
                    jasmine.objectContaining({ type: 'inlet/update',
                                               value: 21 * 3 }));
                done();
            }, period * (values.length + 1));
        });
    });

    it('adapter specified at connection time overrides the adapter specified in type desctiption');

    it('both channel and link could have adapting function');

});
