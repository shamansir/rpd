// Karma configuration
// Generated on Sat Jun 20 2015 01:21:00 GMT+0200 (CEST)

module.exports = function(config) {

  var options = {

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '..',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      './vendor/kefir.min.js',

      './src/rpd.js',
      './src/io/json.js',
      './src/io/plain.js',
      './src/navigation/browser.js',

      './spec/matchers.js',
      './spec/prettify.js',
      './spec/prepare.js',

      './spec/building/patch.spec.js',
      './spec/building/node.spec.js',
      './spec/building/inlet.spec.js',
      './spec/building/outlet.spec.js',
      './spec/building/link.spec.js',
      './spec/building/render.spec.js',

      './spec/registration/general.spec.js',

      './spec/registration/nodetype.spec.js',
      './spec/registration/channeltype.spec.js',

      './spec/registration/noderenderer.spec.js',
      './spec/registration/channelrenderer.spec.js',

      './spec/registration/renderer.spec.js',
      //'./spec/registration/subrenderer.spec.js',

      // './spec/history.spec.js',
      './spec/io.spec.js',
      './spec/navigation.spec.js'

    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['nyan'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],

    customLaunchers: {
      'Chrome_travis_ci': {
        base: 'Chrome',
        flags: ['--no-sandbox']
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false

  };

  if (process.env.TRAVIS) {
    options.browsers = ['Chrome_travis_ci'];
    options.reporters = ['mocha'];
  }

  config.set(options);

};
