'use strict';

var _ = require('lodash');
var url = require('url');
var debug = require('debug')('mediaarts-db-crawler:anime');


var extractors = {
  // Extracts and parses list-like data
  list: function(animeObj, header, $, uri) {
    var entries = $(this).find('> p').text().split('／').map(_.trim);
    var ids = $(this).find('dl:contains("典拠ID") > dd').text().trim().split('／').map(_.trim);
    var entities = entries.map(function(entry, index) {
      var matches = entry.match(/(\[([^\]]+)\]|【([^】]+)】)\s*(\S+)/);
      if (!matches) {
        debug('cannot parse ' + header + ' entry: ' + entry);
        return null;
      }
      var role = matches[2] || matches[3];
      var name = matches[4];
      return {
        role: role,
        name: name
      };
    });
    // Overrides data iff the field is empty
    if (!animeObj[header] || animeObj[header] === '-' || animeObj[header] === 'NULL') {
      animeObj[header] = {
        '典拠ID': _.compact(ids),
        entities: _.compact(entities)
      };
    }
  },

  // Extracts atomic data
  default: function(animeObj, header, $, uri) {
    // Overrides data iff the field is empty
    if (!animeObj[header] || animeObj[header] === '-' || animeObj[header] === 'NULL')
      animeObj[header] = this.text().trim();
  }
};

module.exports = function(err, result, $) {
  if (err) throw err;

  // Saves the Crawler object to make other requests
  var crawler = this;

  // The full URI for this page
  var uri = result.request.uri.href;

  // This will be the resultant object
  var animeObj = {
    uri: uri
  };

  // This will be the initial research anime IDs
  var initialIds = [];

  // Extracts the left-side data
  $('.main > .block').find('table.seriesTbl').each(function() {
    $(this).find('tr:has(th, td)').each(function() {
      $(this).find('th').each(function() {
        var header = $(this).text().trim();
        var dataElem = $(this).next('td');
        var extract = extractors[header] ||
              ($(dataElem).is(':contains("典拠ID")') ? extractors.list : extractors.default);
        extract.call(dataElem, animeObj, header, $, uri, dataElem);
      });
    });
  });

  // Extracts the initial research data
  if ($('.main').find('> .moreBlock > .moreContents').length) {
    debug('extracting the initial research data...');
    $('.moreBlock > .moreContents > .block').find('table.seriesTbl').each(function() {
      $(this).find('tr:has(th, td)').each(function() {
        $(this).find('th').each(function() {
          var header = $(this).text().trim();
          var dataElem = $(this).next('td');
          if (header === 'アニメシリーズID') {
            debug('mark as seen: ' + dataElem.text().trim());
            initialIds.push(dataElem.text().trim());
          }
          var extract = extractors[header] ||
                ($(dataElem).is(':contains("典拠ID")') ? extractors.list : extractors.default);
          extract.call(dataElem, animeObj, header, $, uri, dataElem);
        });
      });
    });
  }

  // Extracts the right-side data
  $('.sub > .block').each(function() {
    var bigHeader = $(this).find('h3').contents().first().text().trim();
    var numItems = _.parseInt($(this).find('h3 > .number').text(), 10);
    var headers = $(this).find('table.seriesTbl2 thead th').map(function() {
      return $(this).text().trim();
    });

    animeObj[bigHeader] = [];

    // Episodes: makes another request
    if (bigHeader === '各話情報') {
      var episodesSlug = $(this).find('p.moveStory a').first().attr('href');
      if (!episodesSlug) {
        debug('cannot compose episode list uri');
        return;
      }
      // Uses 'asf%5Bper%5D=9999999' to extract all episodes at once
      var episodesUri = url.resolve(uri, episodesSlug + '?asf%5Bper%5D=9999999');
      crawler.queue({
        uri: episodesUri,
        callback: function(err, result, $) {
          if (err) throw err;
          var episodeHeaders = $('table.storyTbl thead').find('th').map(function() {
            return $(this).text().trim();
          });
          $('table.storyTbl tbody').find('tr:has(td)').each(function() {
            var entry = {};
            $(this).find('td').each(function(index) {
              var header = episodeHeaders[index];
              var data = $(this).contents().first().text().trim();
              entry[header] = data;
            });
            animeObj[bigHeader].push(entry);
          });
        }
      });
      return;
    }

    // Default: just extracts table data
    $(this).find('table.seriesTbl2 tbody tr:has(td)').each(function() {
      var entry = {};
      $(this).find('td').each(function(index) {
        var header = headers[index];
        var data = $(this).text().trim();
        var link = $(this).find('a').attr('href');
        if (link) entry.link = url.resolve(uri, link);
        entry[header] = data;
      });
      animeObj[bigHeader].push(entry);
    });

    // Packages: makes additional requests to extract more data
    if (bigHeader === 'パッケージ情報') {
      animeObj[bigHeader].forEach(function(animePackage) {
        var link = animePackage.link;
        if (!link) {
          debug('no link for the package: ' + animePackage['タイトル']);
          return;
        }
        crawler.queue({
          uri: link,
          callback: function(err, result, $) {
            if (err) throw err;
            var nbn = $('table.documentTbl tbody tr th:contains("全国書誌番号")').next('td').text().trim();
            if (nbn) animePackage.nbn = nbn;
            var ndlLink = $('table.documentTbl2 tbody tr th:contains("登録番号")').next('td').find('a').attr('href');
            if (ndlLink) animePackage.ndlLink = ndlLink;
          }
        });
      });
    }
  });

  return [ animeObj, 'アニメシリーズID', initialIds ];
};
