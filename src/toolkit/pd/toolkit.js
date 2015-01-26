Rpd.channeltype('pd/t-num', {
    show: function(t_num) {
        return t_num.value;
    }
});

Rpd.channeltype('pd/spinner', {
    adapt: function(val) {
        return { value: val, time: Date.now() };
    }
})

Rpd.nodetype('pd/number', {
    name: 'num',
    inlets:  { 'in':      { type: 'pd/t-num',   default: T(0) },
               'spinner': { type: 'pd/spinner', default: T(0), hidden: true } },
    outlets: { 'out':     { type: 'pd/t-num',   default: T(0) } },
    process: function(inlets) {
        if (inlets.spinner) {
            // if spinner was updated last, use spinner value instead of input
            if ((Date.now() - inlets.spinner.time) < 50) {
                return { 'out': inlets.spinner.value };
            } else {
                return { 'out': inlets.in };
            }
        } else return { 'out': inlets.in };
    }
});
