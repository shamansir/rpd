xdescribe('building: network', function() {

    it('should always be there and should be a single one', function() {
        expect(Rpd.network).toBeDefined();
    });

    it('should fire an event when new model was started', function() {
        var modelStartSpy;

        Rpd.network.event['model/start'].onValue(modelStartSpy);

        var model = Rpd.Model.start();

        expect(modelStartSpy).toHaveBeenCalledWith(model);
    });

    it('should allow several models to start', function() {
        var modelStartSpy;

        Rpd.network.event['model/start'].onValue(modelStartSpy);

        var model1 = Rpd.Model.start();
        var model2 = Rpd.Model.start();

        expect(modelStartSpy).toHaveBeenCalledWith(model1);
        expect(modelStartSpy).toHaveBeenCalledWith(model2);
    });

});
