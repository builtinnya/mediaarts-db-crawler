'use strict';

var _ = require('lodash');


module.exports = function(err, result, $) {
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

  return animeObj;
};
