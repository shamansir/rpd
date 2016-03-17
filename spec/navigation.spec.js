xdefine('navigation', function() {

    var networkUpdatesSpy;
    var pathChangeSpy;
    var networkErrorSpy;

    beforeEach(function() {
        networkUpdatesSpy = jasmine.createSpy('network-updates');
        Rpd.events.onValue(networkUpdatesSpy);
        changePathSpy = jasmine.spyOn(Rpd.navigation, 'changePath');
        networkErrorSpy = jasmine.createSpy('network-errors');
        Rpd.events.onErrors(networkErrorSpy);
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

            Rpd.navigation.handlePath('');

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: firstPatch
                }));

            expect(changePathSpy).toHaveBeenCalledWith(firstPatch.id);
        });

        it('opens first added patch even if it was closed before', function() {
            var firstPatch = Rpd.addPatch('first');
            firstPatch.close();

            var secondPatch = Rpd.addPatch('second');

            networkUpdatesSpy.calls.reset();

            Rpd.navigation.handlePath('');

            expect(networkUpdatesSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'patch/open',
                    patch: firstPatch
                }));

            expect(changePathSpy).toHaveBeenCalledWith(firstPatch.id);
        });

        it('closes all other patches', function() {
            Rpd.addPatch('first');

            var secondPatch = Rpd.addPatch('second');
            var thirdPatch = Rpd.addClosedPatch('third');
            thirdPatch.open();

            networkUpdatesSpy.calls.reset();

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

    });

    describe('when path contains single patch ID', function() {

        it('opens specified patch', function() {
            var firstPatch = Rpd.addPatch('first');

            var secondPatch = Rpd.addPatch('second');

            networkUpdatesSpy.calls.reset();

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

    });


});
