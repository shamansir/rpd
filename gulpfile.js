// npm install --save-dev google-closure-compiler yargs
// npm install --save-dev gulp gulp-util gulp-size gulp-header gulp-concat gulp-download gulp-closure-compiler

var gulp = require('gulp'),
    gutil = require('gulp-util'),
    closureCompiler = require('gulp-closure-compiler'),
    header = require('gulp-header'),
    size = require('gulp-size'),
    concat = require('gulp-concat'),
    gzip = require('gulp-gzip'),
    // to get vendor files
    download = require('gulp-download'),
    // to build documentation
    rename = require('gulp-rename'),
    parser = require('gulp-file-parser'),
    highlight = require('gulp-highlight'),
    watch = require('gulp-watch'),
    markdown = require('gulp-markdown'),
    frontMatter = require('gulp-front-matter'),
    layout = require('gulp-layout');

var Paths = {
    Root: '.',
    Src: function() { return Paths.Root + '/src'; },
    Vendor: function() { return Paths.Root + '/vendor'; },
    Rpd: function() { return Paths.Src() + '/rpd.js'; },
    Kefir: function() { return Paths.Vendor() + '/kefir.min.js'; },
    D3: function() { return Paths.Vendor() + '/d3.min.js'; },
    D3Tiny: function() { return Paths.Src() + '/d3_tiny.js'; },
    RenderModel: function() { return Paths.Src() + '/render/shared.js'; },
    Renderer: function(renderer) { return Paths.Src() + '/render/' + renderer; },
    Toolkit: function(toolkit) { return Paths.Src() + '/toolkit/' + toolkit + '/toolkit'; },
    ToolkitModel: function(toolkit) { return Paths.Src() + '/toolkit/' + toolkit + '/shared'; },
    ToolkitRenderer: function(toolkit, renderer) { return Paths.Src() + '/toolkit/' + toolkit + '/' + renderer; },
    UserToolkit: function(toolkit) { return toolkit; },
    UserToolkitModel: function(toolkit) { return toolkit + '/shared'; },
    UserToolkitRenderer: function(toolkit, renderer) { return toolkit + '/' + renderer; },
    StyleRenderer: function(style, renderer) { return Paths.Src() + '/style/' + style + '/' + renderer; },
    UserStyleRenderer: function(style, renderer) { return style + '/' + renderer; },
    Io: function(io) { return Paths.Src() + '/io/' + io; }
}

var argv = require('yargs')
           .string('root').string('target-name').string('compilation').boolean('pretty')
           .array('renderer').array('style').array('toolkit').array('io').boolean('d3')
           .array('user-style').array('user-toolkit')
           .default({
               root: '.',
               'target-name': 'rpd', // forms dist/rpd.js and dist/rpd.css
               'compilation': 'simple',
               pretty: false,
               renderer: [ 'svg' ],
               style: [ 'quartz' ],
               toolkit: [ 'core' ],
               io: [],
               d3: false,
               'user-style': [ ],
               'user-toolkit': [ ]
           })
           .argv;

var targetName = argv['target-name']; // forms dist/<targetName>.js and dist/<targetName>.css

var pkg = require('./package.json');
var Server = require('karma').Server;

var KARMA_CONF_PATH = 'spec/karma.conf.js';
var CLOSURE_COMPILER_PATH = 'node_modules/google-closure-compiler/compiler.jar';

var DEPENDENCIES = [ 'https://cdn.jsdelivr.net/kefir/3.0.0/kefir.min.js' ];

var DOC_HIGHLIGHT_STYLE = 'docco', // default, tomorrow
    DOC_HIGHLIGHT_STYLE_FILENAME = DOC_HIGHLIGHT_STYLE + '.min.css';

var DEV_DEPENDENCIES = [
               'https://cdn.jsdelivr.net/kefir/3.0.0/kefir.min.js', // Kefir
               'http://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.0.0/styles/' + DOC_HIGHLIGHT_STYLE_FILENAME, // highlight.js style for documentation
               'http://mohayonao.github.io/timbre.js/timbre.js', // timbre
               'http://player-dev.animatron.com/latest/bundle/animatron.min.js', // animatron
               'https://raw.githubusercontent.com/sebpiq/WebPd/master/dist/webpd-latest.min.js', // WebPd
               'https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.4.19/p5.min.js' // p5
             ];

var COMPILATION_LEVELS = {
    'whitespace': 'WHITESPACE_ONLY',
    'simple': 'SIMPLE_OPTIMIZATIONS',
    'advanced': 'ADVANCED_OPTIMIZATIONS'
};

var valueColor = gutil.colors.yellow,
    infoColor = gutil.colors.black;

gulp.task('default', ['build'], function() { });

gulp.task('get-deps', function() {
    download(DEPENDENCIES).pipe(gulp.dest('./vendor'));
});

gulp.task('get-dev-deps', function() {
    download(DEV_DEPENDENCIES).pipe(gulp.dest('./vendor'));
});

gulp.task('build', ['check-root', 'list-opts', 'concat-css'], function() {
    var resultName = targetName + ((argv.compilation !== 'whitespace') ? '.min.js' : '.js');

    var compilerFlags = {
        language_in: 'ECMASCRIPT5',
        compilation_level: COMPILATION_LEVELS[argv.compilation || 'simple']
    };
    if (argv.pretty) compilerFlags['formatting'] = 'PRETTY_PRINT';

    gutil.log(infoColor('Compiling ' + resultName + ' with Closure compiler'));
    gutil.log(infoColor('Sources included:'));
    return gulp.src(logFiles(getJsFiles(argv)))
               .pipe(closureCompiler({
                   compilerPath: './' + CLOSURE_COMPILER_PATH,
                   fileName: resultName,
                   compilerFlags: compilerFlags
               }))
               .pipe(distJsHeader(pkg, argv, new Date()))
               .pipe(gulp.dest('dist'))
               .pipe(size({ showFiles: true, title: 'Result:' }))
               .on('end', function() {
                   gutil.log(infoColor('Your dist/' + resultName + ' is ready!'));
               });
});

gulp.task('build-with-gzip', ['build'], function() {
    var sourceName = targetName + ((argv.compilation !== 'whitespace') ? '.min.js' : '.js');
    return gulp.src('./dist/' + sourceName)
               .pipe(gzip())
               .pipe(gulp.dest('dist'))
               .pipe(size({ showFiles: true, title: 'Result:' }))
               .on('end', function() {
                   gutil.log(infoColor('Your dist/' + sourceName + '.gz is ready!'));
               });
});

gulp.task('concat-css', ['check-root'], function() {
    gutil.log(infoColor('Concatenating ' + targetName + '.css'));
    return gulp.src(logFiles(getCssFiles(argv)))
               .pipe(concat(targetName + '.css'))
               .pipe(distCssHeader(pkg, argv, new Date()))
               .pipe(gulp.dest('dist'))
               .pipe(size({ showFiles: true, title: 'Result:' }))
               .on('end', function() {
                   gutil.log(infoColor('Your dist/' + targetName + '.css is ready!'));
               });
});

gulp.task('test', function(done) {
    new Server({
        configFile: __dirname + '/' + KARMA_CONF_PATH,
        singleRun: true
    }, done).start();
});

gulp.task('check-root', function() {
    checkRootPath(argv);
});

gulp.task('list-opts', function() {
    gutil.log(infoColor('Root Path (--root):'),
              argv.root ? valueColor(argv.root) : '.');
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
    gutil.log(infoColor('Selected Target Name (--target-name):'), argv['target-name']);
});

gulp.task('html-head', ['check-root', 'list-opts'], function() {
    getHtmlHead(argv);
});

var injectFiddles = parser({
    name: 'inject-fiddles',
    func: function(data) {
        console.log(data);
        return data;
    }
});

gulp.task('copy-highlight-css', function() {
    return gulp.src('./vendor/' + DOC_HIGHLIGHT_STYLE_FILENAME)
               .pipe(rename('highlight-js.min.css'))
               .pipe(gulp.dest('./docs/compiled/'));
});

gulp.task('docs', ['copy-highlight-css'], function() {
    var utils = require('./docs/utils.js');
    var config = require('./docs/config.json');
    return gulp.src('./docs/**/*.md')
               .pipe(frontMatter())
               .pipe(markdown())
               .pipe(highlight())
               .pipe(injectFiddles())
               //.pipe(utils.injectFiddles())
               .pipe(layout(function(file) {
                   return {
                       doctype: 'html',
                       pretty: true,
                       'config': config,
                       front: file.frontMatter,
                       layout: './docs/layout.jade'
                   };
               }))
               .pipe(gulp.dest('./docs/compiled/'));
    console.log('Compiled docs to ./docs/compiled');
});

gulp.task('docs-watch', ['copy-highlight-css'], function() {
    var utils = require('./docs/utils.js');
    var config = require('./docs/config.json');
    return watch('./docs/**/*.md')
               .pipe(frontMatter())
               .pipe(markdown())
               .pipe(layout(function(file) {
                   return {
                       doctype: 'html',
                       pretty: true,
                       'config': config,
                       front: file.frontMatter,
                       layout: './docs/layout.jade'
                   };
               }))
               .pipe(gulp.dest('./docs/compiled/'));
    console.log('Will watch for docs updates...');
});

// Helpers =====================================================================

function checkRootPath(argv) {
    if (argv.root) { Paths.Root = argv.root; }
}

function getCommandString(options) {
    var command = 'gulp';
    if (options.root) command += ' --root ' + options.root;
    options.renderer.forEach(function(renderer) { command += ' --renderer ' + renderer; });
    options.style.forEach(function(style) { command += ' --style ' + style; });
    options.toolkit.forEach(function(toolkit) { command += ' --toolkit ' + toolkit; });
    options.io.forEach(function(io) { command += ' --io ' + io; });
    if (options.d3) command += ' --d3';
    options['user-style'].forEach(function(userStyle) {
        command += ' --user-style ' + userStyle;
    });
    options['user-toolkit'].forEach(function(userToolkit) {
        command += ' --user-toolkit ' + userToolkit;
    });
    if (options['target-name']) command += ' --target-name ' + options['target-name'];
    if (options.compilation) command += ' --compilation ' + options.compilation;
    if (options.pretty) command += ' --pretty';
    return command;
}

function distJsHeader(pkg, options, time) {
    var banner = ['/**',
    ' * <%= pkg.name %> - <%= pkg.description %>',
    ' * Built at ' + time.toUTCString(),
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
    ' *',
    ' * Command: ' + getCommandString(options),
    ' */',
    ''].join('\n');
    return header(banner, { pkg: pkg });
}

function distCssHeader(pkg, options, time) {
    var banner = ['/**',
    ' * <%= pkg.name %> - <%= pkg.description %>',
    ' * Built at ' + time.toUTCString(),
    ' *',
    ' * @version v<%= pkg.version %>',
    ' * @link <%= pkg.homepage %>',
    ' * @author <%= pkg.author %>',
    ' * @license <%= pkg.license %>',
    ' * ',
    ' * Selected Renderers: ' + (options.renderer.length ? options.renderer.join(', ') : '[None]'),
    ' * Selected Styles: ' + (options.style.length ? options.style.join(', ') : '[None]'),
    ' * Selected Toolkits: ' + (options.toolkit.length ? options.toolkit.join(', ') : '[None]'),
    ' *',
    ' * User Styles: ' + (options['user-style'].length ? options['user-style'].join(', ') : '[None]'),
    ' * User Toolkits: ' + (options['user-toolkit'].length ? options['user-toolkit'].join(', ') : '[None]'),
    ' */',
    '', ''].join('\n');
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
    options.renderer.forEach(function(renderer) {
        list.push(Paths.Renderer(renderer) + '.css');
    });
    options.style.forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            list.push(Paths.StyleRenderer(style, renderer) + '.css');
        });
    });
    options['user-style'].forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            list.push(Paths.UserStyleRenderer(style, renderer) + '.css');
        });
    });
    options.toolkit.forEach(function(toolkit) {
        options.renderer.forEach(function(renderer) {
            list.push(Paths.ToolkitRenderer(toolkit, renderer) + '.css');
        });
    });
    options['user-toolkit'].forEach(function(toolkit) {
        options.renderer.forEach(function(renderer) {
            list.push(Paths.UserToolkitRenderer(toolkit, renderer) + '.css');
        });
    });
    return list;
}

function getJsFiles(options) {
    var list = [];
    list.push(Paths.Rpd());
    if (!options.d3) list.push(Paths.D3Tiny());
    list.push(Paths.RenderModel());
    options.style.forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            list.push(Paths.StyleRenderer(style, renderer) + '.js');
        });
    });
    options['user-style'].forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            list.push(Paths.UserStyleRenderer(style, renderer) + '.js');
        });
    });
    options.renderer.forEach(function(renderer) {
        list.push(Paths.Renderer(renderer) + '.js');
    });
    options.toolkit.forEach(function(toolkit) {
        list.push(Paths.ToolkitModel(toolkit) + '.js');
        list.push(Paths.Toolkit(toolkit) + '.js');
        options.renderer.forEach(function(renderer) {
            list.push(Paths.ToolkitRenderer(toolkit, renderer) + '.js');
        });
    });
    options['user-toolkit'].forEach(function(toolkit) {
        list.push(Paths.UserToolkitModel(toolkit) + '.js');
        list.push(Paths.UserToolkit(toolkit) + '.js');
        options.renderer.forEach(function(renderer) {
            list.push(Paths.UserToolkitRenderer(toolkit, renderer) + '.js');
        });
    });
    options.io.forEach(function(io) {
        list.push(Paths.Io(io) + '.js');
    });
    return list;
}

function getHtmlHead(options) {
    console.log('===========');
    console.log('<head>');
    function comment(comment) {
        console.log('  <!-- ' + comment + ' -->')
    }
    function cssFile(path) {
        console.log('  <link rel="stylesheet" href="' + path + '"></style>');
    }
    function jsFile(path) {
        console.log('  <script src="' + path + '"></script>');
    }
    comment('Built with RPD v' + pkg.version + ' <http://shamansir.github.io/rpd>');
    console.log();
    console.log('  <meta charset=\'utf-8\' />');
    comment(getCommandString(options).replace(/--/g, '=='));
    console.log();
    options.renderer.forEach(function(renderer) {
        comment('RPD Renderer: ' + renderer);
        cssFile(Paths.Renderer(renderer) + '.css');
    });
    options.style.forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            comment('RPD Style: ' + style + ' (' + renderer + ')');
            cssFile(Paths.StyleRenderer(style, renderer) + '.css');
        });
    });
    options['user-style'].forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            comment('RPD User Style: ' + style + ' (' + renderer + ')');
            cssFile(Paths.UserStyleRenderer(style, renderer) + '.css');
        });
    });
    options.toolkit.forEach(function(toolkit) {
        options.renderer.forEach(function(renderer) {
            comment('RPD Toolkit: ' + toolkit + ' (' + renderer + ')');
            cssFile(Paths.ToolkitRenderer(toolkit, renderer) + '.css');
        });
    });
    options['user-toolkit'].forEach(function(toolkit) {
        options.renderer.forEach(function(renderer) {
            comment('RPD User Toolkit: ' + toolkit + ' (' + renderer + ')');
            cssFile(Paths.UserToolkitRenderer(toolkit, renderer) + '.css');
        });
    });
    console.log();
    comment('Kefir'); jsFile(Paths.Kefir());
    comment('RPD'); jsFile(Paths.Rpd());
    console.log();
    if (options.d3) {
        comment('d3.js'); jsFile(Paths.D3());
    } else {
        comment('RPD\'s d3_tiny.js'); jsFile(Paths.D3Tiny());
    }
    comment('RPD Rendering Engine:');
    jsFile(Paths.RenderModel());
    options.style.forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            comment('RPD Style: ' + style + ' (' + renderer + ')');
            jsFile(Paths.StyleRenderer(style, renderer) + '.js');
        });
    });
    options['user-style'].forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            comment('RPD User Style: ' + style + ' (' + renderer + ')');
            jsFile(Paths.UserStyleRenderer(style, renderer) + '.js');
        });
    });
    options.renderer.forEach(function(renderer) {
        comment('RPD Renderer: ' + renderer);
        jsFile(Paths.Renderer(renderer) + '.js');
    });
    options.toolkit.forEach(function(toolkit) {
        comment('RPD Toolkit: ' + toolkit);
        jsFile(Paths.ToolkitModel(toolkit) + '.js');
        jsFile(Paths.Toolkit(toolkit) + '.js');
        options.renderer.forEach(function(renderer) {
            comment('RPD Toolkit: ' + toolkit + ' (' + renderer + ')');
            jsFile(Paths.ToolkitRenderer(toolkit, renderer) + '.js');
        });
    });
    options['user-toolkit'].forEach(function(toolkit) {
        comment('RPD User Toolkit: ' + toolkit);
        jsFile(Paths.UserToolkit(toolkit) + '.js');
        options.renderer.forEach(function(renderer) {
            comment('RPD User Toolkit: ' + toolkit + ' (' + renderer + ')');
            jsFile(Paths.UserToolkitRenderer(toolkit, renderer) + '.js');
        });
    });
    console.log();
    options.io.forEach(function(io) {
        comment('RPD I/O: ' + io);
        jsFile(Paths.Io(io) + '.js');
    });
    console.log('</head>');
    console.log('===========');
}
