describe('building: renderer', function() {

    it('called once for every patch', function() {
        var fooRendererSpy = jasmine.createSpy('foo-renderer');

        Rpd.renderer('foo', fooRendererSpy);

        var turnOff = Rpd.renderNext('foo', {});

        var firstPatch = Rpd.addPatch();
        var secondPatch = Rpd.addPatch();

        expect(fooRendererSpy).toHaveBeenCalledTwice();
        expect(fooRendererSpy).toHaveBeenCalledWith(firstPatch);
        expect(fooRendererSpy).toHaveBeenCalledWith(secondPatch);

        turnOff();
    });

    it('target could be empty, network case', function() {
        var turnOff;

        expect(function() {
            turnOff = Rpd.renderNext('foo');
            Rpd.addPatch();
        }).not.toThrow();

        if (turnOff) turnOff();
    });

    it('target could be empty, patch case', function() {
        expect(function() {
            Rpd.addPatch().render('foo');
        }).not.toThrow();
    });

    it('the inner function is called with target element, network case', function() {
        var fooTargetsSpy = jasmine.createSpy('foo-target');

        Rpd.renderer('foo', function(patch) {
            return fooTargetsSpy;
        });

        var target = { };
        var turnOff = Rpd.renderNext('foo', target);

        Rpd.addPatch();

        expect(fooTargetsSpy).toHaveBeenCalledWith(target, undefined);

        turnOff();
    });

    it('the inner function is called with target element, patch case', function() {
        var fooTargetsSpy = jasmine.createSpy('foo-target');

        Rpd.renderer('foo', function(patch) {
            return fooTargetsSpy;
        });

        var target = { };
        Rpd.addPatch().render('foo', target);

        expect(fooTargetsSpy).toHaveBeenCalledWith(target, undefined);
    });

    it('the inner function is called for every target element and passes configuration there, network case', function() {
        var fooTargetsSpy = jasmine.createSpy('foo-target');

        Rpd.renderer('foo', function(patch) {
            return fooTargetsSpy;
        });

        var targetOne = { };
        var targetTwo = { };
        var conf = { };
        var turnOff = Rpd.renderNext('foo', [ targetOne, targetTwo ], conf);

        Rpd.addPatch();

        expect(fooTargetsSpy).toHaveBeenCalledWith(targetOne, conf);
        expect(fooTargetsSpy).toHaveBeenCalledWith(targetTwo, conf);

        turnOff();
    });

    it('the inner function is called for every target element and passes configuration there, patch case', function() {
        var fooTargetsSpy = jasmine.createSpy('foo-target');

        Rpd.renderer('foo', function(patch) {
            return fooTargetsSpy;
        });

        var targetOne = { };
        var targetTwo = { };
        var conf = { };
        Rpd.addPatch().render('foo', [ targetOne, targetTwo ], conf);

        expect(fooTargetsSpy).toHaveBeenCalledWith(targetOne, conf);
        expect(fooTargetsSpy).toHaveBeenCalledWith(targetTwo, conf);
    });

    it('the inner function is called for every renderer and target, network case', function() {
        var fooTargetsSpy = jasmine.createSpy('foo-target');
        var barTargetsSpy = jasmine.createSpy('bar-target');

        Rpd.renderer('foo', function(patch) { return fooTargetsSpy; });
        Rpd.renderer('bar', function(patch) { return barTargetsSpy; });

        var targetOne = { };
        var targetTwo = { };
        var conf = {};
        var turnOff = Rpd.renderNext([ 'foo', 'bar' ], [ targetOne, targetTwo ], conf);

        Rpd.addPatch();

        expect(fooTargetsSpy).toHaveBeenCalled();
        expect(barTargetsSpy).toHaveBeenCalledWith(targetOne, conf);
        expect(barTargetsSpy).toHaveBeenCalledWith(targetTwo, conf);

        turnOff();
    });

    it('the inner function is called for every renderer and target, patch case', function() {
        var fooTargetsSpy = jasmine.createSpy('foo-target');
        var barTargetsSpy = jasmine.createSpy('bar-target');

        Rpd.renderer('foo', function(patch) { return fooTargetsSpy; });
        Rpd.renderer('bar', function(patch) { return barTargetsSpy; });

        var targetOne = { };
        var targetTwo = { };
        var conf = {};

        Rpd.addPatch().render([ 'foo', 'bar' ], [ targetOne, targetTwo ], conf);

        expect(fooTargetsSpy).toHaveBeenCalled();
        expect(barTargetsSpy).toHaveBeenCalledWith(targetOne, conf);
        expect(barTargetsSpy).toHaveBeenCalledWith(targetTwo, conf);
    });

    it('passes the events to the handler object, network case', function() {
        var addNodeSpy = jasmine.createSpy('add-node');
        var addInletSpy = jasmine.createSpy('add-inlet');

        Rpd.renderer('foo', function(patch) {
            return function(target, conf) {
                return { 'patch/add-node': addNodeSpy,
                         'node/add-inlet': addInletSpy }
            };
        });

        var turnOff = Rpd.renderNext('foo', {});

        var patch = Rpd.addPatch();
        var node = patch.addNode('spec/empty');
        var inlet = node.addInlet('spec/any', 'foo');
        patch.enter();

        expect(addNodeSpy).toHaveBeenCalledWith(jasmine.objectContaining({ node: node }));
        expect(addInletSpy).toHaveBeenCalledWith(jasmine.objectContaining({ inlet: inlet }));

        turnOff();
    });

    it('passes the events to the handler object, patch case', function() {
        var addNodeSpy = jasmine.createSpy('add-node');
        var addInletSpy = jasmine.createSpy('add-inlet');

        Rpd.renderer('foo', function(patch) {
            return function(target, conf) {
                return { 'patch/add-node': addNodeSpy,
                         'node/add-inlet': addInletSpy }
            };
        });

        var patch = Rpd.addPatch().render('foo', {});
        var node = patch.addNode('spec/empty');
        var inlet = node.addInlet('spec/any', 'foo');
        patch.enter();

        expect(addNodeSpy).toHaveBeenCalledWith(jasmine.objectContaining({ node: node }));
        expect(addInletSpy).toHaveBeenCalledWith(jasmine.objectContaining({ inlet: inlet }));
    });

    it('provides events for all subscribed patches', function() {
        var addNodeSpy = jasmine.createSpy('add-node');
        var addInletSpy = jasmine.createSpy('add-inlet');

        Rpd.renderer('foo', function(patch) {
            return function(target, conf) {
                return { 'patch/add-node': addNodeSpy }
            };
        });
        Rpd.renderer('bar', function(patch) {
            return function(target, conf) {
                return { 'node/add-inlet': addInletSpy }
            };
        });

        var patchOne = Rpd.addPatch().render(['foo', 'bar'], {});
        var nodeOne = patchOne.addNode('spec/empty');
        var inletOne = nodeOne.addInlet('spec/any', 'foo');
        patchOne.enter();
        var patchTwo = Rpd.addPatch().render('bar', {});
        var nodeTwo = patchTwo.addNode('spec/empty');
        var inletTwo = nodeTwo.addInlet('spec/any', 'foo');
        patchTwo.enter();

        expect(addNodeSpy).toHaveBeenCalledWith(jasmine.objectContaining({ node: nodeOne }));
        expect(addInletSpy).toHaveBeenCalledWith(jasmine.objectContaining({ inlet: inletOne }));
        expect(addInletSpy).toHaveBeenCalledWith(jasmine.objectContaining({ inlet: inletTwo }));
    });

    it('renderer could also return a function handling any event', function() {
        var fooEventSpy = jasmine.createSpy('foo-events');
        var barEventSpy = jasmine.createSpy('bar-events');

        Rpd.renderer('foo', function(patch) {
            return function(target, conf) {
                return fooEventSpy;
            };
        });
        Rpd.renderer('bar', function(patch) {
            return function(target, conf) {
                return barEventSpy;
            };
        });

        var patchOne = Rpd.addPatch().render(['foo', 'bar'], {});
        var nodeOne = patchOne.addNode('spec/empty');
        patchOne.enter();
        var patchTwo = Rpd.addPatch().render('bar', {});
        var nodeTwo = patchTwo.addNode('spec/empty');
        var inletTwo = nodeTwo.addInlet('spec/any', 'foo');
        patchTwo.enter();

        expect(fooEventSpy).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'patch/add-node', node: nodeOne }));
        expect(barEventSpy).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'patch/add-node', node: nodeTwo }));
        expect(barEventSpy).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'node/add-inlet', inlet: inletTwo }));
        expect(fooEventSpy).not.toHaveBeenCalledWith(jasmine.objectContaining({ type: 'patch/add-inlet', inlet: inletTwo }));
    });

});
