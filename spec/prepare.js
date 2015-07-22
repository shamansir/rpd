prettify(Rpd); // inject pretty-print for Jasmine

Rpd.nodetype('spec/empty', {});
Rpd.channeltype('spec/any', {});
Rpd.linktype('spec/pass', {});

function withNewPatch(fn) {
    var updateSpy = jasmine.createSpy('update');
    var renderer = Rpd.renderer('foo', function(user_conf) {
        return updateSpy;
    });

    var patch = Rpd.addPatch().render('foo', {});

    fn(patch, updateSpy);
}

// this function is required due to the fact processing function receives the same object
// modified through time, so if these checks are preformed after the calls, they do fail
// see: https://github.com/shamansir/rpd/issues/89
// and: https://github.com/jasmine/jasmine/issues/872
function handleNextCalls(spy, handlers) {
    var timesCalled = 0;

    spy.and.callFake(function() {
        expect(handlers[timesCalled]).toBeTruthy('No handler for a call #' + timesCalled);
        handlers[timesCalled](spy);
        timesCalled++;
    });

    return function() {
        expect(spy).toHaveBeenCalledTimes(handlers.length);
    }
}

beforeEach(function() {
    jasmine.addMatchers({
        toHaveBeenOrderlyCalledWith: RpdMatchers.toHaveBeenOrderlyCalledWith,
        toHaveBeenCalledOnce: RpdMatchers.toHaveBeenCalledOnce,
        toHaveBeenCalledTwice: RpdMatchers.toHaveBeenCalledTwice,
        toHaveBeenCalledTimes: RpdMatchers.toHaveBeenCalledTimes
    });
});
