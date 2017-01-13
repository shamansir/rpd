describe('building: patch', function() {

    it('could be started both with or without a name', function() {
        var unnamed = Rpd.addPatch();
        expect(unnamed).toBeDefined();

        var named = Rpd.addPatch('some-name');
        expect(named).toBeDefined();
    });

    it('accepts modifications without any renderer or target', function() {
        var patch = Rpd.addPatch();
        var node = patch.addNode('spec/empty', 'Test Node');
        expect(node).toBeDefined();
    });

    xit('is not allowed to start from constructor', function() {
        // see issue #406
        expect(function() {
            new Rpd.Patch();
        //}).toReportError('patch/error');
        }).toThrow();

        expect(function() {
            new Rpd.Patch('foo');
        //}).toReportError('patch/error');
        }).toThrow();
    });

    it('could be started in several instances', function() {
        expect(function() {
            Rpd.addPatch();
            Rpd.addPatch();
        }).not.toReportAnyError();
    });

    it('provides access to inner events', function() {
        var addNodeSpy = jasmine.createSpy('add-node');

        var patch = Rpd.addPatch();
        patch.event['patch/add-node'].onValue(addNodeSpy);

        var node = patch.addNode('spec/empty');
        expect(addNodeSpy).toHaveBeenCalled();
    });

    describe('allows to subscribe inner events', function() {

        it('allows to subscribe any event', function() {

            var addNodeSpy = jasmine.createSpy('add-node');

            var patch = Rpd.addPatch({
                handle: {
                    'patch/add-node': addNodeSpy
                }
            });

            var node = patch.addNode('spec/empty');
            expect(addNodeSpy).toHaveBeenCalled();

        });

        it('allows to subscribe event when man specifies a name', function() {
            var addNodeSpy = jasmine.createSpy('add-node');

            var patch = Rpd.addPatch('Foo', {
                handle: {
                    'patch/add-node': addNodeSpy
                }
            });

            var node = patch.addNode('spec/empty');
            expect(addNodeSpy).toHaveBeenCalled();
        });

        it('allows to subscribe nodes and channels events', function() {
            var addInletSpy = jasmine.createSpy('add-inlet');
            var inletUpdateSpy = jasmine.createSpy('inlet-update');

            var patch = Rpd.addPatch('Foo', {
                handle: {
                    'node/add-inlet': addInletSpy,
                    'inlet/update': inletUpdateSpy
                }
            });

            var node = patch.addNode('spec/empty');
            var inlet = node.addInlet('spec/any', 'a');
            inlet.receive(42);
            expect(addInletSpy).toHaveBeenCalled();
            expect(inletUpdateSpy).toHaveBeenCalled();
        });

    });

    xit('subscribing to events', function() {});

    xit('allows to substitute/extend renderer', function() {
        // i#311
    });

});
