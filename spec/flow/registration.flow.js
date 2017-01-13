/* @flow */

import Rpd from '../../rpd';
import Kefir from 'kefir';

const simpleNodeDefinition = {
    title: 'Test'
};

const fullNodeDefinition = {
    title: 'Foobar',
    inlets: { 'test/a': { type: 'core/any', default: 5 },
              'test/b': { type: 'core/any', allow: [ 'util/number' ] } },
              'test/c': { type: 'core/any', default: 'foobar' /*Kefir.later(1500, 'a')*/ },
    outlets: { 'test/a': { type: 'core/any' },
               'test/b': { type: 'core/any', show: function(v) { return v } } },
    prepare: function(inlets, outlets) {},
    process: function(inlets_vals, prev_inlets_vals) {
        return {
            'test/a': 17,
            'test/b': Kefir.constant(3)
        };
    },
    tune: function(stream) { return stream.delay(100); },
    handle: {
        'node/turn-on': function() {}
    }
};

Rpd.nodetype('spec/test', { });
Rpd.nodetype('spec/test', simpleNodeDefinition);
Rpd.nodetype('spec/test', function() {
    return simpleNodeDefinition;
});
Rpd.nodetype('spec/test', fullNodeDefinition);
Rpd.nodetype('spec/test', function() {
    return fullNodeDefinition;
});

const simpleChannelDefinition = {
    label: 'test'
};

const allowList: Array<string> = [ 'util/number', 'core/any' ];

const fullChannelDefinition = {
    type: 'core/any',
    label: 'foobar',
    default: 12, //Kefir.later(1500, 'a'),
    hidden: true,
    cold: true,
    readonly: true,
    allow: allowList,
    accept: function(v): boolean { return true; },
    adapt: function(v): any { return v; },
    show: function(v): string { return 'v'; },
    tune: function(stream: Kefir.Observable<*>): Kefir.Observable<*> { return stream.delay(100); },
    handle: {
        'node/turn-on': function() {}
    }
};

Rpd.channeltype('spec/test', { });
Rpd.channeltype('spec/test', simpleChannelDefinition);
Rpd.channeltype('spec/test', function() {
    return simpleChannelDefinition;
});
Rpd.channeltype('spec/test', fullChannelDefinition);
Rpd.channeltype('spec/test', function() {
    return fullChannelDefinition;
});

const simpleNodeRendererDefinition = {
    size: { width: 10, height: 10 }
};

const fullNodeRendererDefinition = {
    size: { width: 10, height: 10 },
    first: function(body) {
        return {
            inlet: {
                default: 17,
                valueOut: Kefir.later(100, 'a')
            },
            anotherInlet: {
                default: 17,
                valueOut: Kefir.later(100, 'a')
            }
        }
    },
    always: function(body, inlets, outlets) {}
};

Rpd.noderenderer('spec/test', 'foo', {});
Rpd.noderenderer('spec/test', 'foo', simpleNodeRendererDefinition);
Rpd.noderenderer('spec/test', 'foo', function() {
    return simpleNodeRendererDefinition;
});
Rpd.noderenderer('spec/test', 'foo', fullNodeRendererDefinition);
Rpd.noderenderer('spec/test', 'foo', function() {
    return fullNodeRendererDefinition;
});

const channelRendererDefinition = {
    show: function(body: HTMLElement, value: any, repr: string) {},
    edit: function(body: HTMLElement, inlet: Rpd.Inlet, valueIn: Kefir.Observable<*>): Kefir.Observable<*> {
        return Kefir.interval(500, '42')
    }
};

Rpd.channelrenderer('spec/test', 'foo', {});
Rpd.channelrenderer('spec/test', 'foo', channelRendererDefinition);
Rpd.channelrenderer('spec/test', 'foo', function() {
    return channelRendererDefinition;
});

Rpd.nodedescription('spec/test', 'The Description');
Rpd.nodetypeicon('spec/test', '*');
Rpd.toolkiticon('foobar', '*');

// TODO: Rpd.renderer
// TODO: Rpd.style

