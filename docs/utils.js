var through = require('through2');

function injectFiddles() {
    return through.obj(function (file, enc, cb) {
            console.log(file.contents);
    });
}

module.exports = {
    injectFiddles: injectFiddles
}
