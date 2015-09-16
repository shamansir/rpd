// npm install --save-dev google-closure-compiler yargs
// npm install --save-dev gulp gulp-util gulp-size gulp-header gulp-download gulp-closure-compiler

var gulp = require('gulp'),
    gutil = require('gulp-util'),
    header = require('gulp-header'),
    size = require('gulp-size'),
    download = require('gulp-download'),
    closureCompiler = require('gulp-closure-compiler');

var argv = require('yargs')
           .array('renderer').array('style').array('toolkit').array('io').boolean('d3')
           .array('user-style').array('user-toolkit')
           .default({
               renderer: [ 'svg' ],
               style: [ 'quartz' ],
               toolkit: [ 'core' ],
               io: [],
               d3: false,
               'user-style': [ ],
               'user-toolkit': [ ],
           })
           .argv;

var pkg = require('./package.json');
var Server = require('karma').Server;

var KARMA_CONF_PATH = 'spec/karma.conf.js';
var CLOSURE_COMPILER_PATH = 'node_modules/google-closure-compiler/compiler.jar';

var VENDOR = [ 'http://rpominov.github.io/kefir/dist/kefir.min.js'/*,
               'http://mohayonao.github.io/timbre.js/timbre.js',
               'http://player-dev.animatron.com/latest/bundle/animatron.min.js'*/ ];

var valueColor = gutil.colors.yellow,
    infoColor = gutil.colors.black;

gulp.task('default', ['build'], function() { });

gulp.task('get-deps', function() {
    download(VENDOR).pipe(gulp.dest('./vendor'));
});

gulp.task('build', ['list-opts', 'concat-css'], function() {
    gutil.log(infoColor('Compiling rpd.js with Closure compiler'));
    gutil.log(infoColor('Sources included:'));
    return gulp.src(logFiles(getJsFiles(argv)))
               .pipe(closureCompiler({
                   compilerPath: './' + CLOSURE_COMPILER_PATH,
                   fileName: 'rpd.js',
                   compilerFlags: {
                       //compilation_level: 'ADVANCED_OPTIMIZATIONS',
                       language_in: 'ECMASCRIPT5'
                   }
               }))
               .pipe(distJsHeader(pkg, argv))
               .pipe(gulp.dest('dist'))
               .pipe(size({ showFiles: true, title: 'Result:' }))
               .on('end', function() {
                   gutil.log(infoColor('Your dist/rpd.js is ready!'));
               });
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
    gutil.log(infoColor('Selected Renderers (--renderer):'),
              argv.renderer.length ? valueColor(argv.renderer.join(', ')) : '[None]');
    gutil.log(infoColor('Selected Styles (--style):'),
              argv.style.length ? valueColor(argv.style.join(', ')) : '[None]');
    gutil.log(infoColor('Selected Toolkits (--toolkit):'),
              argv.toolkit.length ? valueColor(argv.toolkit.join(', ')) : '[None]');
    gutil.log(infoColor('Selected I/O Modules (--io):'),
              argv.io.length ? valueColor(argv.io.join(', ')) : '[None]');
    gutil.log(infoColor('d3.js or d3_tiny.js (--d3):'),
              valueColor(argv.d3 ? 'd3.js (external)' : 'd3_tiny.js'));
    gutil.log(infoColor('Selected User Styles (--user-style):'),
              argv['user-style'].length ? valueColor(argv['user-style'].join(', ')) : '[None]');
    gutil.log(infoColor('Selected User Toolkits (--user-toolkit):'),
              argv['user-toolkit'].length ? valueColor(argv['user-toolkit'].join(', ')) : '[None]');
});

gulp.task('html-head', function() {

});

// Helpers ========================================================

function distJsHeader(pkg, options) {
    var banner = ['/**',
    ' * <%= pkg.name %> - <%= pkg.description %>',
    ' *',
    ' * @version v<%= pkg.version %>',
    ' * @link <%= pkg.homepage %>',
    ' * @author <%= pkg.author %>',
    ' * @license <%= pkg.license %>',
    ' * ',
    ' * Selected Renderers: ' + (options.renderer.length ? options.renderer.join(', ') : '[None]'),
    ' * Selected Styles: ' + (options.style.length ? options.style.join(', ') : '[None]'),
    ' * Selected Toolkits: ' + (options.toolkit.length ? options.toolkit.join(', ') : '[None]'),
    ' * Selected I/O Modules: ' + (options.io.length ? options.io.join(', ') : '[None]'),
    ' * d3.js or d3_tiny.js: ' + (options.d3 ? 'd3.js (external)' : 'd3_tiny.js'),
    ' *',
    ' * User Styles: ' + (options['user-style'].length ? options['user-style'].join(', ') : '[None]'),
    ' * User Toolkits: ' + (options['user-toolkit'].length ? options['user-toolkit'].join(', ') : '[None]'),
    ' */',
    ''].join('\n');
    return header(banner, { pkg: pkg });
}

function logFiles(list) {
    list.forEach(function(file) {
        gutil.log(valueColor(file));
    });
    return list;
}

function getCssFiles(options) {
    var list = [];
    options.style.forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            list.push('./src/style/' + style + '/' + renderer + '.css');
        });
    });
    options.renderer.forEach(function(renderer) {
        list.push('./src/renderer/' + renderer + '.css');
    });
    options.toolkit.forEach(function(toolkit) {
        options.renderer.forEach(function(renderer) {
            list.push('./src/toolkit/' + toolkit + '/' + renderer + '.css');
        });
    });
    return list;
}

function getJsFiles(options) {
    var list = [];
    list.push('./src/rpd.js');
    options.io.forEach(function(io) {
        list.push('./src/io/' + io + '.js');
    });
    if (!options.d3) list.push('./src/render/d3_tiny.js');
    options.style.forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            list.push('./src/style/' + style + '/' + renderer + '.js');
        });
    });
    options.renderer.forEach(function(renderer) {
        list.push('./src/renderer/' + renderer + '.js');
    });
    options.toolkit.forEach(function(toolkit) {
        list.push('./src/toolkit/' + toolkit + '.js');
        options.renderer.forEach(function(renderer) {
            list.push('./src/toolkit/' + toolkit + '/' + renderer + '.js');
        });
    });
    return list;
}
