// npm install --save-dev gulp gulp-download yargs

var gulp = require('gulp'),
    download = require('gulp-download');

var argv = require('yargs')
           .array('renderer')
           .array('style')
           .array('toolkit')
           .array('io')
           .default({
               renderer: [ 'svg' ],
               style: [ 'quartz' ],
               toolkit: [ 'core' ],
               io: []
           })
           .argv;

var Server = require('karma').Server;

var VENDOR = [ 'http://rpominov.github.io/kefir/dist/kefir.min.js'/*,
               'http://mohayonao.github.io/timbre.js/timbre.js',
               'http://player-dev.animatron.com/latest/bundle/animatron.min.js'*/ ];

gulp.task('default', ['build'], function() {
    console.log(argv);

});

gulp.task('get-deps', function() {
    download(VENDOR).pipe(gulp.dest('./vendor'));
});

gulp.task('build', function() {

});

gulp.task('test', function(done) {
    new Server({
        configFile: __dirname + '/spec/karma.conf.js',
        singleRun: true
    }, done).start();
});

gulp.task('html-head', function() {

});
