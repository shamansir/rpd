xdescribe('building: network', function() {

    it('is always defined', function() {
        expect(Rpd.network).toBeDefined();
    });

    it('could specify one renderer and target for all future models');

    it('provides events from all the created models');

    it('provides access to current model', function() {
        var model = Rpd.Model.start();
        expect(Rpd.network.current()).toBe(model);
    });

    it('last created model becomes current', function() {
        var model1 = Rpd.Model.start();
        var model2 = Rpd.Model.start();
        expect(Rpd.network.current()).toBe(model2);
    });

    it('provides access to inner events');

});
