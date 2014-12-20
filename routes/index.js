var express = require('express');
var router = express.Router();

var cheerio = require('cheerio');
var request = require('request');
var mongoose = require('mongoose');
var Topic = mongoose.model('Topic');

if (process.env.NODE_ENV === 'production') {
    var constants = require('./../config/constants.prod.js');
} else {
    var constants = require('./../config/constants.dev.js');
}

/* GET home page. */
router.get('/', function(req, res) {
  res.redirect('https://github.com/karan/inside-api');
});

router.get('/:topic', function(req, res) {
  var topic = req.params.topic.toLowerCase();

  Topic.findOne({ topic: topic }, function(err, doc) {
    if (err) {
      return res.send(err);
    }

    if ((doc && doc.expires < Date.now()) || (!doc)) {
      // expired, scrape again, save and return
      getTopicSourcesAndAuthors(topic, function(err, sources, authors) {
        if (err) {
          return res.send(err);
        }

        save(topic, sources, authors, function(err, finalData) {
          if (err) {
            return res.send('Something went wrong.', 500);
          }

          return res.send({
            topic: finalData.topic,
            sources: finalData.sources,
            authors: finalData.authors
          }, 200);
        });
      });
    } else if (doc) {
      // topic not expired
      return res.send({
        topic: doc.topic,
        sources: doc.sources,
        authors: doc.authors
      }, 200);
    }
  });
});

function getTopicSourcesAndAuthors(topic, callback) {
  var url = 'https://www.inside.com/' + topic;

  request(url, function (error, response, body) {

    if (!error && response.statusCode == 200) {

      $ = cheerio.load(body);

      var sources = [];
      var authors = [];

      // get top sources
      var sources_li = $('.top-sources-container').find('li').find('a.link');
      for (var i = 0; i < sources_li.length; i++) {
        var this_source = $(sources_li[i]);
        sources.push({
          name: this_source.text().trim(),
          inside_link: 'https://www.inside.com' + this_source.attr('href')
        });
      }

      // get top authors
      var authors_li = $('.top-authors-container').find('li');
      for (var i = 0; i < authors_li.length; i++) {
        var this_author = $(authors_li[i]);
        authors.push({
          image: 'https://www.inside.com' + this_author.find('img').attr('src'),
          name: this_author.find('a.link').text().trim(),
          inside_link: 'https://www.inside.com' + this_author.find('a.link').attr('href'),
          twitter: this_author.find('.twitter').attr('href') || ''
        });
      }

      if (sources.length === sources_li.length && authors.length === authors_li.length) {
        callback(null, sources, authors);
      }

    } else {
      callback(response.statusCode, null);
    }

  });
}


function save(topic, sources, authors, callback) {
  new Topic({
    topic: topic,
    sources: sources,
    authors: authors
  }).save(function(err, doc) {
    if (err) {
      return callback(err, null);
    }

    callback(null, doc);
  });
}

module.exports = router;
