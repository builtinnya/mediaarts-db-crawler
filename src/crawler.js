/**
 * Crawls and converts Media Arts Database into various formats.
 *
 * Usage: node crawler <outfile> [--converter=<converter>] [--format=<format>]
 *          [--key=<key>] [--start=<start>] [--end=<end>] [--step=<step>]
 */

'use strict';

var _ = require('lodash');
var argv = require('minimist')(process.argv.slice(2));
var request = require('superagent');
var P = require('bluebird');
var fs = P.promisifyAll(require('fs'));
var Crawler = require('crawler');
var ProgressBar = require('progress');
var debug = require('debug')('mediaarts-db-crawler');

var endpoints = require('./endpoints');
var converters = require('./converters');
var formatters = require('./formatters');


var main = function main(argv) {

  var converter = converters[argv.converter];
  if (!_.isFunction(converter)) {
    throw new Error('invalid converter: ' + argv.converter);
  }

  var formatter = formatters[argv.format];
  if (!_.isFunction(formatter)) {
    throw new Error('invalid format: ' + argv.format);
  }

  var requestURIs = _.chain(_.range(argv.start, argv.end + 1, argv.step))
        .map(function(id) { return endpoints.ANIME_ENDPOINT + id; })
        .value();

  var bar = new ProgressBar('progress [:bar] :current/:total (:percent) :elapsed elapsed, :etas remained', {
    complete: '=',
    incomplete: ' ',
    width: 60,
    total: requestURIs.length
  });

  var idKey = argv.key;
  var results = [];
  var initialIds = {};

  var c = new Crawler({
    forceUTF8: true,
    callback: function(err, result, $) {
      if (err) throw err;
      var r = converter.call(c, err, result, $);
      var obj = (function() {
        if (_.isArray(r) && r.length > 0) return r[0];
        else return r;
      })();
      var ids = (function() {
        if (_.isArray(r) && r.length > 2) return r[2];
        else return [];
      })();
      if (obj) results.push(obj);
      ids.forEach(function(id) {
        initialIds[id] = true;
      });
      bar.tick(1);
    },
    onDrain: function() {
      results = results.filter(function(result) {
        return !initialIds[result[idKey]];
      });
      var content = formatter(results, argv);
      fs.writeFileAsync(argv.outfile, content)
        .then(function() {
          process.exit(0);
        })
        .catch(function(err) {
          throw err;
        });
    }
  });

  c.queue(requestURIs);
};

var usage = function usage() {
  console.error('Usage: node crawler <outfile> [--converter=<converter>] [--format=<format>]\n' +
                '      [--key=<key>] [--start=<start>] [--end=<end>] [--step=<step>]');
};

if (require.main === module) {
  if (argv._.length < 1) {
    usage();
    process.exit(1);
  }

  main(_.defaults(argv, {
    outfile: argv._[0],
    converter: 'anime',
    format: 'json',
    key: 'アニメシリーズID',
    start: 1,
    end: 0,
    step: 1
  }));
}

module.exports = main;
