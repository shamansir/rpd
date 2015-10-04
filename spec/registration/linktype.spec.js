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

    it('could be specified as a single function which returns the defition and gets link instance', function() {
        var definitionGenSpy = jasmine.createSpy('definition-generator')
                                .and.callFake(function(link) {
            return { };
        });

        Rpd.linktype('spec/foo', definitionGenSpy);

        withNewPatch(function(patch, updateSpy) {
            var firstNode = patch.addNode('spec/empty'),
                secondNode = patch.addNode('spec/empty');
            var inlet = secondNode.addInlet('spec/any', 'foo'),
                outlet = firstNode.addOutlet('spec/any', 'foo');
            var link = outlet.connect(inlet, 'spec/foo');

            expect(definitionGenSpy).toHaveBeenCalled();
            expect(definitionGenSpy).toHaveBeenCalledWith(link);

        });
    });

});
