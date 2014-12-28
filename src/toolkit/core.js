Rpd.nodetype('core/empty', {
    name: 'Empty',
    minHeight: 100
});

Rpd.nodetype('core/custom', {
    name: 'Custom',
    minHeight: 100,
    process: function(inlets) {
        //console.log('process', inlets);
        return {};
    }
});

Rpd.channeltype('core/bool', {
    name: 'BooleanCh'
});

Rpd.channeltype('core/number', {
    name: 'NumberCh'
});


Rpd.linktype('core/normal', {
    name: 'Normal'
});
