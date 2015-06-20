describe('building: renderer', function() {

    xit('should have an alias', function() {
        expect(function() {
            Rpd.renderer();
        }).toThrow();
    });

    it('receives no events if no target was specified', function() {

        var fooUpdateSpy = jasmine.createSpy();
        var fooRenderer = Rpd.renderer('foo', function(user_conf) {
            return fooUpdateSpy;
        });

        var barUpdateSpy = jasmine.createSpy();
        var barRenderer = Rpd.renderer('bar', function(user_conf) {
            return barUpdateSpy;
        });

        Rpd.Model.start('foo')
                 .renderWith('foo')
                 .renderWith('bar');

        expect(fooUpdateSpy).not.toHaveBeenCalled();
        expect(barUpdateSpy).not.toHaveBeenCalled();

    });

    it('receives all events, if at least one target was specified', function() {

        var fooUpdateSpy = jasmine.createSpy();
        var fooRenderer = Rpd.renderer('foo', function(user_conf) {
            return fooUpdateSpy;
        });

        var barUpdateSpy = jasmine.createSpy();
        var barRenderer = Rpd.renderer('bar', function(user_conf) {
            return barUpdateSpy;
        });

        var targetOne = {}, targetTwo = {}, targetThree = {};

        Rpd.Model.start()
                 .renderWith('foo')
                 .attachTo(targetOne)
                 .attachTo(targetTwo)
                 .renderWith('bar')
                 .attachTo(targetThree);

        expect(fooUpdateSpy).toHaveBeenCalledWith(targetOne,
                             jasmine.objectContaining({ type: 'model/new' }));
        expect(fooUpdateSpy).toHaveBeenCalledWith(targetTwo,
                             jasmine.objectContaining({ type: 'model/new' }));
        expect(fooUpdateSpy).toHaveBeenCalledWith(targetThree,
                             jasmine.objectContaining({ type: 'model/new' }));

        expect(barUpdateSpy).toHaveBeenCalledWith(targetOne,
                             jasmine.objectContaining({ type: 'model/new' }));
        expect(barUpdateSpy).toHaveBeenCalledWith(targetTwo,
                             jasmine.objectContaining({ type: 'model/new' }));
        expect(barUpdateSpy).toHaveBeenCalledWith(targetThree,
                             jasmine.objectContaining({ type: 'model/new' }));

    });

    it('receives configuration passed from a user', function() {
        var configurationSpy = jasmine.createSpy('conf');
        var renderer = Rpd.renderer('foo', function(user_conf) {
            configurationSpy(user_conf);
            return function() {};
        });

        var confMock = {};

        Rpd.Model.start().renderWith('foo', confMock);

        expect(configurationSpy).toHaveBeenCalledWith(confMock);
    });

    it('receives events from all started models');

});
