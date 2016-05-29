var gulp = require('gulp'),
    gutil = require('gulp-util'),
    closureCompiler = require('gulp-closure-compiler'),
    header = require('gulp-header'),
    size = require('gulp-size'),
    del = require('del'),
    concat = require('gulp-concat'),
    gzip = require('gulp-gzip'),
    // to get vendor files
    download = require('gulp-download'),
    // to build documentation
    fs = require('fs'),
    rename = require('gulp-rename'),
    parser = require('gulp-file-parser'),
    watch = require('gulp-watch'),
    markdown = require('gulp-markdown'),
    hljs = require('highlight.js'),
    frontMatter = require('gulp-front-matter'),
    layout = require('gulp-layout');

var Paths = {
    Root: '.',
    Destination: './dist',
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
    Io: function(io) { return Paths.Src() + '/io/' + io; },
    Navigation: function(type) { return Paths.Src() + '/navigation/' + type; },
}

var yargs = require('yargs')
            .usage('Usage: gulp [command] [options]')
            .command('help', 'show this message')
            .command('build [options]', '(default) compile the RPD library with given options, if specified; all the options listed below are supported')
            .command('build-with-gzip [options]', 'additionally to what `build` performs, compile the gzipped version of the library; all the options listed below are supported')
            .command('get-deps', 'download the dependencies (currently only Kefir.js) required for using RPD to `./vendor` directory; may be called only once to get the most recent version of the dependencies')
            .command('get-dev-deps', 'download the development dependencies required for developing with RPD or running the examples to `./vendor` directory;  may be called only once to get the most recent version of the dependencies')
            .command('test', 'run the Jasmine tests to check if API is consistent (the same command runs on Travis CI)')
            .command('list-options [options]', 'get the information for given options, may be used to be sure if you specified all the options correctly without compiling the library; all the options listed below are supported')
            .command('html-head [options]', 'get the full list of all the required files with given options to include into HTML file head if you use not the compiled version, but the files from `./src` directly; all the options listed below are supported')
            .command('docs [--docs-local]', 'compile the documentation from `./docs` sources into corresponding HTML files and place the resulting structure into `./docs/compiled`')
            .command('version', 'get the version of the RPD library you currently have')
            .array('renderer').array('style').array('toolkit').array('io').array('navigation')
            /*.choices('compilation', ['simple', 'whitespace', 'advanced'])*/
            .string('from').string('to').string('target-name').string('compilation').boolean('pretty').boolean('d3')
            .array('user-style').array('user-toolkit')
            .boolean('docs-local')
            .default({
                from: '.',
                to: './dist',
                'target-name': 'rpd', // forms dist/rpd.js and dist/rpd.css
                'compilation': 'simple',
                pretty: false,
                renderer: [ 'html' ],
                style: [ 'quartz' ],
                toolkit: [ ],
                io: [],
                navigation: [],
                d3: false,
                'user-style': [ ],
                'user-toolkit': [ ],
                'docs-local': false
            })
            .alias({
                'renderer': 'r', 'style': 's', 'toolkit': 't', 'io': 'x', 'navigation': ['h', 'nav'],
                'from': ['i', 'root'], 'to': ['o', 'dest'/*, 'destination'*/],
                'target-name': 'n', 'compilation': 'c', 'pretty': 'p',
                'user-style': 'z', 'user-toolkit': 'd',
                'd3': 'no-d3-tiny'
            })
            .describe({
                'renderer': 'this renderer will be included in the compiled version, choises are: `html`, `svg`, ...',
                'style': 'this style will be included in compiled version, choises are: `compact`, `compact-v`, `pd`, `plain`, `quartz`, ...',
                'toolkit': 'this node toolkit will be included in the compiled version, choises are: `util`, `anm`, `webpd`, `timbre`, ...',
                'io': 'this I/O module will be included in compiled version, choises are: `json`, `pd`, ...',
                'navigation': 'this navigation module will be included in compiled version, choises are: `browser`, ...',
                'from': 'use the distibution located at given path, also works for `gulp html-head`',
                'to': 'write the compiled files to the given path, instead of default one',
                'target-name': 'change the name of the target file, i.e. `-n rpd-svg-quartz` will create `./dist/rpd-svg-quartz.css` and `./dist/rpd-svg-quartz.min.js`',
                'compilation': 'change the compilation of the Closure compiler, choices are: `whitespace`, `simple`, `advanced`',
                'pretty': 'use pretty-print option of the Closure compiler',
                'd3': 'do not include tiny_d3 in the compiled file with the intention that external d3 library will be used (RPD can handle that)',
                'user-style': 'use the user style located at the given path, instead of searching for it at `./src/style/<style-name>`',
                'user-toolkit': 'use the user style toolkit at the given path, instead of searching for it at `./src/toolkit/<toolkit-name>`',
                'docs-local': 'used for building documentation to open and test it locally'
            })
            .example('gulp -r svg -t anm -t timbre', 'add SVG renderer to the compilation instead of default HTML, also include `anm` and `timbre` toolkits there')
            .example('gulp html-head -r svg -t anm -t timbre', 'get the HTML header for the version described above, which will provide paths inside ./src instead of compiled `rpd.min.js`')
            .example('gulp -o /Users/hitchcock -n my-custom-rpd', 'write the files to `/Users/hitchcock/my-custom-rpd.css` and ' +
                          '`/Users/hitchcock/my-custom-rpd.min.js`')
            .example('gulp -z /Users/hitchcock/my-style -r svg -x json -n my-rpd', 'include user style located at `/Users/hitchcock/my-style`, add SVG renderer, add JSON I/O module and place the files at `./dist/my-rpd.min.js` and `./dist/my-rpd.css`')
            .epilogue('See http://shamansir.github.io/rpd for detailed documentation. © shaman.sir, 2016');

var argv = yargs.argv;

var targetName = argv['target-name']; // forms dist/<targetName>.js and dist/<targetName>.css

var pkg = require('./package.json');
var Server = require('karma').Server;

var KARMA_CONF_PATH = 'spec/karma.conf.js';
var CLOSURE_COMPILER_PATH = 'node_modules/google-closure-compiler/compiler.jar';

var DEPENDENCIES = [ 'https://cdn.jsdelivr.net/kefir/3.0.0/kefir.min.js' ];

var DOC_HIGHLIGHT_STYLE = 'docco', // default, tomorrow, foundation, github-gist, xcode
    DOC_HIGHLIGHT_STYLE_FILENAME = DOC_HIGHLIGHT_STYLE + '.min.css';

var DEV_DEPENDENCIES = [
               'https://cdn.jsdelivr.net/kefir/3.0.0/kefir.min.js', // Kefir
               'http://mohayonao.github.io/timbre.js/timbre.js', // timbre
               'http://player-dev.animatron.com/latest/bundle/animatron.min.js', // animatron
               'https://raw.githubusercontent.com/sebpiq/WebPd/master/dist/webpd-latest.min.js', // WebPd
               'https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.4.19/p5.min.js', // p5
               'https://d3js.org/d3.v3.min.js', // d3
               'http://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.0.0/styles/' + DOC_HIGHLIGHT_STYLE_FILENAME // highlight.js style for documentation
             ];

var COMPILATION_LEVELS = {
    'whitespace': 'WHITESPACE_ONLY',
    'simple': 'SIMPLE_OPTIMIZATIONS',
    'advanced': 'ADVANCED_OPTIMIZATIONS'
};

var valueColor = gutil.colors.yellow,
    infoColor = gutil.colors.black;

gulp.task('default', ['build']);

gulp.task('get-deps', function() {
    download(DEPENDENCIES).pipe(gulp.dest('./vendor'));
});

gulp.task('get-dev-deps', function() {
    download(DEV_DEPENDENCIES).pipe(gulp.dest('./vendor'));
});

gulp.task('build', ['check-paths', 'list-opts', 'concat-css'], function() {
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
               .pipe(gulp.dest(Paths.Destination))
               .pipe(size({ showFiles: true, title: 'Result:' }))
               .on('end', function() {
                   gutil.log(infoColor('Your ' + Paths.Destination + '/' + resultName + ' is ready!'));
               });
});

gulp.task('gzip-min-js', ['build'], function() {
    var sourceName = targetName + ((argv.compilation !== 'whitespace') ? '.min.js' : '.js');
    return gulp.src(Paths.Destination + '/' + sourceName)
               .pipe(gzip())
               .pipe(gulp.dest(Paths.Destination))
               .pipe(size({ showFiles: true, title: 'Result:' }))
               .on('end', function() {
                   gutil.log(infoColor('Your ' + Paths.Destination + '/' + sourceName + '.gz is ready!'));
               });
});

gulp.task('gzip-css', ['build'], function() {
    var sourceName = targetName + '.css';
    return gulp.src(Paths.Destination + '/' + sourceName)
               .pipe(gzip())
               .pipe(gulp.dest(Paths.Destination))
               .pipe(size({ showFiles: true, title: 'Result:' }))
               .on('end', function() {
                   gutil.log(infoColor('Your ' + Paths.Destination + '/' + sourceName + '.gz is ready!'));
               });
});

gulp.task('build-with-gzip', ['build', 'gzip-min-js', 'gzip-css']);

gulp.task('concat-css', ['check-paths'], function() {
    gutil.log(infoColor('Concatenating ' + targetName + '.css'));
    return gulp.src(logFiles(getCssFiles(argv)))
               .pipe(concat(targetName + '.css'))
               .pipe(distCssHeader(pkg, argv, new Date()))
               .pipe(gulp.dest(Paths.Destination))
               .pipe(size({ showFiles: true, title: 'Result:' }))
               .on('end', function() {
                   gutil.log(infoColor('Your ' + Paths.Destination + '/' + targetName + '.css is ready!'));
               });
});

gulp.task('test', function(done) {
    new Server({
        configFile: __dirname + '/' + KARMA_CONF_PATH,
        singleRun: true
    }, done).start();
});

gulp.task('help', function() { console.log(yargs.help()); });

gulp.task('check-paths', function() {
    checkPaths(argv);
});

gulp.task('list-opts', function() {
    gutil.log(infoColor('Root Path (--root):'),
              argv.from ? valueColor(argv.from) : '.');
    gutil.log(infoColor('Destination Path (--dest):'),
              argv.to ? valueColor(argv.to) : './dist');
    gutil.log(infoColor('Selected Renderers (--renderer):'),
              argv.renderer.length ? valueColor(argv.renderer.join(', ')) : '[None]');
    gutil.log(infoColor('Selected Styles (--style):'),
              argv.style.length ? valueColor(argv.style.join(', ')) : '[None]');
    gutil.log(infoColor('Selected Toolkits (--toolkit):'),
              argv.toolkit.length ? valueColor(argv.toolkit.join(', ')) : '[None]');
    gutil.log(infoColor('Selected I/O Modules (--io):'),
              argv.io.length ? valueColor(argv.io.join(', ')) : '[None]');
    gutil.log(infoColor('Selected Navigation Modules (--io):'),
              argv.navigation.length ? valueColor(argv.navigation.join(', ')) : '[None]');
    gutil.log(infoColor('d3.js or d3_tiny.js (--d3):'),
              valueColor(argv.d3 ? 'd3.js (external)' : 'd3_tiny.js'));
    gutil.log(infoColor('Selected User Styles (--user-style):'),
              argv['user-style'].length ? valueColor(argv['user-style'].join(', ')) : '[None]');
    gutil.log(infoColor('Selected User Toolkits (--user-toolkit):'),
              argv['user-toolkit'].length ? valueColor(argv['user-toolkit'].join(', ')) : '[None]');
    gutil.log(infoColor('Selected Target Name (--target-name):'), argv['target-name']);
});

gulp.task('html-head', ['check-paths', 'list-opts'], function() {
    getHtmlHead(argv);
});

gulp.task('version', function() {
    if (argv.silent) {
        console.log('v'+pkg.version);
    } else {
        gutil.log(gutil.colors.blue('v'+pkg.version));
    }
});

// ========================== docs, docs-watch =================================

var docsLocal = argv['docs-local'],
    protocol = docsLocal ? 'http://' : '//';

var fiddleRe = new RegExp('<!-- fiddle: ([a-zA-Z0-9]+)( ([a-z,]+)/)? -->', 'g');
var fiddleTemplate = '<script async src="' + protocol + 'jsfiddle.net/shaman_sir/\$1/embed/\$3/"></script>';
var injectFiddles = parser({
    name: 'inject-fiddles',
    func: function(data) {
        return data.replace(fiddleRe, fiddleTemplate);
    }
});

var codepenRe = new RegExp('<!-- codepen: ([a-zA-Z0-9]+) -->', 'g');
var codepenTemplate = '<p data-height="266" data-theme-id="21572" data-slug-hash="\$1" data-default-tab="result" ' +
                      'data-user="shamansir" class="codepen">See the Pen <a href="http://codepen.io/shamansir/pen/\$1/">\$1</a> ' +
                      'by Ulric Wilfred (<a href="http://codepen.io/shamansir">@shamansir</a>) on ' +
                      '<a href="http://codepen.io">CodePen</a>.</p>' +
                      '<script async src="' + protocol + 'assets.codepen.io/assets/embed/ei.js"></script>';
var injectCodepens = parser({
    name: 'inject-codepens',
    func: function(data) {
        return data.replace(codepenRe, codepenTemplate);
    }
});

var svgLogoRe = new RegExp('<!-- rpd-svg-logo: #([\-a-z]+) ([0-9]+) ([0-9]+) -->', 'g');
var svgLogoFile = fs.readFileSync("docs/rpd.svg", "utf8");
var injectSvgLogo = parser({
    name: 'inject-svg-logo',
    func: function(data) {
        return data.replace(svgLogoRe, svgLogoFile.replace('<svg', '<svg id="\$1" width="\$2px" height="\$3px"'));
    }
});

var renderer = new markdown.marked.Renderer();
var prevParagraphRender = renderer.paragraph;
renderer.paragraph = function(text) {
    return prevParagraphRender(checkNewLines(text));
}

function makeDocs(config, f) {
    var result = gulp.src('./docs/**/*.md');
    if (f) result = f(result);
    return result.pipe(frontMatter())
                 .pipe(markdown({
                     renderer: renderer,
                     highlight: function (code, lang, callback) {
                         //var highlighted = hljs.highlightAuto(code, lang ? [ (lang !== 'sh') ? lang : 'bash' ] : []);
                         var highlighted = hljs.highlight((lang === 'sh') ? 'gams' : lang, code);
                         //console.log('-------------');
                         //console.log(lang, highlighted.language);
                         //console.log('->');
                         //console.log(code);
                         //console.log('-------------');
                         callback(null, highlighted ? highlighted.value : '');
                         //return highlighted ? highlighted.value : '';
                     }
                 }))
                 .pipe(injectSvgLogo())
                 //.pipe(injectFiddles())
                 //.pipe(injectCodepens())
                 .pipe(layout(function(file) {
                      gutil.log(gutil.colors.red(file.frontMatter.id) + ': ' +
                                gutil.colors.yellow(file.frontMatter.title) + ' ' +
                                gutil.colors.green('(' + (file.frontMatter.level || 0) + ')'));
                      return {
                          doctype: 'html',
                          pretty: true,
                          'config': config,
                          front: file.frontMatter,
                          layout: './docs/layout.jade'
                      };
                  }))
                 .pipe(gulp.dest('./docs/compiled/'));
}

gulp.task('docs-clean-dir', function() {
    return del([ './docs/compiled/assets/**/*', './docs/compiled/**/*' ]);
});

gulp.task('docs-copy-dependencies', function() {
    var dependencies = ['./vendor/kefir.min.js',
                        './vendor/d3.v3.min.js',
                        './examples/docs-patch.js',
                        './dist/rpd-docs.css',
                        './dist/rpd-docs.min.js'];

    var lastChecked;
    try {
        dependencies.forEach(function(dependency) {
            lastChecked = dependency;
            fs.accessSync(dependency, fs.F_OK);
        });
    } catch(e) {
        var failedDependency = (lastChecked || 'Unknown');
        console.error(failedDependency + ' dependency wasn\'t met');
        gutil.log('First time before building docs (not every time)');
        gutil.log('Please call', gutil.colors.red('`gulp get-dev-deps`'), 'to get latest Kefir.js','(if you haven\'t yet)');
        gutil.log('and then, to generate RPD version for docs, call:');
        gutil.log(gutil.colors.red('`gulp --style compact-v --renderer svg --target-name rpd-docs`'));
        gutil.log('so then you will be safe to call', gutil.colors.yellow('`gulp docs`'), 'again');
        throw new Error('Dependency wasn\'t met: ' + failedDependency);
    }

    return gulp.src(dependencies)
               .pipe(gulp.dest('./docs/compiled/'));
});

gulp.task('docs-copy-assets', function() {
    return gulp.src([ './docs/assets/*.*' ])
               .pipe(gulp.dest('./docs/compiled/assets'));
});

gulp.task('docs-copy-root-assets', function() {
    return gulp.src(['./docs/*.js', './docs/*.css', './docs/*.svg', './docs/*.ico'])
               .pipe(gulp.dest('./docs/compiled/'));
});

gulp.task('docs-copy-highlight-css', function() {
    return gulp.src('./vendor/' + DOC_HIGHLIGHT_STYLE_FILENAME)
               .pipe(rename('highlight-js.min.css'))
               .pipe(gulp.dest('./docs/compiled/'));
});

gulp.task('docs', [ 'docs-clean-dir', 'docs-copy-dependencies',
                    'docs-copy-root-assets', 'docs-copy-assets',
                    'docs-copy-highlight-css' ], function() {

    //var utils = require('./docs/utils.js');
    var config = require('./docs/config.json');
    var result = makeDocs(config);
    console.log('Compiled docs to ./docs/compiled');
    return result;
});

gulp.task('docs-watch', ['docs-copy-dependencies', 'docs-copy-assets', 'docs-copy-highlight-css'], function() {
    //var utils = require('./docs/utils.js');
    var config = require('./docs/config.json');
    return makeDocs(config, function(result) {
        return result.pipe(watch('./docs/**/*.md'));
    });
    console.log('Will watch for docs updates...');
});

// Helpers =====================================================================

function checkPaths(argv) {
    if (argv.from) { Paths.Root = argv.from; }
    if (argv.to) { Paths.Destination = argv.to; }
}

function getCommandString(options) {
    var command = 'gulp';
    //if (options.from) command += ' --root ' + options.from;
    options.renderer.forEach(function(renderer) { command += ' --renderer ' + renderer; });
    options.style.forEach(function(style) { command += ' --style ' + style; });
    options.toolkit.forEach(function(toolkit) { command += ' --toolkit ' + toolkit; });
    options.io.forEach(function(io) { command += ' --io ' + io; });
    options.navigation.forEach(function(type) { command += ' --navigation ' + type; });
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
    ' * Selected Navigation Modules: ' + (options.navigation.length ? options.navigation.join(', ') : '[None]'),
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
    options.navigation.forEach(function(type) {
        list.push(Paths.Navigation(type) + '.js');
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
    console.log('  <meta charset=\'utf-8\' />');
    console.log();
    comment('Built with RPD v' + pkg.version + ' <http://shamansir.github.io/rpd>');
    console.log();
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
    options.navigation.forEach(function(type) {
        comment('RPD Navigation: ' + type);
        jsFile(Paths.Navigation(type) + '.js');
    });
    console.log('</head>');
    console.log('===========');
}

function checkNewLines(text) {
    if ((text.length == 1) && (text.charCodeAt(0) == 8203)) return '';
    if ((text.charCodeAt(0) == 8203) && (text.charCodeAt(1) == 10)) {
        text = text.slice(2);
    }
    if ((text.charCodeAt(text.length - 1) == 8203) && (text.charCodeAt(text.length - 2) == 10)) {
        text = text.slice(0, text.length - 2);
    }
    return text;
}
