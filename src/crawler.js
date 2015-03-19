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


var main = function main(argv) {

  var converter = converters[argv.converter];
  if (!_.isFunction(converter)) {
    throw new Error('undefined converter: ' + argv.converter);
  }

  var results = [];

  var c = new Crawler({
    forceUTF8: true,
    callback: function(err, result, $) {
      var obj = converter(err, result, $);
      if (obj) results.push(obj);
    },
    onDrain: function() {
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    }
  });

  c.queue([ endpoints.ANIME_ENDPOINT + '14261']);
};

if (require.main === module) {
  main(_.defaults(argv, {
    outfile: argv._[0] || 'animelist.json',
    converter: 'anime',
    format: 'json'
  }));
}

module.exports = main;
