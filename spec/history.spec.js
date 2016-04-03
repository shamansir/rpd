describe('history', function() {

    function testUndoRedo(execute, undoExpectations, redoExpectations) {
        if (undoExpectations.length !== redoExpectations.length) throw new Error('Undo expectations are unequal in number to redo expectations');

        execute();

        var updateSpy = jasmine.createSpy('update');
        Rpd.events.onValue(updateSpy);

        //updateSpy.calls.reset();
        for (var i = 0; i < undoExpectations.length; i++) {
            updateSpy.calls.reset();
            Rpd.history.undo();
            expect(updateSpy).toHaveBeenCalledWith(undoExpectations[i]);
        }
        //expect(updateSpy.calls.count()).toEqual(undoExpectations.length);

        //updateSpy.calls.reset();
        for (i = 0; i < redoExpectations.length; i++) {
            updateSpy.calls.reset();
            Rpd.history.redo();
            expect(updateSpy).toHaveBeenCalledWith(redoExpectations[i]);
        }
        //expect(updateSpy.calls.count()).toEqual(redoExpectations.length);
    }

    function testMakesNoUndoRedoRecord(execute) {
        execute();

        var updateSpy = jasmine.createSpy('update');
        Rpd.events.onValue(updateSpy);

        // TODO
    }

    beforeEach(function() {
        Rpd.history.reset();
    });

    it('adding patch', function() {
        // no ability to remove patch for the moment
        testMakesNoUndoRedoRecord(
            function() { Rpd.addPatch('Add'); }
        );
    });

    it('opening patch as a default action', function() {
        testUndoRedo(
            function() { Rpd.addPatch('Open'); },
            [ jasmine.objectContaining({
                  type: 'patch/close',
                  patch: jasmine.objectContaining({ name: 'Open' })
              }) ],
            [ jasmine.objectContaining({
                  type: 'patch/open',
                  patch: jasmine.objectContaining({ name: 'Open' })
            }) ]
        );
    });

    it('opening patch as a default action, but with parent', function() {
        testUndoRedo(
            function() { var parent = Rpd.addClosedPatch('Parent');
                         Rpd.addPatch('OpenWithParent', null, parent); },
            [ jasmine.objectContaining({
                  type: 'patch/close',
                  patch: jasmine.objectContaining({ name: 'Parent' })
              }) ],
            [ jasmine.objectContaining({
                  type: 'patch/open',
                  patch: jasmine.objectContaining({ name: 'OpenWithParent' }),
                  parent: jasmine.objectContaining({ name: 'Parent' })
              }) ]
        );
    });

    it('opening patch', function() {
        testUndoRedo(
            function() { Rpd.addClosedPatch('OpenClosed').open(); },
            [ jasmine.objectContaining({
                  type: 'patch/close',
                  patch: jasmine.objectContaining({ name: 'OpenClosed' })
              }) ],
            [ jasmine.objectContaining({
                  type: 'patch/open',
                  patch: jasmine.objectContaining({ name: 'OpenClosed' })
              }) ]
        );
    });

    it('opening patch with a parent', function() {
        testUndoRedo(
            function() { var parent = Rpd.addClosedPatch('Parent');
                         Rpd.addClosedPatch('OpenWithParent').open(parent); },
            [ jasmine.objectContaining({
                  type: 'patch/close',
                  patch: jasmine.objectContaining({ name: 'OpenWithParent' })
              }) ],
            [ jasmine.objectContaining({
                  type: 'patch/open',
                  patch: jasmine.objectContaining({ name: 'OpenWithParent' }),
                  parent: jasmine.objectContaining({ name: 'Parent' })
              }) ]
        );
    });

    it('closing patch', function() {
        testUndoRedo(
            function() { Rpd.addPatch('Close').close(); },
            [ jasmine.objectContaining({
                  type: 'patch/open',
                  patch: jasmine.objectContaining({ name: 'Close' })
              }) ],
            [ jasmine.objectContaining({
                  type: 'patch/close',
                  patch: jasmine.objectContaining({ name: 'Close' })
              }) ]
        );
    });

    it('setting patch inputs', function() {
        // setting inputs should not be recorded as an action
        testMakesNoUndoRedoRecord(
            function() {
                var patch = Rpd.addPatch('Inputs');
                var node = patch.addNode('spec/empty');
                var inputOne = node.addInlet('spec/any', 'a');
                var inputTwo = node.addInlet('spec/any', 'b');
                patch.inputs([ inputOne, inputTwo ]);
            }
        );
    });

    it('setting patch outputs', function() {
        // setting inputs should not be recorded as an action
        testMakesNoUndoRedoRecord(
            function() {
                var patch = Rpd.addPatch('Outputs');
                var node = patch.addNode('spec/empty');
                var outputOne = node.addOutlet('spec/any', 'c');
                var outputTwo = node.addOutlet('spec/any', 'd');
                patch.outputs([ outputOne, outputTwo ]);
            }
        );
    });

    it('projecting patch', function() {
        testMakesNoUndoRedoRecord(
            function() {
                var srcPatch = Rpd.addPatch('Source');
                var trgPatch = Rpd.addPatch('Target');
                var projection = srcPatch.addNode('spec/empty', 'Projection');
                trgPatch.inputs([]);
                trgPatch.outputs([]);
                trgPatch.project(projection);
            }
        );
    });

    it('moving patch canvas', function() {
        testUndoRedo(
            function() {
                Rpd.addPatch('MoveCanvas').moveCanvas(100, 110);
            },
            [ jasmine.objectContaining({
                  type: 'patch/move-canvas',
                  patch: jasmine.objectContaining({ name: 'MoveCanvas' }),
                  position: [ 0, 0 ]
              }) ],
            [ jasmine.objectContaining({
                  type: 'patch/move-canvas',
                  patch: jasmine.objectContaining({ name: 'MoveCanvas' }),
                  position: [ 100, 110 ]
              }) ]
        );
    });

    it('moving patch canvas several times', function() {
        testUndoRedo(
            function() {
                Rpd.addPatch('MoveCanvas').moveCanvas(100, 110);
                Rpd.addPatch('MoveCanvas').moveCanvas(200, 210);
            },
            [ jasmine.objectContaining({
                  type: 'patch/move-canvas',
                  patch: jasmine.objectContaining({ name: 'MoveCanvas' }),
                  position: [ 100, 110 ]
              }),
              jasmine.objectContaining({
                    type: 'patch/move-canvas',
                    patch: jasmine.objectContaining({ name: 'MoveCanvas' }),
                    position: [ 0, 0 ]
              }) ],
            [ jasmine.objectContaining({
                  type: 'patch/move-canvas',
                  patch: jasmine.objectContaining({ name: 'MoveCanvas' }),
                  position: [ 100, 110 ]
              }),
              jasmine.objectContaining({
                  type: 'patch/move-canvas',
                  patch: jasmine.objectContaining({ name: 'MoveCanvas' }),
                  position: [ 200, 210 ]
              }) ]
        );
    });

    it('resizing patch canvas', function() {
        testUndoRedo(
            function() {
                Rpd.addPatch('ResizeCanvas').resizeCanvas(200, 420);
            },
            [ jasmine.objectContaining({
                  type: 'patch/resize-canvas',
                  patch: jasmine.objectContaining({ name: 'ResizeCanvas' }),
                  size: [ -1, -1 ]
              }) ]
            [ jasmine.objectContaining({
                  type: 'patch/resize-canvas',
                  patch: jasmine.objectContaining({ name: 'ResizeCanvas' }),
                  size: [ 200, 420 ]
              }) ]
        );
    });

    it('resizing patch canvas several times', function() {
        testUndoRedo(
            function() {
                Rpd.addPatch('ResizeCanvas').resizeCanvas(100, 120);
                Rpd.addPatch('ResizeCanvas').resizeCanvas(200, 420);
            },
            [ jasmine.objectContaining({
                  type: 'patch/resize-canvas',
                  patch: jasmine.objectContaining({ name: 'ResizeCanvas' }),
                  size: [ 100, 120 ]
              }),
              jasmine.objectContaining({
                  type: 'patch/resize-canvas',
                  patch: jasmine.objectContaining({ name: 'ResizeCanvas' }),
                  size: [ -1, -1 ]
              }) ]
            [ jasmine.objectContaining({
                  type: 'patch/resize-canvas',
                  patch: jasmine.objectContaining({ name: 'ResizeCanvas' }),
                  size: [ 100, 120 ]
              }),
              jasmine.objectContaining({
                  type: 'patch/resize-canvas',
                  patch: jasmine.objectContaining({ name: 'ResizeCanvas' }),
                  size: [ 200, 420 ]
              }) ]
        );
    });

    it('adding node', function() {
        testUndoRedo(
            function() {
                Rpd.addPatch('AddNode').addNode('spec/empty', 'Foo');
            },
            [ jasmine.objectContaining({
                  type: 'patch/remove-node',
                  patch: jasmine.objectContaining({ name: 'AddNode' }),
                  node: jasmine.objectContaining({
                      def: jasmine.objectContaining({ title: 'Foo' }),
                      type: 'spec/empty'
                  })
              }) ],
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
        testUndoRedo(
            function() {
                var patch = Rpd.addPatch('RemoveNode');
                var node = patch.addNode('spec/empty', 'Foo');
                patch.removeNode(node);
            },
            [ jasmine.objectContaining({
                  type: 'patch/add-node',
                  patch: jasmine.objectContaining({ name: 'RemoveNode' }),
                  node: jasmine.objectContaining({
                      def: jasmine.objectContaining({ title: 'Foo' }),
                      type: 'spec/empty'
                  })
              }) ],
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
        testUndoRedo(
            function() {
                Rpd.addPatch('TurnNodeOn').addNode('spec/empty', 'Foo')
                                          .turnOn();
            },
            [ jasmine.objectContaining({
                  type: 'node/turn-off',
                  node: jasmine.objectContaining({
                      def: jasmine.objectContaining({ title: 'Foo' }),
                      type: 'spec/empty'
                  })
              }) ],
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
        testUndoRedo(
            function() {
                Rpd.addPatch('TurnNodeOff').addNode('spec/empty', 'Foo')
                                          .turnOff();
            },
            [ jasmine.objectContaining({
                  type: 'node/turn-on',
                  node: jasmine.objectContaining({
                      def: jasmine.objectContaining({ title: 'Foo' }),
                      type: 'spec/empty'
                  })
              }) ],
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
        testUndoRedo(
            function() {
                Rpd.addPatch('Foo').addNode('spec/empty', 'AddInlet')
                                   .addInlet('spec/any', 'Foo');
            },
            [ jasmine.objectContaining({
                  type: 'node/remove-inlet',
                  node: jasmine.objectContaining({
                            def: jasmine.objectContaining({ title: 'AddInlet' })
                        }),
                  inlet: jasmine.objectContaining({
                            alias: 'Foo',
                            type: 'spec/any'
                        })
              }) ],
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
        testUndoRedo(
            function() {
                var patch = Rpd.addPatch('Foo');
                var node = patch.addNode('spec/empty', 'RemoveInlet');
                var inlet = node.addInlet('spec/any', 'Bar');
                node.removeInlet(inlet);
            },
            [ jasmine.objectContaining({
                  type: 'node/add-inlet',
                  node: jasmine.objectContaining({
                      def: jasmine.objectContaining({ title: 'RemoveInlet' })
                  }),
                  inlet: jasmine.objectContaining({
                      alias: 'Bar',
                      type: 'spec/any'
                  })
              }) ],
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
        testUndoRedo(
            function() {
                Rpd.addPatch('Foo').addNode('spec/empty', 'AddOutlet').addOutlet('spec/any', 'Bar');
            },
            [ jasmine.objectContaining({
                  type: 'node/remove-outlet',
                  node: jasmine.objectContaining({
                      def: jasmine.objectContaining({ title: 'AddOutlet' })
                  }),
                  outlet: jasmine.objectContaining({
                      alias: 'Bar',
                      type: 'spec/any'
                  })
              }) ],
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
        testUndoRedo(
            function() {
                var patch = Rpd.addPatch('Foo');
                var node = patch.addNode('spec/empty', 'RemoveOutlet');
                var outlet = node.addOutlet('spec/any', 'Foo');
                node.removeOutlet(outlet);
            },
            [ jasmine.objectContaining({
                  type: 'node/add-outlet',
                  node: jasmine.objectContaining({
                      def: jasmine.objectContaining({ title: 'RemoveOutlet' })
                  }),
                  outlet: jasmine.objectContaining({
                      alias: 'Foo',
                      type: 'spec/any'
                  })
              }) ],
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
        testUndoRedo(
            function() {
                Rpd.addPatch('Foo').addNode('spec/empty', 'Move').move(10, 25);
            },
            [ jasmine.objectContaining({
                  type: 'node/move',
                  node: jasmine.objectContaining({
                            def: jasmine.objectContaining({ title: 'Move' })
                        }),
                  position: [ -1, -1 ]
              }) ],
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
        testUndoRedo(
            function() {
                Rpd.addPatch('Foo').addNode('spec/empty', 'Move').move(100, 220);
                                                                 .move(10, 25);
            },
            [ jasmine.objectContaining({
                  type: 'node/move',
                  node: jasmine.objectContaining({
                            def: jasmine.objectContaining({ title: 'Move' })
                        }),
                  position: [ 10, 25 ]
              }),
              jasmine.objectContaining({
                  type: 'node/move',
                  node: jasmine.objectContaining({
                            def: jasmine.objectContaining({ title: 'Move' })
                        }),
                  position: [ -1, -1 ]
              }) ],
            [ jasmine.objectContaining({
                  type: 'node/move',
                  node: jasmine.objectContaining({
                            def: jasmine.objectContaining({ title: 'Move' })
                        }),
                  position: [ 110, 220 ]
              }),
              jasmine.objectContaining({
                  type: 'node/move',
                  node: jasmine.objectContaining({
                            def: jasmine.objectContaining({ title: 'Move' })
                        }),
                  position: [ 10, 25 ]
                }) ]
        );
    });

    it('connecting outlet to inlet', function() {
        testUndoRedo(
            function() {
                var patch = Rpd.addPatch('Foo');
                var firstNode = patch.addNode('spec/empty', 'ConnectOne');
                var outlet = firstNode.addOutlet('spec/any', 'Outlet');
                var secondNode = patch.addNode('spec/empty', 'ConnectTwo');
                var inlet = secondNode.addInlet('spec/any', 'Inlet');
                outlet.connect(inlet);
            },
            [ jasmine.objectContaining({
                  type: 'outlet/disconnect',
                  inlet: jasmine.objectContaining({ alias: 'Inlet' }),
                  outlet: jasmine.objectContaining({ alias: 'Outlet' }),
                  link: jasmine.any(Rpd._.Link)
              }) ],
            [ jasmine.objectContaining({
                  type: 'outlet/connect',
                  inlet: jasmine.objectContaining({ alias: 'Inlet' }),
                  outlet: jasmine.objectContaining({ alias: 'Outlet' }),
                  link: jasmine.any(Rpd._.Link)
              }) ]
        );
    });

    it('disconnecting outlet from inlet', function() {
        testUndoRedo(
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
                  type: 'outlet/connect',
                  link: jasmine.objectContaining({
                      inlet: jasmine.objectContaining({ alias: 'Inlet' }),
                      outlet: jasmine.objectContaining({ alias: 'Outlet' })
                  })
              }) ],
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
        testUndoRedo(
            function() {
                var patch = Rpd.addPatch('Foo');
                var firstNode = patch.addNode('spec/empty', 'ConnectOne');
                var outlet = firstNode.addOutlet('spec/any', 'Outlet');
                var secondNode = patch.addNode('spec/empty', 'ConnectTwo');
                var inlet = secondNode.addInlet('spec/any', 'Inlet');
                outlet.connect(inlet).enable();
            },
            [ jasmine.objectContaining({
                  type: 'link/disable',
                  link: jasmine.objectContaining({
                      inlet: jasmine.objectContaining({ alias: 'Inlet' }),
                      outlet: jasmine.objectContaining({ alias: 'Outlet' })
                  })
              }) ],
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
        testUndoRedo(
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
                  type: 'link/enable',
                  link: jasmine.objectContaining({
                      inlet: jasmine.objectContaining({ alias: 'Inlet' }),
                      outlet: jasmine.objectContaining({ alias: 'Outlet' })
                  })
              }) ],
            [ jasmine.objectContaining({
                  type: 'link/disable',
                  link: jasmine.objectContaining({
                      inlet: jasmine.objectContaining({ alias: 'Inlet' }),
                      outlet: jasmine.objectContaining({ alias: 'Outlet' })
                  })
              }) ]
        );
    });

    it('several things in order', function() {

        testUndoRedo(
            function() {
                var node = Rpd.addPatch('Patch').addNode('spec/empty', 'Node');
                node.addInlet('spec/any', 'a', 'Inlet')
                node.addOutlet('spec/any', 'a', 'Outlet');
            },
            [ jasmine.objectContaining({
                type: 'node/remove-outlet',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Node' }),
                    type: 'spec/empty'
                }),
                outlet: jasmine.objectContaining({
                    def: jasmine.objectContaining({ label: 'Outlet' }),
                    type: 'spec/any'
                })
              }), jasmine.objectContaining({
                  type: 'node/remove-inlet',
                  node: jasmine.objectContaining({
                      def: jasmine.objectContaining({ title: 'Node' }),
                      type: 'spec/empty'
                  }),
                  inlet: jasmine.objectContaining({
                      def: jasmine.objectContaining({ label: 'Inlet' }),
                      type: 'spec/any'
                  })
              }), jasmine.objectContaining({
                  type: 'patch/remove-node',
                  patch: jasmine.objectContaining({ name: 'Patch' }),
                  node: jasmine.objectContaining({
                      def: jasmine.objectContaining({ title: 'Node' }),
                      type: 'spec/empty'
                  })
              }) ],
            [ jasmine.objectContaining({
                  type: 'patch/add-node',
                  patch: jasmine.objectContaining({ name: 'Patch' }),
                  node: jasmine.objectContaining({
                      def: jasmine.objectContaining({ title: 'Node' }),
                      type: 'spec/empty'
                  })
              }), jasmine.objectContaining({
                  type: 'node/add-inlet',
                  node: jasmine.objectContaining({
                      def: jasmine.objectContaining({ title: 'Node' }),
                      type: 'spec/empty'
                  }),
                  inlet: jasmine.objectContaining({
                      def: jasmine.objectContaining({ label: 'Inlet' }),
                      type: 'spec/any'
                  })
              }), jasmine.objectContaining({
                  type: 'node/add-outlet',
                  node: jasmine.objectContaining({
                      def: jasmine.objectContaining({ title: 'Node' }),
                      type: 'spec/empty'
                  }),
                  outlet: jasmine.objectContaining({
                      def: jasmine.objectContaining({ label: 'Outlet' }),
                      type: 'spec/any'
                  })
              }) ]
        );

    });

});
