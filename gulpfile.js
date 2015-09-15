// npm install --save-dev google-closure-compiler gulp gulp-util gulp-download gulp-closure-compiler yargs

var gulp = require('gulp'),
    gutil = require('gulp-util'),
    download = require('gulp-download'),
    closureCompiler = require('gulp-closure-compiler');

var argv = require('yargs')
           .array('renderer')
           .array('style')
           .array('toolkit')
           .array('io')
           .boolean('d3')
           .default({
               renderer: [ 'svg' ],
               style: [ 'quartz' ],
               toolkit: [ 'core' ],
               io: [],
               d3: false
           })
           .argv;

var Server = require('karma').Server;

var KARMA_CONF_PATH = 'spec/karma.conf.js';
var CLOSURE_COMPILER_PATH = './node_modules/google-closure-compiler/';

var VENDOR = [ 'http://rpominov.github.io/kefir/dist/kefir.min.js'/*,
               'http://mohayonao.github.io/timbre.js/timbre.js',
               'http://player-dev.animatron.com/latest/bundle/animatron.min.js'*/ ];

gulp.task('default', ['build'], function() { });

gulp.task('get-deps', function() {
    download(VENDOR).pipe(gulp.dest('./vendor'));
});

gulp.task('build', ['list-opts', 'concat-css'], function() {
    /*return gulp.src(getJsFiles(argv))
               .pipe(closureCompiler({
                   compilerPath: CLOSURE_COMPILER_PATH,
                   fileName: 'rpd.js',
                   compilerFlags: {
                       //compilation_level: 'ADVANCED_OPTIMIZATIONS',
                       language_level: 'ECMASCRIPT5'
                   }
               }))
               .pipe(gulp.dest('dist'));*/

});

gulp.task('concat-css', function() {

});

gulp.task('test', function(done) {
    new Server({
        configFile: __dirname + '/' + KARMA_CONF_PATH,
        singleRun: true
    }, done).start();
});

gulp.task('list-opts', function() {
    gutil.log('Selected Renderers (--renderer):', argv.renderer.length ? argv.renderer.join(', ') : '[None]');
    gutil.log('Selected Styles (--style):', argv.style.length ? argv.style.join(', ') : '[None]');
    gutil.log('Selected Toolkits (--toolkit):', argv.toolkit.length ? argv.toolkit.join(', ') : '[None]');
    gutil.log('Selected I/O Modules (--io):', argv.io.length ? argv.io.join(', ') : '[None]');
    gutil.log('d3.js or d3_tiny.js (--d3):', argv.d3 ? 'd3.js' : 'd3_tiny.js');
});

gulp.task('html-head', function() {

});

function getCssFiles(options) {
    var list = [];
    options.style.each(function(style) {
        options.renderer.each(function(renderer) {
            list.push('./src/style/' + style + '/' + renderer + '.css');
        });
    });
    options.renderer.each(function(renderer) {
        list.push('./src/renderer/' + renderer + '.css');
    });
    options.toolkit.each(function(toolkit) {
        options.renderer.each(function(renderer) {
            list.push('./src/toolkit/' + toolkit + '/' + renderer + '.css');
        });
    });
    return list;
}

function getJsFiles(options) {
    var list = [];
    list.push('./src/rpd.js');
    options.io.each(function(io) {
        list.push('./src/io/' + io + '.js');
    });
    if (!options.d3) list.push('./src/render/d3_tiny.js');
    options.style.each(function(style) {
        options.renderer.each(function(renderer) {
            list.push('./src/style/' + style + '/' + renderer + '.js');
        });
    });
    options.renderer.each(function(renderer) {
        list.push('./src/renderer/' + renderer + '.js');
    });
    options.toolkit.each(function(toolkit) {
        list.push('./src/toolkit/' + toolkit + '.js');
        options.renderer.each(function(renderer) {
            list.push('./src/toolkit/' + toolkit + '/' + renderer + '.js');
        });
    });
    return list;
}
