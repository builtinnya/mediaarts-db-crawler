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


var ANIME_SERIES_ENDPOINT = 'http://mediaarts-db.jp/an/anime_series/';

var converters = {
  'anime': function() {}
};

var formatters = {
  'json': function(results) {
    return JSON.stringify(results, null, 2);
  }
};

var main = function main(argv) {

  var animes = [];

  var animeCrawler = function animeCrawler(err, result, $) {
    if (err) throw err;

    var animeObj = {};

    $('.main > .block').find('table.seriesTbl').each(function() {
      $(this).find('tr:has(th, td)').each(function() {
        $(this).find('th').each(function() {
          var header = $(this).text().trim();
          var data = $(this).next('td');
          animeObj[header] = data.text().trim();
        });
      });
    });

    $('.sub > .block').each(function() {
      var bigHeader = $(this).find('h3').contents().first().text().trim();
      var numItems = _.parseInt($(this).find('h3 > .number').text(), 10);
      var headers = $(this).find('table.seriesTbl2 thead th').map(function() {
        return $(this).text().trim();
      });

      animeObj[bigHeader] = [];

      $(this).find('table.seriesTbl2 tbody tr:has(td)').each(function() {
        var entry = {};
        $(this).find('td').each(function(index) {
          var header = headers[index];
          var data = $(this).text().trim();
          entry[header] = data;
        });
        animeObj[bigHeader].push(entry);
      });
    });

    console.log(animeObj);

    debug('done.');
  };

  var c = new Crawler({
    forceUTF8: true,
    callback: animeCrawler
  });

  c.queue([ ANIME_SERIES_ENDPOINT + '14261']);
};

if (require.main === module) {
  // if (argv._.length < 1)
  //   throw new Error('Usage: node crawler <outfile> [--converter=<converter>] [--format=<format>]');

  main(_.defaults(argv, {
    outfile: argv._[0] || 'animelist.json',
    converter: 'anime',
    format: 'json'
  }));
}

module.exports = main;
