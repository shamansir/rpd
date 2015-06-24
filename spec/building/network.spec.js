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

    it('disallows creating model using constructor', function() {
        expect(function() {
            new Rpd.Model();
        }).toThrow();

        expect(function() {
            new Rpd.Model('name');
        }).toThrow();
    });

    it('provides access to current model', function() {
        var model = Rpd.Model.start();
        expect(Rpd.Model.get()).toBe(model);
    });

    it('prepared models are not becoming current unless they are started', function() {
        var model = Rpd.Model.start();
        var pModel = Rpd.Model.prepare();
        expect(Rpd.Model.get()).toBe(model);
    });

    it('passes updates to all specified renderers and models', function() {

    });

    it('should not pass updates to renderer if it was not specified for the model', function() {

    });

    it('should allow creating postponed models', function() {});

    it('still fires all events in the postponed model', function() {})

    it('does not passes updates to model\'s renderer if this model was postponed');

    it('should allow and track switching current model', function() {});

    it('after the switch, starts passing updates to the renderer of this model', function() {});

    it('collects and fires all construction updates of the model selected as current, to a renderer, after the switch', function() {});

    it('fires construction updates again and again if models were switched back and forth', function() {});

    it('collects only the last values updates on channels');

    it('fires an event containing all the connections from one model to another'); // ?

    it('connections from one model to another are not allowed, they should be represented with core/mlink node'); // ?

});
