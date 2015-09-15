// npm install --save-dev gulp yargs

var gulp = require('gulp');

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

gulp.task('default', function() {
    console.log(argv);
  // place code for your default task here
});

gulp.task('get-deps', function() {

});

gulp.task('build', function() {

});

gulp.task('test', function() {

});
