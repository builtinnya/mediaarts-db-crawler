/**
 * Concatenates one or more formatted files.
 *
 * Usage: node concat [file ...] [--outfile=<outfile>] [--format=<format>]
 */

'use strict';

var _ = require('lodash');
var argv = require('minimist')(process.argv.slice(2));
var P = require('bluebird');
var fs = P.promisifyAll(require('fs'));
var debug = require('debug')('mediaarts-db-crawler:concat');


var readers = {
  json: function(fileContent) {
    return JSON.parse(fileContent);
  }
};

var converters = {
  json: function(object) {
    return JSON.stringify(object, null, 2);
  }
};

var main = function main(argv) {
  var read = readers[argv.format];
  var convert = converters[argv.format];
  if (!read || !convert) {
    throw new Error('invalid format: ' + argv.format);
  }

  var inputFiles = argv._;
  var outFile = argv.outfile;

  // Assumes that the result is an array
  P.reduce(inputFiles, function(result, inputFile) {
    return fs.readFileAsync(inputFile, 'utf8').then(function(contents) {
      return result.concat(read(contents));
    });
  }, []).then(function(result) {
    return fs.writeFileAsync(outFile, convert(result));
  }).catch(function(err) {
    throw err;
  });
};

var usage = function usage() {
  console.error('Usage: node concat [file ...] --outfile=<outfile> [--format=<format>]');
};

if (require.main === module) {
  if (argv._.length < 1 || !argv.outfile) {
    usage();
    process.exit(1);
  }

  main(_.defaults(argv, {
    format: 'json'
  }));
}

module.exports = main;
