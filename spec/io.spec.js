describe('import and export', function() {

    describe('json', function() {

        it('stores and restores patch', function() {

            var finalize = Rpd.export.json();

            Rpd.addPatch('Foo');

            var updateSpy = jasmine.createSpy('update');

            Rpd.events.onValue(updateSpy);

            Rpd.import.json(finalize());

            expect(updateSpy).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    type: 'network/add-patch'
                })
            );

        });

    });

});
