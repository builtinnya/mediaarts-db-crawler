/**
 * Crawls and converts Media Arts Database into various formats.
 *
 * Usage: node crawler <outfile> [--converter=<converter>] [--format=<format>]
 */

'use strict';

var _ = require('lodash');
var argv = require('minimist')(process.argv.slice(2));
var request = require('superagent');
var P = require('bluebird');
var fs = P.promisifyAll(require('fs'));
var Crawler = require('crawler');
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

  var results = [];
  var seen = {};

  var c = new Crawler({
    forceUTF8: true,
    callback: function(err, result, $) {
      if (err) throw err;
      var r = converter.call(c, err, result, $);
      var obj = (function() {
        if (_.isArray(r) && r.length > 0) return r[0];
        else return r;
      })();
      var idKey = (function() {
        if (_.isArray(r) && r.length > 1) return r[1];
        else return null;
      })();
      var seenIds = (function() {
        if (_.isArray(r) && r.length > 2) return r[2];
        else return [];
      })();
      if (obj) {
        if (!seen[obj[idKey]]) {
          debug('adding object: ' + obj[idKey]);
          results.push(obj);
        } else {
          debug('already seen: ' + obj[idKey]);
        }
      } else {
        debug('no object returned');
      }
      seenIds.forEach(function(id) {
        seen[id] = true;
      });
    },
    onDrain: function() {
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

  c.queue([ endpoints.ANIME_ENDPOINT + '14261', endpoints.ANIME_ENDPOINT + '14262']);
};

if (require.main === module) {
  main(_.defaults(argv, {
    outfile: argv._[0] || 'animelist.json',
    converter: 'anime',
    format: 'json'
  }));
}

module.exports = main;
