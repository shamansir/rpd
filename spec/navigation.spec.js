describe('navigation', function() {

    var networkUpdatesSpy;
    var networkErrorSpy;
    var changePathSpy;

    var SEPARATOR = ':';

    beforeEach(function() {
        networkUpdatesSpy = jasmine.createSpy('network-updates');
        Rpd.events.onValue(networkUpdatesSpy);
        //changePathSpy = jasmine.createSpy('change-path', Rpd.navigation.changePath).and.callThrough();
        changePathSpy = spyOn(Rpd.navigation, 'changePath').and.callThrough();
        networkErrorSpy = jasmine.createSpy('network-errors');
        Rpd.events.onError(networkErrorSpy);
        Rpd.navigation.enable();
    });

    afterEach(function() {
        Rpd.navigation.disable();
        Rpd.events.offValue(networkUpdatesSpy);
    });

    describe('handling empty path', function() {

        it('opens first added patch', function() {
            var firstPatch = Rpd.addPatch('first');

            var secondPatch = Rpd.addPatch('second');

            networkUpdatesSpy.calls.reset();
            changePathSpy.calls.reset();

            Rpd.navigation.handlePath('');

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: firstPatch
                }));

            expect(changePathSpy).toHaveBeenCalledWith(firstPatch.id);
            expect(changePathSpy).toHaveBeenCalledOnce();
        });

        it('opens first added patch even if it was closed before', function() {
            var firstPatch = Rpd.addPatch('first');
            firstPatch.close();

            var secondPatch = Rpd.addPatch('second');

            networkUpdatesSpy.calls.reset();
            changePathSpy.calls.reset();

            Rpd.navigation.handlePath('');

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: firstPatch
                }));

            expect(changePathSpy).toHaveBeenCalledWith(firstPatch.id);
        });

        it('closes all other patches', function() {
            var firstPatch = Rpd.addPatch('first');

            var secondPatch = Rpd.addPatch('second');
            var thirdPatch = Rpd.addClosedPatch('third');
            thirdPatch.open();

            networkUpdatesSpy.calls.reset();
            changePathSpy.calls.reset();

            Rpd.navigation.handlePath('');

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/close',
                    patch: secondPatch
                }));
            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/close',
                    patch: thirdPatch
                }));

            expect(changePathSpy).toHaveBeenCalledWith(firstPatch.id);

        });

    });

    describe('when path contains wrong ID or gibberish', function() {

        var GIBBER = 'gibber';

        it('fires an error, but opens first added patch', function() {
            var firstPatch = Rpd.addPatch('first');

            var secondPatch = Rpd.addPatch('second');

            networkUpdatesSpy.calls.reset();
            changePathSpy.calls.reset();

            Rpd.navigation.handlePath(GIBBER);

            expect(networkErrorSpy).toHaveBeenCalled();

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: firstPatch
                }));

            expect(changePathSpy).toHaveBeenCalledWith('');
        });

        it('fires an error, opens first added patch even if it was closed before', function() {
            var firstPatch = Rpd.addPatch('first');
            firstPatch.close();

            var secondPatch = Rpd.addPatch('second');

            networkUpdatesSpy.calls.reset();
            changePathSpy.calls.reset();

            Rpd.navigation.handlePath(GIBBER);

            expect(networkErrorSpy).toHaveBeenCalled();

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: firstPatch
                }));

            expect(changePathSpy).toHaveBeenCalledWith('');
        });

        it('fires an error, but yet closes all other patches', function() {
            Rpd.addPatch('first');

            var secondPatch = Rpd.addPatch('second');
            var thirdPatch = Rpd.addClosedPatch('third');
            thirdPatch.open();

            networkUpdatesSpy.calls.reset();
            changePathSpy.calls.reset();

            Rpd.navigation.handlePath(GIBBER);

            expect(networkErrorSpy).toHaveBeenCalled();

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/close',
                    patch: secondPatch
                }));
            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/close',
                    patch: thirdPatch
                }));

            expect(changePathSpy).toHaveBeenCalledWith('');
        });

        it('fires an error when path contains only separators', function() {

            Rpd.navigation.handlePath(SEPARATOR + SEPARATOR);

            expect(networkErrorSpy).toHaveBeenCalled();

            expect(changePathSpy).toHaveBeenCalledWith('');

        });

    });

    describe('when path contains single patch ID', function() {

        it('opens specified patch', function() {
            var firstPatch = Rpd.addPatch('first');

            var secondPatch = Rpd.addPatch('second');

            networkUpdatesSpy.calls.reset();
            changePathSpy.calls.reset();

            Rpd.navigation.handlePath(secondPatch.id);

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: secondPatch
                }));

            expect(changePathSpy).not.toHaveBeenCalled();
        });

        it('opens specified patch even if it was closed before', function() {
            var firstPatch = Rpd.addPatch('first');

            var secondPatch = Rpd.addClosedPatch('second');

            networkUpdatesSpy.calls.reset();
            changePathSpy.calls.reset();

            Rpd.navigation.handlePath(secondPatch.id);

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: secondPatch
                }));

            expect(changePathSpy).not.toHaveBeenCalled();
        });

        it('closes all other patches', function() {
            var firstPatch = Rpd.addPatch('first');
            var secondPatch = Rpd.addPatch('second');
            var thirdPatch = Rpd.addClosedPatch('third');
            thirdPatch.open();

            networkUpdatesSpy.calls.reset();
            changePathSpy.calls.reset();

            Rpd.navigation.handlePath(secondPatch.id);

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/close',
                    patch: firstPatch
                }));

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/close',
                    patch: thirdPatch
                }));

            expect(changePathSpy).not.toHaveBeenCalled();
        });

        it('handling same path is not causing changePath to be called next time', function() {
            var firstPatch = Rpd.addPatch('first');
            //Rpd.navigation.handlePath(firstPatch.id);
            changePathSpy.calls.reset();
            Rpd.navigation.handlePath(firstPatch.id);
            Rpd.navigation.handlePath(firstPatch.id);
            expect(changePathSpy).not.toHaveBeenCalled();
        });

    });

    describe('when path contains several patch IDs', function() {

        it('opens all patches specified in the list while they exist', function() {
            var firstPatch = Rpd.addClosedPatch('first');
            var secondPatch = Rpd.addPatch('second');
            var thirdPatch = Rpd.addClosedPatch('third');

            networkUpdatesSpy.calls.reset();
            changePathSpy.calls.reset();

            Rpd.navigation.handlePath(thirdPatch.id + SEPARATOR + firstPatch.id + SEPARATOR + secondPatch.id);

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: firstPatch
                }));
            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: thirdPatch
                }));
            expect(networkUpdatesSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/close',
                    patch: secondPatch
                }));

            expect(changePathSpy).not.toHaveBeenCalled();
        });

        it('opens all patches specified in the list while they exist, even if there\'s a separator in the end', function() {
            var firstPatch = Rpd.addClosedPatch('first');
            var secondPatch = Rpd.addPatch('second');
            var thirdPatch = Rpd.addClosedPatch('third');

            networkUpdatesSpy.calls.reset();
            changePathSpy.calls.reset();

            Rpd.navigation.handlePath(thirdPatch.id + SEPARATOR + firstPatch.id + SEPARATOR + secondPatch.id + SEPARATOR);

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: firstPatch
                }));
            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: thirdPatch
                }));
            expect(networkUpdatesSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/close',
                    patch: secondPatch
                }));

            expect(changePathSpy).toHaveBeenCalledWith(thirdPatch.id + SEPARATOR + firstPatch.id + SEPARATOR + secondPatch.id);
        });

        it('closed patches stay closed if they were not specified in the list', function() {
            var firstPatch = Rpd.addClosedPatch('first');
            var secondPatch = Rpd.addPatch('second');
            var thirdPatch = Rpd.addClosedPatch('third');

            expect(changePathSpy).toHaveBeenCalledWith(secondPatch.id);

            networkUpdatesSpy.calls.reset();
            changePathSpy.calls.reset();

            Rpd.navigation.handlePath(thirdPatch.id + SEPARATOR + secondPatch.id);

            expect(networkUpdatesSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: firstPatch
                }));
            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: thirdPatch
                }));

            expect(changePathSpy).not.toHaveBeenCalled();
        })

        it('do not opens patches which don\'t exist, fires an error for them, but fixes path', function() {
            var firstPatch = Rpd.addClosedPatch('first');
            var secondPatch = Rpd.addClosedPatch('second');
            var thirdPatch = Rpd.addClosedPatch('third');

            expect(changePathSpy).not.toHaveBeenCalled();

            networkUpdatesSpy.calls.reset();

            var GIBBER = 'gibber';

            Rpd.navigation.handlePath(thirdPatch.id + SEPARATOR + firstPatch.id + SEPARATOR + /*!*/GIBBER/*!*/ + SEPARATOR + secondPatch.id + SEPARATOR);

            expect(networkErrorSpy).toHaveBeenCalled();

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: firstPatch
                }));
            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: thirdPatch
                }));
            expect(networkUpdatesSpy).not.toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: secondPatch
                }));

            expect(changePathSpy).toHaveBeenCalledWith(thirdPatch.id + SEPARATOR + firstPatch.id);
        });

        xit('when parent patch was closed, also closes the child patch', function() {
            var firstPatch = Rpd.addClosedPatch('first');
            var secondPatch = Rpd.addPatch('second');
            var thirdPatch = Rpd.addPatch('third');
            secondPatch.open(thirdPatch);
            networkUpdatesSpy.calls.reset();
            thirdPatch.close();
            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/close',
                    patch: secondPatch
                }));
        });

        it('handling same path is not causing changePath to be called next time', function() {
            var firstPatch = Rpd.addPatch('first');
            var secondPatch = Rpd.addPatch('second');
            var bothPatchesPath = firstPatch.id + SEPARATOR + secondPatch.id;
            //Rpd.navigation.handlePath(bothPatchesPath);
            changePathSpy.calls.reset();
            Rpd.navigation.handlePath(bothPatchesPath);
            Rpd.navigation.handlePath(bothPatchesPath);
            expect(changePathSpy).not.toHaveBeenCalled();
        });

        it('changePath is not causing second handlePath call', function() {
            var firstPatch = Rpd.addClosedPatch('first');
            var secondPatch = Rpd.addPatch('second');
            expect(changePathSpy).toHaveBeenCalledOnce();
            changePathSpy.calls.reset();
            var handlePathSpy = spyOn(Rpd.navigation, 'handlePath').and.callThrough();
            Rpd.navigation.handlePath(firstPatch.id);
            expect(changePathSpy).toHaveBeenCalledOnce();
            expect(handlePathSpy).toHaveBeenCalledOnce();
        });

    });

    describe('reaction on patches opened by user', function() {

        it('writes every opened patch to a path', function() {
            var firstPatch = Rpd.addPatch('first');
            expect(changePathSpy).toHaveBeenCalledWith(firstPatch.id);
            var secondPatch = Rpd.addPatch('second');
            expect(changePathSpy).toHaveBeenCalledWith(firstPatch.id + SEPARATOR + secondPatch.id);
            var thirdPatch = Rpd.addPatch('third');
            expect(changePathSpy).toHaveBeenCalledWith(firstPatch.id + SEPARATOR + secondPatch.id + SEPARATOR + thirdPatch.id);
        });

        it('if one of the patches is closed, do not writes it to the path', function() {
            var firstPatch = Rpd.addPatch('first');
            changePathSpy.calls.reset();
            var secondPatch = Rpd.addClosedPatch('second');
            expect(changePathSpy).not.toHaveBeenCalled();
            var thirdPatch = Rpd.addPatch('third');
            expect(changePathSpy).toHaveBeenCalledWith(firstPatch.id + SEPARATOR + thirdPatch.id);
        });

        it('follows opening and closing patches', function() {
            var firstPatch = Rpd.addPatch('first');
            var secondPatch = Rpd.addClosedPatch('second');
            var thirdPatch = Rpd.addPatch('third');
            changePathSpy.calls.reset();
            secondPatch.open();
            expect(changePathSpy).toHaveBeenCalledWith(firstPatch.id + SEPARATOR + thirdPatch.id + SEPARATOR + secondPatch.id);
            thirdPatch.close();
            expect(changePathSpy).toHaveBeenCalledWith(firstPatch.id + SEPARATOR + secondPatch.id);
        });

        it('when parent patch was passed to open method, stores it in the path in first position', function() {
            var firstPatch = Rpd.addClosedPatch('first');
            var secondPatch = Rpd.addPatch('second');
            var thirdPatch = Rpd.addPatch('third');
            changePathSpy.calls.reset();
            secondPatch.open(thirdPatch);
            expect(changePathSpy).toHaveBeenCalledWith(thirdPatch.id + SEPARATOR + secondPatch.id);
        });

    });

});
