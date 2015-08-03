describe('import and export', function() {

    function testImportExport(alias) {

        function testAction(execute, expectations) {
            var finalize = Rpd.export[alias]();

            execute();

            var updateSpy = jasmine.createSpy('update');
            Rpd.events.onValue(updateSpy);

            Rpd.import.json(finalize());

            for (var i = 0; i < expectations.length; i++) {
                expect(updateSpy).toHaveBeenCalledWith(expectations[i]);
            }
        }

        describe(alias, function() {

            it('adding patch', function() {
                testAction(
                    function() { Rpd.addPatch('Add'); },
                    [ jasmine.objectContaining({
                          type: 'network/add-patch',
                          patch: jasmine.objectContaining({ name: 'Add' })
                      }) ]
                );
            });

            it('entering patch', function() {
                testAction(
                    function() { Rpd.addPatch('Enter').enter(); },
                    [ jasmine.objectContaining({
                          type: 'patch/enter',
                          patch: jasmine.objectContaining({ name: 'Enter' })
                      }) ]
                );
            });

            it('exiting patch', function() {
                testAction(
                    function() { Rpd.addPatch('Exit').exit(); },
                    [ jasmine.objectContaining({
                          type: 'patch/exit',
                          patch: jasmine.objectContaining({ name: 'Exit' })
                      }) ]
                );
            });

            it('setting patch inputs', function() {
                testAction(
                    function() {
                        var patch = Rpd.addPatch('Inputs');
                        var node = patch.addNode('spec/empty');
                        var inputOne = node.addInlet('spec/any', 'a');
                        var inputTwo = node.addInlet('spec/any', 'b');
                        patch.inputs([ inputOne, inputTwo ]);
                    },
                    [ jasmine.objectContaining({
                          type: 'patch/set-inputs',
                          patch: jasmine.objectContaining({ name: 'Inputs' }),
                          inputs: [
                              jasmine.objectContaining({ type: 'spec/any', alias: 'a' }),
                              jasmine.objectContaining({ type: 'spec/any', alias: 'b' })
                          ]
                      }) ]
                );
            });

            it('setting patch outputs', function() {
                testAction(
                    function() {
                        var patch = Rpd.addPatch('Outputs');
                        var node = patch.addNode('spec/empty');
                        var outputOne = node.addOutlet('spec/any', 'c');
                        var outputTwo = node.addOutlet('spec/any', 'd');
                        patch.outputs([ outputOne, outputTwo ]);
                    },
                    [ jasmine.objectContaining({
                          type: 'patch/set-outputs',
                          patch: jasmine.objectContaining({ name: 'Outputs' }),
                          outputs: [
                              jasmine.objectContaining({ type: 'spec/any', alias: 'c' }),
                              jasmine.objectContaining({ type: 'spec/any', alias: 'd' })
                          ]
                      }) ]
                );
            });

            it('projecting patch', function() {
                testAction(
                    function() {
                        var srcPatch = Rpd.addPatch('Source');
                        var trgPatch = Rpd.addPatch('Target');
                        var projection = srcPatch.addNode('spec/empty', 'Projection');
                        trgPatch.inputs([]);
                        trgPatch.outputs([]);
                        trgPatch.project(projection);
                    },
                    [ jasmine.objectContaining({
                          type: 'patch/project',
                          patch: jasmine.objectContaining({ name: 'Target' }),
                          target: jasmine.objectContaining({ name: 'Source' }),
                          node: jasmine.objectContaining({ name: 'Projection', type: 'spec/empty' })
                      }) ]
                );
            });

            it('adding node', function() {
                testAction(
                    function() {
                        Rpd.addPatch('AddNode').addNode('spec/empty', 'Foo');
                    },
                    [ jasmine.objectContaining({
                          type: 'patch/add-node',
                          patch: jasmine.objectContaining({ name: 'AddNode' }),
                          node: jasmine.objectContaining({ name: 'Foo', type: 'spec/empty' })
                      }) ]
                );
            });

            it('removing node', function() {
                testAction(
                    function() {
                        var patch = Rpd.addPatch('RemoveNode');
                        var node = patch.addNode('spec/empty', 'Foo');
                        patch.removeNode(node);
                    },
                    [ jasmine.objectContaining({
                          type: 'patch/remove-node',
                          patch: jasmine.objectContaining({ name: 'RemoveNode' }),
                          node: jasmine.objectContaining({ name: 'Foo', type: 'spec/empty' })
                      }) ]
                );
            });

            it('turning node on', function() {
                testAction(
                    function() {
                        Rpd.addPatch('TurnNodeOn').addNode('spec/empty', 'Foo').turnOn();
                    },
                    [ jasmine.objectContaining({
                          type: 'node/turn-on',
                          node: jasmine.objectContaining({ name: 'Foo', type: 'spec/empty' })
                      }) ]
                );
            });

            it('turning node off', function() {
                testAction(
                    function() {
                        Rpd.addPatch('TurnNodeOff').addNode('spec/empty', 'Foo').turnOff();
                    },
                    [ jasmine.objectContaining({
                          type: 'node/turn-off',
                          node: jasmine.objectContaining({ name: 'Foo', type: 'spec/empty' })
                      }) ]
                );
            });

            it('adding inlet', function() {
                testAction(
                    function() {
                        Rpd.addPatch('Foo').addNode('spec/empty', 'AddInlet').addInlet('spec/any', 'Foo');
                    },
                    [ jasmine.objectContaining({
                          type: 'node/add-inlet',
                          node: jasmine.objectContaining({ name: 'AddInlet' }),
                          inlet: jasmine.objectContaining({ name: 'Foo', type: 'spec/any' })
                      }) ]
                );
            });

            it('removing inlet', function() {
                testAction(
                    function() {
                        var patch = Rpd.addPatch('Foo');
                        var node = patch.addNode('spec/empty', 'RemoveInlet');
                        var inlet = node.addInlet('spec/any', 'Bar');
                        node.removeInlet(inlet);
                    },
                    [ jasmine.objectContaining({
                          type: 'node/remove-inlet',
                          node: jasmine.objectContaining({ name: 'RemoveInlet' }),
                          inlet: jasmine.objectContaining({ name: 'Bar', type: 'spec/any' })
                      }) ]
                );
            });

            it('adding outlet', function() {
                testAction(
                    function() {
                        Rpd.addPatch('Foo').addNode('spec/empty', 'AddOutlet').addOutlet('spec/any', 'Bar');
                    },
                    [ jasmine.objectContaining({
                          type: 'node/add-outlet',
                          node: jasmine.objectContaining({ name: 'AddOutlet' }),
                          outlet: jasmine.objectContaining({ name: 'Bar', type: 'spec/any' })
                      }) ]
                );
            });

            it('removing outlet', function() {
                testAction(
                    function() {
                        var patch = Rpd.addPatch('Foo');
                        var node = patch.addNode('spec/empty', 'RemoveOutlet');
                        var outlet = node.addOutlet('spec/any', 'Foo');
                        node.removeOutlet(outlet);
                    },
                    [ jasmine.objectContaining({
                          type: 'node/remove-outlet',
                          node: jasmine.objectContaining({ name: 'RemoveOutlet' }),
                          outlet: jasmine.objectContaining({ name: 'Foo', type: 'spec/any' })
                      }) ]
                );
            });

            it('moving node', function() {
                testAction(
                    function() {
                        Rpd.addPatch('Foo').addNode('spec/empty', 'Move').move(10, 25);
                    },
                    [ jasmine.objectContaining({
                          type: 'node/move',
                          node: jasmine.objectContaining({ name: 'Move' }),
                          position: [ 10, 25 ]
                      }) ]
                );
            });

            it('connecting outlet to inlet', function() {
                testAction(
                    function() {
                        var patch = Rpd.addPatch('Foo');
                        var firstNode = patch.addNode('spec/empty', 'ConnectOne');
                        var outlet = firstNode.addOutlet('spec/any', 'Outlet');
                        var secondNode = patch.addNode('spec/empty', 'ConnectTwo');
                        var inlet = secondNode.addInlet('spec/any', 'Inlet');
                        outlet.connect(inlet, 'spec/pass');
                    },
                    [ jasmine.objectContaining({
                          type: 'outlet/connect',
                          //inlet: jasmine.objectContaining({ name: 'Inlet' }),
                          //outlet: jasmine.objectContaining({ name: 'Outlet' }),
                          link: jasmine.anything()
                      }) ]
                );
            });

            it('disconnecting outlet from inlet', function() {
                testAction(
                    function() {
                        var patch = Rpd.addPatch('Foo');
                        var firstNode = patch.addNode('spec/empty', 'ConnectOne');
                        var outlet = firstNode.addOutlet('spec/any', 'Outlet');
                        var secondNode = patch.addNode('spec/empty', 'ConnectTwo');
                        var inlet = secondNode.addInlet('spec/any', 'Inlet');
                        var link = outlet.connect(inlet, 'spec/pass');
                        outlet.disconnect(link);
                    },
                    [ jasmine.objectContaining({
                          type: 'outlet/disconnect',
                          //inlet: jasmine.objectContaining({ name: 'Inlet' }),
                          //outlet: jasmine.objectContaining({ name: 'Outlet' }),
                          link: jasmine.objectContaining({ type: 'spec/pass' })
                      }) ]
                );
            });

            it('enabling link', function() {
                testAction(
                    function() {
                        var patch = Rpd.addPatch('Foo');
                        var firstNode = patch.addNode('spec/empty', 'ConnectOne');
                        var outlet = firstNode.addOutlet('spec/any', 'Outlet');
                        var secondNode = patch.addNode('spec/empty', 'ConnectTwo');
                        var inlet = secondNode.addInlet('spec/any', 'Inlet');
                        outlet.connect(inlet, 'spec/pass').enable();
                    },
                    [ jasmine.objectContaining({
                          type: 'link/enable',
                          link: jasmine.objectContaining({
                              type: 'spec/pass',
                              inlet: jasmine.objectContaining({ name: 'Inlet' }),
                              outlet: jasmine.objectContaining({ name: 'Outlet' })
                          })
                      }) ]
                );
            });

            it('disabling link', function() {
                testAction(
                    function() {
                        var patch = Rpd.addPatch('Foo');
                        var firstNode = patch.addNode('spec/empty', 'ConnectOne');
                        var outlet = firstNode.addOutlet('spec/any', 'Outlet');
                        var secondNode = patch.addNode('spec/empty', 'ConnectTwo');
                        var inlet = secondNode.addInlet('spec/any', 'Inlet');
                        var link = outlet.connect(inlet, 'spec/pass');
                        link.enable();
                        link.disable();
                    },
                    [ jasmine.objectContaining({
                          type: 'link/disable',
                          link: jasmine.objectContaining({
                              type: 'spec/pass',
                              inlet: jasmine.objectContaining({ name: 'Inlet' }),
                              outlet: jasmine.objectContaining({ name: 'Outlet' })
                          })
                      }) ]
                );
            });

        });

    }

    testImportExport('json');

});
