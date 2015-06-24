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

    it('should not pass updates to renderer if it was not specified', function() {

    });

    it('should pass updates to all specified renderers and models if their targets are different', function() {

    });

    it('should allow and track switching current model', function() {});

    it('after the switch, starts passing updates to the same renderer with same target', function() {});

    it('fires all construction updates of model selected as current, to a renderer, after the switch', function() {});

    it('fires construction updates again and again if models were switched back', function() {});

});
