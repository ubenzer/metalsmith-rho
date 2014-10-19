"use strict";
var debug = require("debug")("metalsmith-rho");
var _ = require("underscore");
var async = require("async");
var minimatch = require("minimatch");
var check = require("check-types");
var path = require("path");

function normalize(options) {
	var defaults = {
		blockCompiler: null,
		match: "**/*.md",
		extension: "html"
	};
	options = _.extend({}, defaults, options);

	return options;
}

/**
 * Metalsmith plugin that renders rho files to HTML.
 *
 * @param {Object} options
 * @return {Function}
 */
function plugin(options){
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
				if(check.object(options.blockCompiler)) {
					NormalizedRho = options.blockCompiler;
				} else if(check.fn(options.blockCompiler)) {
					NormalizedRho = options.blockCompiler(file, data);
				} else {
					NormalizedRho = require("rho").BlockCompiler;
				}

				var html = (new(NormalizedRho)).toHtml(data.contents.toString());
				data.contents = new Buffer(html);
				cb(null, html);
			};
    });

		async.parallel(convertFns, function(err) {
			if(err == null) {
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
			} else {
				debug("A file failed to compile.");
				require("process").exit(-2000);
			}
		});
  };
}

module.exports = plugin;
