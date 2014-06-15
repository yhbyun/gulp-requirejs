var gutil       = require('gulp-util');
var requirejs   = require('requirejs');
var PluginError = gutil.PluginError;
var File        = gutil.File;
var es          = require('event-stream');
var tmp         = require('tmp');
var fs          = require('vinyl-fs');
var path        = require('path');

// Consts
const PLUGIN_NAME = 'gulp-requirejs';


module.exports = function(options) {

    'use strict';

    if (!options) {
        throw new PluginError(PLUGIN_NAME, 'Missing options array!');
    }

    // if optimize only one module, then the option `out` should be set
    // if `out` not set, then we take that as multi-modules optimize
    return options.out ? singleOptimize(options) : multiOptimize(options);
}

/**
 * Single Module Optimize
 *
 * @param {Object} options r.js options
 * @return {Stream}
 */
function singleOptimize(options) {

    var stream = es.pause();

    options.optimize = 'none';

    // very amazing, `out` can be set with a `function` as callback
    options.out = function (text) {
        stream.resume();
        stream.end(new File({
            path: _fName,
            contents: new Buffer(text)
        }));
    };

    requirejs.optimize(options);

    return stream;
}

/**
 * multi module optimize
 *
 * 1:  We will return a paused stream;
 * 2:  Then we will run the r.js but ignore the `dir` in options.
 *     Instead, we generate a tmp dir and replace the `dir` option
 *     to save the r.js optimization files;
 * 3:  Finally, we resume the stream and pipe these files (exclude
 *     build.txt) from tmp dir to the stream;
 *
 * @param {Object} options
 * @return {EventStream}
 */
function multiOptimize(options) {

    var dir = options.dir;
    var stream = es.pause();

    if (!!! options.dir) {
        tmp.dir({
            mode: 0777,
            prefix: 'gulp-requirejs-tmp-'
        }, function (err, tmpdir) {

          if (err) {
            throw err;
          }

          options.dir = tmpdir;
        });
    } else {
        tmpdir = options.dir;
    }

    requirejs.optimize(options, function (result) {
        stream.resume();
        fs.src([
            path.join(tmpdir, "/*.js"),
            path.join(tmpdir, "/*.css")
        ]).pipe(stream);
    }, function (err) {
        console.dir(err);
        throw err;
    });

    return stream;

}

