xdescribe('building: network', function() {

    it('should always be there and should be single one', function() {
        expect(Rpd.network).toBeDefined();
    });

    it('should fire an event when new model was started', function() {
        var newModelSpy;

        Rpd.network.event['model/new'].onValue(newModelSpy);

        var model = Rpd.Model.start();

        expect(newModelSpy).toHaveBeenCalledWith(model);
    });

    it('should allow several models to start', function() {
        var newModelSpy;

        Rpd.network.event['model/new'].onValue(newModelSpy);

        var model1 = Rpd.Model.start();
        var model2 = Rpd.Model.start();

        expect(newModelSpy).toHaveBeenCalledWith(model1);
        expect(newModelSpy).toHaveBeenCalledWith(model2);
    });

    /* it('disallows creating model using constructor', function() {
        expect(function() {
            new Rpd.Model();
        }).toThrow();

        expect(function() {
            new Rpd.Model('name');
        }).toThrow();
    }); */

    it('provides access to current model', function() {
        var model1 = Rpd.Model.start();
        expect(Rpd.Model.get()).toBe(model1);
        var model2 = Rpd.Model.start();
        expect(Rpd.Model.get()).toBe(model2);
    });

});
