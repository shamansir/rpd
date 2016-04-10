describe('history', function() {

    function testUndoRedo(execute, undoExpectations, redoExpectations) {
        //if (undoExpectations.length !== redoExpectations.length) throw new Error('Undo expectations are unequal in number to redo expectations');

        execute();

        var updateSpy = jasmine.createSpy('update');
        Rpd.events.onValue(updateSpy);

        //updateSpy.calls.reset();
        undoExpectations.forEach(function(undoExpectation) {
            updateSpy.calls.reset();
            Rpd.history.undo();
            expect(updateSpy).toHaveBeenCalledWith(undoExpectation);
        });
        //expect(updateSpy.calls.count()).toEqual(undoExpectations.length);

        //updateSpy.calls.reset();
        redoExpectations.forEach(function(redoExpectation) {
            updateSpy.calls.reset();
            Rpd.history.redo();
            expect(updateSpy).toHaveBeenCalledWith(redoExpectation);
        });
        //expect(updateSpy.calls.count()).toEqual(redoExpectations.length);

        Rpd.events.offValue(updateSpy);
    }

    function testMakesNoUndoRedoRecord(prepare, execute) {
        prepare();

        var undoRecordsBefore = Rpd.history.getUndoRecordCount();
        var redoRecordsBefore = Rpd.history.getRedoRecordCount();

        execute();

        expect(Rpd.history.getUndoRecordCount()).toEqual(undoRecordsBefore);
        expect(Rpd.history.getRedoRecordCount()).toEqual(redoRecordsBefore);
    }

    beforeEach(function() {
        Rpd.history.reset();
    });

    it('adding patch', function() {
        // no ability to remove patch for the moment
        testMakesNoUndoRedoRecord(
            function() {},
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
        var patch, node, inputOne, inputTwo;
        testMakesNoUndoRedoRecord(
            function() {
                patch = Rpd.addPatch('Inputs');
                node = patch.addNode('spec/empty');
                inputOne = node.addInlet('spec/any', 'a');
                inputTwo = node.addInlet('spec/any', 'b');
            },
            function() {
                patch.inputs([ inputOne, inputTwo ]);
            }
        );
    });

    it('setting patch outputs', function() {
        // setting inputs should not be recorded as an action
        var patch, node, outputOne, outputTwo;
        testMakesNoUndoRedoRecord(
            function() {
                patch = Rpd.addPatch('Outputs');
                node = patch.addNode('spec/empty');
                outputOne = node.addOutlet('spec/any', 'c');
                outputTwo = node.addOutlet('spec/any', 'd');
            },
            function() {
                patch.outputs([ outputOne, outputTwo ]);
            }
        );
    });

    it('projecting patch', function() {
        var srcPatch, trgPatch, projection;
        testMakesNoUndoRedoRecord(
            function() {
                srcPatch = Rpd.addPatch('Source');
                trgPatch = Rpd.addPatch('Target');
                projection = srcPatch.addNode('spec/empty', 'Projection');
                trgPatch.inputs([]);
                trgPatch.outputs([]);
            },
            function() {
                trgPatch.project(projection);
            }
        );
    });

    it('moving patch canvas', function() {
        testUndoRedo(
            function() {
                var patch = Rpd.addPatch('MoveCanvas');
                patch.addNode('spec/empty', 'Node');
                patch.moveCanvas(100, 110);
            },
            [ jasmine.objectContaining({
                  type: 'patch/remove-node' }) ], // not undoable, so undoes adding a node
            [ jasmine.objectContaining({
                  type: 'patch/add-node' }),
              jasmine.objectContaining({
                  type: 'patch/move-canvas',
                  patch: jasmine.objectContaining({ name: 'MoveCanvas' }),
                  position: [ 100, 110 ]
              }) ]
        );
    });

    it('moving patch canvas several times', function() {
        testUndoRedo(
            function() {
                var patch = Rpd.addPatch('MoveCanvas');
                patch.addNode('spec/empty', 'Node');
                patch.moveCanvas(100, 110)
                patch.moveCanvas(200, 210);
            }, // ------ Undo ------
            [ jasmine.objectContaining({
                  type: 'patch/move-canvas',
                  patch: jasmine.objectContaining({ name: 'MoveCanvas' }),
                  position: [ 100, 110 ]
              }),
              jasmine.objectContaining({
                    type: 'patch/remove-node' }) ], // not undoable anymore, so undoes adding a node
               // ------ Redo ------
            [ jasmine.objectContaining({
                  type: 'patch/add-node' }),
              jasmine.objectContaining({
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
                var patch = Rpd.addPatch('ResizeCanvas');
                patch.addNode('spec/empty', 'Node');
                patch.resizeCanvas(200, 420);
            },
            [ jasmine.objectContaining({
                  type: 'patch/remove-node' }) ], // not undoable anymore, so undoes adding a node
            [ jasmine.objectContaining({
                  type: 'patch/add-node' }),
              jasmine.objectContaining({
                  type: 'patch/resize-canvas',
                  patch: jasmine.objectContaining({ name: 'ResizeCanvas' }),
                  size: [ 200, 420 ]
              }) ]
        );
    });

    it('resizing patch canvas several times', function() {
        testUndoRedo(
            function() {
                var patch = Rpd.addPatch('ResizeCanvas');
                patch.addNode('spec/empty', 'Node');
                patch.resizeCanvas(100, 120);
                patch.resizeCanvas(200, 420);
            }, // ------ Undo ------
            [ jasmine.objectContaining({
                  type: 'patch/resize-canvas',
                  patch: jasmine.objectContaining({ name: 'ResizeCanvas' }),
                  size: [ 100, 120 ]
              }),
              jasmine.objectContaining({
                   type: 'patch/remove-node' }) ], // not undoable anymore, so undoes adding a node
               // ------ Redo ------
            [ jasmine.objectContaining({
                  type: 'patch/add-node' }),
              jasmine.objectContaining({
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
        var node;
        testMakesNoUndoRedoRecord(function() {
            node = Rpd.addPatch('TurnNodeOn').addNode('spec/empty', 'Foo');
        },
        function() {
            node.turnOn();
        });
    });

    it('turning node off', function() {
        var node;
        testMakesNoUndoRedoRecord(function() {
            node = Rpd.addPatch('TurnNodeOn').addNode('spec/empty', 'Foo');
        },
        function() {
            node.turnOff();
        });
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

        Rpd.addPatch('Foo').addNode('spec/empty', 'Move').move(10, 25);

        var updateSpy = jasmine.createSpy('update');
        Rpd.events.onValue(updateSpy);

        Rpd.history.undo();

        // undoes only adding the node

        expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'patch/remove-node',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Move' })
                })
            }));

        updateSpy.calls.reset();

        Rpd.history.redo();

        // redoes both adding and moving node at one step

        expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'patch/add-node',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Move' })
                })
            }));
        expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'node/move',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Move' })
                }),
                position: [ 10, 25 ]
            }));

        Rpd.events.offValue(updateSpy);

    });

    it('moving node after adding an inlet', function() {

        var node = Rpd.addPatch('Foo').addNode('spec/empty', 'Move');
        node.addInlet('spec/any', 'i');
        node.move(10, 25);

        var updateSpy = jasmine.createSpy('update');
        Rpd.events.onValue(updateSpy);

        Rpd.history.undo();

        // undoes adding the inlet

        expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'node/add-inlet',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Move' })
                })
            }));

        updateSpy.calls.reset();

        Rpd.history.redo();

        // redoes both adding an inlet and moving node at one step

        expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'patch/add-inlet',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Move' })
                })
            }));
        expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'node/move',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Move' })
                }),
                position: [ 10, 25 ]
            }));

        Rpd.events.offValue(updateSpy);

    });

    it('moving node several times', function() {

        Rpd.addPatch('Foo').addNode('spec/empty', 'Move').move(100, 220)
                                                         .move(10, 25);

        var updateSpy = jasmine.createSpy('update');
        Rpd.events.onValue(updateSpy);

        Rpd.history.undo();

        // should undo last move first

        expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'node/move',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Move' })
                }),
                position: [ 100, 220 ]
            }));

        updateSpy.calls.reset();

        Rpd.history.undo();

        // should remove the node with second undo call

        expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'patch/remove-node',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Move' })
                })
            }));

        updateSpy.calls.reset();

        Rpd.history.redo();

        // should redo both adding a node and first move together at one step

        expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'patch/add-node',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Move' })
                })
            }));
        expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'node/move',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Move' })
                }),
                position: [ 100, 220 ]
            }));

        updateSpy.calls.reset();

        Rpd.history.redo();

        // then should redo second move

        expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
                type: 'node/move',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Move' })
                }),
                position: [ 10, 25 ]
            }));

        Rpd.events.offValue(updateSpy);

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
                  link: jasmine.objectContaining({
                      inlet: jasmine.objectContaining({ alias: 'Inlet' }),
                      outlet: jasmine.objectContaining({ alias: 'Outlet' })
                  })
              }) ],
            [ jasmine.objectContaining({
                  type: 'outlet/connect',
                  inlet: jasmine.objectContaining({ alias: 'Inlet' }),
                  link: jasmine.objectContaining({
                      inlet: jasmine.objectContaining({ alias: 'Inlet' }),
                      outlet: jasmine.objectContaining({ alias: 'Outlet' })
                  })
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

    xit('sending value', function() {});

    it('several things in order', function() {

        testUndoRedo(
            function() {
                var node = Rpd.addPatch('Patch').addNode('spec/empty', 'Node');
                node.addInlet('spec/any', 'i', 'Inlet')
                node.addOutlet('spec/any', 'o', 'Outlet');
            }, // ------ Undo ------
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
              }) ], // ------ Redo ------
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

    xit('several things in order, but not reaching the bottom of the action stack', function() {

        testUndoRedo(
            function() {
                var node = Rpd.addPatch('Patch').addNode('spec/empty', 'Node');
                node.addInlet('spec/any', 'i', 'Inlet');
                node.addOutlet('spec/any', 'o', 'Outlet');
            }, // ------ Undo ------
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
              }) ], // ------ Redo ------
            [ jasmine.objectContaining({
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

    describe('correctly restores context', function() {

        it('for patches and nodes', function() {

            testUndoRedo(function() {

                var firstPatch = Rpd.addPatch('First');
                var secondPatch = Rpd.addPatch('Second');
                firstPatch.addNode('spec/empty', 'Node');

            }, // ------ Undo ------
            [ jasmine.objectContaining({
                type: 'patch/remove-node',
                patch: jasmine.objectContaining({ name: 'First' })
              }) ], // ------ Redo ------
            [ jasmine.objectContaining({
                type: 'patch/add-node',
                patch: jasmine.objectContaining({ name: 'First' })
              }) ] );

        });

        it('for nodes and inlets', function() {

            testUndoRedo(function() {

                var patch = Rpd.addPatch('Patch');
                var firstNode = patch.addNode('spec/empty', 'First');
                var secondNode = patch.addNode('spec/empty', 'Second');
                firstNode.addInlet('spec/any', 'i', 'Inlet');

            }, // ------ Undo ------
            [ jasmine.objectContaining({
                type: 'node/remove-inlet',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'First' })
                })
              }),
              jasmine.objectContaining({
                type: 'patch/remove-node',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Second' })
                })
              }),
              jasmine.objectContaining({
                type: 'patch/remove-node',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'First' })
                })
              }),
            ], // ------ Redo ------
            [ jasmine.objectContaining({
                type: 'patch/add-node',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'First' })
                })
              }),
              jasmine.objectContaining({
                type: 'patch/add-node',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Second' })
                })
              }),
              jasmine.objectContaining({
                type: 'node/add-inlet',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'First' })
                })
              }) ] );

        });

        it('for nodes and outlets', function() {

            testUndoRedo(function() {

                var patch = Rpd.addPatch('Patch');
                var firstNode = patch.addNode('spec/empty', 'First');
                var secondNode = patch.addNode('spec/empty', 'Second');
                firstNode.addOutlet('spec/any', 'o', 'Outlet');

            }, // ------ Undo ------
            [ jasmine.objectContaining({
                type: 'node/remove-outlet',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'First' })
                })
              }),
              jasmine.objectContaining({
                type: 'patch/remove-node',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Second' })
                })
              }),
              jasmine.objectContaining({
                type: 'patch/remove-node',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'First' })
                })
              }),
            ], // ------ Redo ------
            [ jasmine.objectContaining({
                type: 'patch/add-node',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'First' })
                })
              }),
              jasmine.objectContaining({
                type: 'patch/add-node',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'Second' })
                })
              }),
              jasmine.objectContaining({
                type: 'node/add-outlet',
                node: jasmine.objectContaining({
                    def: jasmine.objectContaining({ title: 'First' })
                })
              }) ] );

        });

        it('for connections', function() {

            testUndoRedo(function() {

                var patch = Rpd.addPatch('Patch');
                var outNode = patch.addNode('spec/empty', 'Out');
                var inNode = patch.addNode('spec/empty', 'In');
                var firstOutlet = outNode.addOutlet('spec/any', 'first', 'First');
                var secondOutlet = outNode.addOutlet('spec/any', 'second', 'Second');
                var firstInlet = inNode.addInlet('spec/any', 'first', 'First');
                var secondInlet = inNode.addInlet('spec/any', 'second', 'Second');
                firstOutlet.connect(firstInlet);

            }, // ------ Undo ------
            [ jasmine.objectContaining({
                type: 'outlet/disconnect',
                link: jasmine.objectContaining({
                    outlet: jasmine.objectContaining({
                        def: jasmine.objectContaining({ label: 'First' })
                    }),
                    inlet: jasmine.objectContaining({
                        def: jasmine.objectContaining({ label: 'First' })
                    })
                })
              }),
              jasmine.objectContaining({
                type: 'node/remove-inlet',
                inlet: jasmine.objectContaining({
                    def: jasmine.objectContaining({ label: 'Second' })
                })
              }),
              jasmine.objectContaining({
                type: 'node/remove-inlet',
                inlet: jasmine.objectContaining({
                    def: jasmine.objectContaining({ label: 'First' })
                })
              }),
              jasmine.objectContaining({
                type: 'node/remove-outlet',
                outlet: jasmine.objectContaining({
                    def: jasmine.objectContaining({ label: 'Second' })
                })
              }),
              jasmine.objectContaining({
                type: 'node/remove-outlet',
                outlet: jasmine.objectContaining({
                    def: jasmine.objectContaining({ label: 'First' })
                })
              })
            ], // ------ Redo ------
            [ jasmine.objectContaining({
                type: 'node/add-outlet',
                outlet: jasmine.objectContaining({
                    def: jasmine.objectContaining({ label: 'First' })
                })
              }),
              jasmine.objectContaining({
                type: 'node/add-outlet',
                outlet: jasmine.objectContaining({
                    def: jasmine.objectContaining({ label: 'Second' })
                })
              }),
              jasmine.objectContaining({
                type: 'node/add-inlet',
                inlet: jasmine.objectContaining({
                    def: jasmine.objectContaining({ label: 'First' })
                })
              }),
              jasmine.objectContaining({
                type: 'node/add-inlet',
                inlet: jasmine.objectContaining({
                   def: jasmine.objectContaining({ label: 'Second' })
                })
              }),
              jasmine.objectContaining({
                type: 'outlet/connect',
                outlet: jasmine.objectContaining({
                    def: jasmine.objectContaining({ label: 'First' })
                }),
                inlet: jasmine.objectContaining({
                    def: jasmine.objectContaining({ label: 'First' })
                })
              }) ] );

        });

    });

});
