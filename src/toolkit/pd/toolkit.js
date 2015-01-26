Rpd.channeltype('pd/t-num', {
    show: function(t_num) {
        return t_num.value;
    }
});

Rpd.nodetype('pd/number', {
    name: 'num',
    inlets: { 'in': { type: 'pd/t-num', default: T(0) } },
    outlets: { 'out': { type: 'pd/t-num', default: T(0) } },
    process: function(inlets) {
                return { 'out': inlets.in };
             }
});
