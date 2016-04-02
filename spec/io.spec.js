describe('import and export', function() {

    function testImportExport(alias) {

        function testAction(execute, expectations) {
            var finalize = Rpd.export[alias]();

            execute();

            var updateSpy = jasmine.createSpy('update');
            Rpd.events.onValue(updateSpy);

            Rpd.import[alias](finalize());

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

            it('opening patch as a default action', function() {
                testAction(
                    function() { Rpd.addPatch('Open'); },
                    [ jasmine.objectContaining({
                          type: 'patch/open',
                          patch: jasmine.objectContaining({ name: 'Open' })
                      }) ]
                );
            });

            it('opening patch as a default action, but with parent', function() {
                testAction(
                    function() { var parent = Rpd.addClosedPatch('Parent');
                                 Rpd.addPatch('OpenWithParent', null, parent); },
                    [ jasmine.objectContaining({
                          type: 'patch/open',
                          patch: jasmine.objectContaining({ name: 'OpenWithParent' }),
                          parent: jasmine.objectContaining({ name: 'Parent' })
                      }) ]
                );
            });

            it('opening patch', function() {
                testAction(
                    function() { Rpd.addClosedPatch('Enter').open(); },
                    [ jasmine.objectContaining({
                          type: 'patch/open',
                          patch: jasmine.objectContaining({ name: 'Enter' })
                      }) ]
                );
            });

            it('opening patch with a parent', function() {
                testAction(
                    function() { var parent = Rpd.addClosedPatch('Parent');
                                 Rpd.addClosedPatch('OpenWithParent').open(parent); },
                    [ jasmine.objectContaining({
                          type: 'patch/open',
                          patch: jasmine.objectContaining({ name: 'OpenWithParent' }),
                          parent: jasmine.objectContaining({ name: 'Parent' })
                      }) ]
                );
            });

            it('closing patch', function() {
                testAction(
                    function() { Rpd.addPatch('Close').close(); },
                    [ jasmine.objectContaining({
                          type: 'patch/close',
                          patch: jasmine.objectContaining({ name: 'Close' })
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
                          node: jasmine.objectContaining({
                              def: jasmine.objectContaining({ title: 'Projection' }),
                              type: 'spec/empty'
                          })
                      }) ]
                );
            });

            it('moving patch canvas', function() {
                testAction(
                    function() {
                        Rpd.addPatch('MoveCanvas').moveCanvas(100, 110);
                    },
                    [ jasmine.objectContaining({
                          type: 'patch/move-canvas',
                          patch: jasmine.objectContaining({ name: 'MoveCanvas' }),
                          position: [ 100, 110 ]
                      }) ]
                );
            });

            it('resizing patch canvas', function() {
                testAction(
                    function() {
                        Rpd.addPatch('ResizeCanvas').resizeCanvas(200, 420);
                    },
                    [ jasmine.objectContaining({
                          type: 'patch/resize-canvas',
                          patch: jasmine.objectContaining({ name: 'ResizeCanvas' }),
                          size: [ 200, 420 ]
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
                          node: jasmine.objectContaining({
                              def: jasmine.objectContaining({ title: 'Foo' }),
                              type: 'spec/empty'
                          })
                      }) ]
                );
            });

            xit('adding completely configured node');

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
                          node: jasmine.objectContaining({
                              def: jasmine.objectContaining({ title: 'Foo' }),
                              type: 'spec/empty'
                          })
                      }) ]
                );
            });

            it('turning node on', function() {
                testAction(
                    function() {
                        Rpd.addPatch('TurnNodeOn').addNode('spec/empty', 'Foo')
                                                  .turnOn();
                    },
                    [ jasmine.objectContaining({
                          type: 'node/turn-on',
                          node: jasmine.objectContaining({
                              def: jasmine.objectContaining({ title: 'Foo' }),
                              type: 'spec/empty'
                          })
                      }) ]
                );
            });

            it('turning node off', function() {
                testAction(
                    function() {
                        Rpd.addPatch('TurnNodeOff').addNode('spec/empty', 'Foo')
                                                  .turnOff();
                    },
                    [ jasmine.objectContaining({
                          type: 'node/turn-off',
                          node: jasmine.objectContaining({
                              def: jasmine.objectContaining({ title: 'Foo' }),
                              type: 'spec/empty'
                          })
                      }) ]
                );
            });

            it('adding inlet', function() {
                testAction(
                    function() {
                        Rpd.addPatch('Foo').addNode('spec/empty', 'AddInlet')
                                           .addInlet('spec/any', 'Foo');
                    },
                    [ jasmine.objectContaining({
                          type: 'node/add-inlet',
                          node: jasmine.objectContaining({
                                    def: jasmine.objectContaining({ title: 'AddInlet' })
                                }),
                          inlet: jasmine.objectContaining({
                                    alias: 'Foo',
                                    type: 'spec/any'
                                })
                      }) ]
                );
            });

            xit('adding completely configured inlet');

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
                          node: jasmine.objectContaining({
                              def: jasmine.objectContaining({ title: 'RemoveInlet' })
                          }),
                          inlet: jasmine.objectContaining({
                              alias: 'Bar',
                              type: 'spec/any'
                          })
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
                          node: jasmine.objectContaining({
                              def: jasmine.objectContaining({ title: 'AddOutlet' })
                          }),
                          outlet: jasmine.objectContaining({
                              alias: 'Bar',
                              type: 'spec/any'
                          })
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
                          node: jasmine.objectContaining({
                              def: jasmine.objectContaining({ title: 'RemoveOutlet' })
                          }),
                          outlet: jasmine.objectContaining({
                              alias: 'Foo',
                              type: 'spec/any'
                          })
                      }) ]
                );
            });

            xit('adding completely configured outlet');

            it('moving node', function() {
                testAction(
                    function() {
                        Rpd.addPatch('Foo').addNode('spec/empty', 'Move').move(10, 25);
                    },
                    [ jasmine.objectContaining({
                          type: 'node/move',
                          node: jasmine.objectContaining({
                                    def: jasmine.objectContaining({ title: 'Move' })
                                }),
                          position: [ 10, 25 ]
                      }) ]
                );
            });

            it('moving node several times', function() {
                // should save only last move

                var finalize = Rpd.export[alias]();

                Rpd.addPatch('Foo').addNode('spec/empty', 'Move').move(10, 25)
                                                                 .move(20, 12);

                var updateSpy = jasmine.createSpy('update');
                Rpd.events.onValue(updateSpy);

                Rpd.import[alias](finalize());

                expect(updateSpy).not.toHaveBeenCalledWith(jasmine.objectContaining({
                      type: 'node/move',
                      node: jasmine.objectContaining({
                                def: jasmine.objectContaining({ title: 'Move' })
                            }),
                      position: [ 10, 25 ]
                  }));
                expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
                      type: 'node/move',
                      node: jasmine.objectContaining({
                                def: jasmine.objectContaining({ title: 'Move' })
                            }),
                      position: [ 20, 12 ]
                  }));
            });

            it('connecting outlet to inlet', function() {
                testAction(
                    function() {
                        var patch = Rpd.addPatch('Foo');
                        var firstNode = patch.addNode('spec/empty', 'ConnectOne');
                        var outlet = firstNode.addOutlet('spec/any', 'Outlet');
                        var secondNode = patch.addNode('spec/empty', 'ConnectTwo');
                        var inlet = secondNode.addInlet('spec/any', 'Inlet');
                        outlet.connect(inlet);
                    },
                    [ jasmine.objectContaining({
                          type: 'outlet/connect',
                          inlet: jasmine.objectContaining({ alias: 'Inlet' }),
                          outlet: jasmine.objectContaining({ alias: 'Outlet' }),
                          link: jasmine.any(Rpd._.Link)
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
                        var link = outlet.connect(inlet);
                        outlet.disconnect(link);
                    },
                    [ jasmine.objectContaining({
                          type: 'outlet/disconnect',
                          link: jasmine.objectContaining({
                              inlet: jasmine.objectContaining({ alias: 'Inlet' }),
                              outlet: jasmine.objectContaining({ alias: 'Outlet' })
                          })
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
                        outlet.connect(inlet).enable();
                    },
                    [ jasmine.objectContaining({
                          type: 'link/enable',
                          link: jasmine.objectContaining({
                              inlet: jasmine.objectContaining({ alias: 'Inlet' }),
                              outlet: jasmine.objectContaining({ alias: 'Outlet' })
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
                        var link = outlet.connect(inlet);
                        link.enable();
                        link.disable();
                    },
                    [ jasmine.objectContaining({
                          type: 'link/disable',
                          link: jasmine.objectContaining({
                              inlet: jasmine.objectContaining({ alias: 'Inlet' }),
                              outlet: jasmine.objectContaining({ alias: 'Outlet' })
                          })
                      }) ]
                );
            });

            xit('checks if versions of the imported and exported sources match');

            it('handling weird names and titles', function() {
                var WEIRD_SYMBOLS = 'Add"_`>!$#*\'Add @Node_`<!--$`>`#*{%}';

                testAction(
                    function() {
                        var node = Rpd.addPatch(WEIRD_SYMBOLS).addNode('spec/empty', WEIRD_SYMBOLS);
                        node.addInlet('spec/any', 'a', WEIRD_SYMBOLS)
                        node.addOutlet('spec/any', 'a', WEIRD_SYMBOLS);
                    },
                    [ jasmine.objectContaining({
                          type: 'patch/add-node',
                          patch: jasmine.objectContaining({ name: WEIRD_SYMBOLS }),
                          node: jasmine.objectContaining({
                              def: jasmine.objectContaining({ title: WEIRD_SYMBOLS }),
                              type: 'spec/empty'
                          })
                      }), jasmine.objectContaining({
                          type: 'node/add-inlet',
                          node: jasmine.objectContaining({
                              def: jasmine.objectContaining({ title: WEIRD_SYMBOLS }),
                              type: 'spec/empty'
                          }),
                          inlet: jasmine.objectContaining({
                              def: jasmine.objectContaining({ label: WEIRD_SYMBOLS }),
                              type: 'spec/any'
                          })
                      }), jasmine.objectContaining({
                          type: 'node/add-outlet',
                          node: jasmine.objectContaining({
                              def: jasmine.objectContaining({ title: WEIRD_SYMBOLS }),
                              type: 'spec/empty'
                          }),
                          outlet: jasmine.objectContaining({
                              def: jasmine.objectContaining({ label: WEIRD_SYMBOLS }),
                              type: 'spec/any'
                          })
                      }) ]
                );

            });

        });

    }

    testImportExport('json');
    testImportExport('plain');

});
