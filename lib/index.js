"use strict";
var debug = require("debug")("metalsmith-rho");
var _ = require("lodash");
var async = require("async");
var minimatch = require("minimatch");
var path = require("path");

/**
 * Metalsmith plugin that renders rho files to HTML.
 *
 * @param {Object} options
 * @return {Function}
 */
function plugin(options) {
  options = normalize(options);

  return function(files, metalsmith, done) {
    var tbConvertedFiles = _.filter(Object.keys(files), function(file) {
      return minimatch(file, options.match);
    });

    var convertFns = _.map(tbConvertedFiles, function(file) {
      debug("Asyncly converting file %s", file);
      var data = files[file];

      return function(cb) {
        var NormalizedRho = null;
        if (_.isPlainObject(options.blockCompiler)) {
          NormalizedRho = options.blockCompiler;
        } else if (_.isFunction(options.blockCompiler)) {
          NormalizedRho = options.blockCompiler(files, file, data);
        } else {
          NormalizedRho = require("rho").BlockCompiler;
        }

        var html = (new NormalizedRho()).toHtml(data.contents.toString());
        data.contents = new Buffer(html);
        cb(null, html);
      };
    });

    async.parallel(convertFns, function(err) {
      if (err) {
        debug("A file failed to compile: %s", err);
        done(new Error());
      }

      _.forEach(tbConvertedFiles, function(file) {
        var contents = files[file];
        var extension = path.extname(file);
        var fileNameWoExt = path.basename(file, extension);
        var dirname = path.dirname(file);
        var renamedFile = path.join(dirname, fileNameWoExt + "." + options.extension);
        files[renamedFile] = contents;

        delete files[file];
      });
      done();
    });
  };
}

function normalize(options) {
  var defaults = {
    blockCompiler: null,
    match: "**/*.rho",
    extension: "html"
  };
  options = _.merge({}, defaults, options);

  return options;
}

module.exports = plugin;
