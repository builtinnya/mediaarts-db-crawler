'use strict';

var _ = require('lodash');
var debug = require('debug')('mediaarts-db-crawler:anime');


var extractors = {
  list: function(animeObj, header, $) {
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
    animeObj[header] = {
      '典拠ID': _.compact(ids),
      entities: _.compact(entities)
    };
  },

  default: function(animeObj, header, $) {
    animeObj[header] = this.text().trim();
  }
};

module.exports = function(err, result, $) {
  if (err) throw err;

  var animeObj = {};

  $('.main > .block').find('table.seriesTbl').each(function() {
    $(this).find('tr:has(th, td)').each(function() {
      $(this).find('th').each(function() {
        var header = $(this).text().trim();
        var dataElem = $(this).next('td');
        var extract = extractors[header] ||
              ($(dataElem).is(':contains("典拠ID")') ? extractors.list : extractors.default);
        extract.call(dataElem, animeObj, header, $, dataElem);
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

  return animeObj;
};
