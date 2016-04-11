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
        var prepareResult = prepare();

        var undoRecordsBefore = Rpd.history.getUndoRecordCount();
        var redoRecordsBefore = Rpd.history.getRedoRecordCount();

        execute(prepareResult);

        expect(Rpd.history.getUndoRecordCount()).toEqual(undoRecordsBefore);
        expect(Rpd.history.getRedoRecordCount()).toEqual(redoRecordsBefore);
    }

    beforeEach(function() {
        Rpd.history.reset();
    });

    xit('undo and redo work only when History is enabled', function() {

    });

    it('adding patch', function() {
        // adding a patch should not be recorded as an action
        testMakesNoUndoRedoRecord(
            function() {},
            function() { Rpd.addPatch('Add'); }
        );
    });

    it('opening patch', function() {
        // opening a patch should not be recorded as an action
        testMakesNoUndoRedoRecord(
            function() { return Rpd.addClosedPatch('OpenClosed'); },
            function(closedPatch) { closedPatch.open(); }
        );
    });

    it('closing patch', function() {
        // closing a patch should not be recorded as an action
        testMakesNoUndoRedoRecord(
            function() { return Rpd.addClosedPatch('OpenClosed'); },
            function(openedPatch) { openedPatch.close(); }
        );
    });

    it('setting patch inputs', function() {
        // setting patch inputs should not be recorded as an action
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
        // setting patch outputs should not be recorded as an action
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
        // projecting a patch should not be recorded as an action
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
        // moving a patch canvas should not be recorded as an action
        testMakesNoUndoRedoRecord(
            function() {
                var patch = Rpd.addPatch('MoveCanvas');
                patch.addNode('spec/empty', 'Node');
                return patch;
            },
            function(patch) {
                patch.moveCanvas(100, 110);
            }
        );
    });

    it('resizing patch canvas', function() {
        // resizing a patch canvas should not be recorded as an action
        testMakesNoUndoRedoRecord(
            function() {
                var patch = Rpd.addPatch('ResizeCanvas');
                patch.addNode('spec/empty', 'Node');
                return patch;
            },
            function(patch) {
                patch.resizeCanvas(100, 110);
            }
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
        testMakesNoUndoRedoRecord(function() {
            return Rpd.addPatch('TurnNodeOn').addNode('spec/empty', 'Foo');
        },
        function(node) {
            node.turnOn();
        });
    });

    it('turning node off', function() {
        testMakesNoUndoRedoRecord(function() {
            return Rpd.addPatch('TurnNodeOff').addNode('spec/empty', 'Foo');
        },
        function(node) {
            node.turnOff();
        });
    });

    it('adding inlet', function() {
        testMakesNoUndoRedoRecord(function() {
            return Rpd.addPatch('Foo').addNode('spec/empty', 'AddInlet');
        },
        function(node) {
            node.addInlet('spec/any', 'Foo');
        });
    });

    it('removing inlet', function() {
        var node, inlet;
        testMakesNoUndoRedoRecord(function() {
            var patch = Rpd.addPatch('Foo');
            node = patch.addNode('spec/empty', 'RemoveInlet');
            inlet = node.addInlet('spec/any', 'Bar');
        },
        function() {
            node.removeInlet(inlet);
        });
    });

    it('adding outlet', function() {
        testMakesNoUndoRedoRecord(function() {
            return Rpd.addPatch('Foo').addNode('spec/empty', 'AddOutlet');
        },
        function(node) {
            node.addOutlet('spec/any', 'Foo');
        });
    });

    it('removing outlet', function() {
        var node, outlet;
        testMakesNoUndoRedoRecord(function() {
            var patch = Rpd.addPatch('Foo');
            node = patch.addNode('spec/empty', 'RemoveOutlet');
            outlet = node.addOutlet('spec/any', 'Bar');
        },
        function() {
            node.removeOutlet(outlet);
        });
    });

    it('moving node', function() {
        testMakesNoUndoRedoRecord(function() {
            return Rpd.addPatch('Foo').addNode('spec/empty', 'Move');
        },
        function(node) {
            node.move(10, 25);
        });
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
                outlet.connect(inlet).disable().enable();
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
                var patch = Rpd.addPatch('Foo').close();
                var firstNode = patch.addNode('spec/empty', 'ConnectOne');
                var outlet = firstNode.addOutlet('spec/any', 'Outlet');
                var secondNode = patch.addNode('spec/empty', 'ConnectTwo');
                var inlet = secondNode.addInlet('spec/any', 'Inlet');
                patch.open();
                outlet.connect(inlet).disable();
            }, // ------ Undo ------
            [ jasmine.objectContaining({
                  type: 'link/enable'
              }),
              jasmine.objectContaining({
                  type: 'outlet/disconnect'
              }),
              jasmine.objectContaining({
                  type: 'patch/close',
              }),
              jasmine.objectContaining({
                  type: 'patch/open',
              }) ], // ------ Redo ------
            [ jasmine.objectContaining({
                  type: 'patch/close'
              }),
              jasmine.objectContaining({
                  type: 'patch/open'
              }),
              jasmine.objectContaining({
                  type: 'outlet/connect'
              }),
              jasmine.objectContaining({
                  type: 'link/disable'
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
