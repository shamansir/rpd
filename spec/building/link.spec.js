describe('building: link', function() {

    it('should be connected to both ends');

    it('may fall back to default type if no type was specified by user');

    it('knows all individual values going through', function() {
        withNewModel(function(model, updateSpy) {

            var sending = new Rpd.Node('spec/empty');
            var outlet = sending.addOutlet('spec/any', 'bar');

            var receiving = new Rpd.Node('spec/empty');
            var inlet = receiving.addInlet('spec/any', 'foo');

            var link = outlet.connect(inlet, null, 'spec/pass');
            outlet.send(5);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'link/pass',
                                           link: link,
                                           value: 5 }));
        });
    });

    it('knows streams of values going through', function(done) {
        withNewModel(function(model, updateSpy) {

            var sending = new Rpd.Node('spec/empty');
            var outlet = sending.addOutlet('spec/any', 'bar');

            var receiving = new Rpd.Node('spec/empty');
            var inlet = receiving.addInlet('spec/any', 'foo');

            var link = outlet.connect(inlet, null, 'spec/pass');

            var userSequence = [ 2, 'foo', { 'foo': 'bar' } ];
            var period = 30;

            outlet.stream(Kefir.sequentially(period, userSequence));

            setTimeout(function() {
                for (var i = 0; i < userSequence.length; i++) {
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'link/pass',
                                                   link: link,
                                                   value: userSequence[i] }));
                }
                done();
            }, period * (userSequence.length + 1));
        });
    });

    it('gets individual values from connected outlet and passes them to connected inlet', function() {
        withNewModel(function(model, updateSpy) {

            var sending = new Rpd.Node('spec/empty');
            var outlet = sending.addOutlet('spec/any', 'bar');

            var receiving = new Rpd.Node('spec/empty');
            var inlet = receiving.addInlet('spec/any', 'foo');

            var link = outlet.connect(inlet, null, 'spec/pass');
            outlet.send(5);

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'inlet/update',
                                           inlet: inlet,
                                           value: 5 }));

        });
    });

    it('gets streams of values from connected outlet and passes them to connected inlet', function(done) {
        withNewModel(function(model, updateSpy) {

            var sending = new Rpd.Node('spec/empty');
            var outlet = sending.addOutlet('spec/any', 'bar');

            var receiving = new Rpd.Node('spec/empty');
            var inlet = receiving.addInlet('spec/any', 'foo');

            var link = outlet.connect(inlet, null, 'spec/pass');

            var userSequence = [ 2, 'foo', { 'foo': 'bar' } ];
            var period = 30;

            outlet.stream(Kefir.sequentially(period, userSequence));

            setTimeout(function() {
                for (var i = 0; i < userSequence.length; i++) {
                    expect(updateSpy).toHaveBeenCalledWith(
                        jasmine.anything(),
                        jasmine.objectContaining({ type: 'inlet/update',
                                                   inlet: inlet,
                                                   value: userSequence[i] }));

                }
                done();
            }, period * (userSequence.length + 1));
        });
    });

    it('could be disabled', function() {
        withNewModel(function(model, updateSpy) {

            var sending = new Rpd.Node('spec/empty');
            var outlet = sending.addOutlet('spec/any', 'bar');

            var receiving = new Rpd.Node('spec/empty');
            var inlet = receiving.addInlet('spec/any', 'foo');

            var link = outlet.connect(inlet, null, 'spec/pass');
            link.disable();
            outlet.send(5);

            expect(updateSpy).not.toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'inlet/update',
                                           inlet: inlet }));
        });
    });

    it('receives last value again when it was enabled back', function() {
        withNewModel(function(model, updateSpy) {

            var sending = new Rpd.Node('spec/empty');
            var outlet = sending.addOutlet('spec/any', 'bar');

            var receiving = new Rpd.Node('spec/empty');
            var inlet = receiving.addInlet('spec/any', 'foo');

            var link = outlet.connect(inlet, null, 'spec/pass');
            outlet.send(1);
            outlet.send(5);
            link.disable();

            updateSpy.calls.reset();
            link.enable();

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'inlet/update',
                                           inlet: inlet,
                                           value: 5 }));
        });
    });

    it('receives last value when it was enabled back, even when this value was sent while it was disabled', function() {
        withNewModel(function(model, updateSpy) {

            var sending = new Rpd.Node('spec/empty');
            var outlet = sending.addOutlet('spec/any', 'bar');

            var receiving = new Rpd.Node('spec/empty');
            var inlet = receiving.addInlet('spec/any', 'foo');

            var link = outlet.connect(inlet, null, 'spec/pass');
            outlet.send(1);
            link.disable();
            outlet.send(5);

            updateSpy.calls.reset();
            link.enable();

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'inlet/update',
                                           inlet: inlet,
                                           value: 5 }));
        });
    });

    it('uses the adapter function, if defined, and applies adapted value to a connected inlet', function() {
        withNewModel(function(model, updateSpy) {

            var sending = new Rpd.Node('spec/empty');
            var outlet = sending.addOutlet('spec/any', 'bar');

            var receiving = new Rpd.Node('spec/empty');
            var inlet = receiving.addInlet('spec/any', 'foo');

            var adapter = jasmine.createSpy('adapter',
                    function(x) { return x * 7; })
                    .and.callThrough();

            var link = outlet.connect(inlet, adapter, 'spec/pass');
            outlet.send(2);

            expect(adapter).toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'link/pass',
                                           link: link,
                                           value: 2 }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'link/adapt',
                                           link: link,
                                           before: 2,
                                           after: 14 }));
            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({ type: 'inlet/update',
                                           inlet: inlet,
                                           value: 14 }));

        });
    });

    it('also applies adapted values if they were sent as stream');

    // xit('handles recursive connections');

});
