// This module doesn't use a local database,
// instead it fetches data from Snapchat's API.

var snapMap = require('snapmap');
var cities = require('../verifiedCities.json');
var goodCitiesFilename = 'verifiedCities.json';

var timeago = require("timeago.js");
var fs = require('fs');
var path = require('path');


// Constants
const RADIUS = 3000;    // in metres
const ZOOM = 2;         // between 2-18
var numStories = 5;     // the min. amount of stories a successful playlist must have

/**
 * Returns a playlist contains zero or many 'stories' for a given city
 * @param {*} city  The city for which the stories will be searched for
 */
module.exports.getPlaylist = (req) => {

  return new Promise(async function(resolve, reject) {
    var pl, city;
    var timeoutCount = 0;
    
    // Repeat until timeout count is hit - prevents the server from sending too many requests to the Snapchat servers
    while (timeoutCount <= 2) {
      city = await getCity({ 
        include: req.include ? req.include.map(c => c.toLowerCase()) : null,
        exclude: req.exclude ? req.exclude.map(c => c.toLowerCase()) : null,
       });

      // A playlist that contains stories (i.e. a set of related clues for a single location)
      pl = await snapMap.getPlaylist(city.lat, city.lng, RADIUS, ZOOM);
      
      console.log(`${city.city}, ${city.country} - ${pl.totalCount} stories found!`);

      // If stories exist, and the playlist contains the min. amount of stories...
      if (!isNaN(pl.totalCount) && pl.totalCount >= numStories) {
        pl = await processPlaylist(pl, city);
        return resolve(pl);
      }
      else {
        timeoutCount++;
      }
    }
    
    // Timeout count hit
    reject({err: "Please refresh the page. We apologise for the inconvenience."});
  })
}

/**
 * Pulls a random city JSON object from cities.json.
 * @param options An object containing the following options:
 *        - include: an array of lowercase country names
 *        - exclude: an array of lowercase country names
 */
function getCity (options) {
  
  return new Promise(function(resolve, reject) {

    let filtered = cities;
    
    if (options.include) {
      filtered = cities.filter(c => (options.include).includes(c.country.toLowerCase()));
    } else if (options.exclude) {
      filtered = cities.filter(c => !(options.exclude).includes(c.country.toLowerCase()));
    }

    let city = filtered[Math.floor(Math.random()*filtered.length)];

    if (city) {
      resolve(city);
    } else {
      reject("No city found with provided options");
    }
  });
}

/**
 * 
 * @param {*} playlist  The playlist containing stories.
 * @param {*} city      The name of the city 
 */
function processPlaylist(playlist, city) {
  return new Promise(function(resolve, reject) {
    stories = [];   // Holds minStories amount of stories
    story_ids = [];
  
    // Get random stories from playlist
    for (var i=0; i<numStories; i++) {
  
      // Make sure that the story hasn't already been picked.
      do {
        var num = [Math.floor(Math.random()*playlist.totalCount)]; 
      } while (story_ids.includes(playlist.elements[num].id));
  
      stories.push({});
      story_ids.push(playlist.elements[num].id);
  
      // Get timestamp for each story - How long ago was the story posted?
      let timestamp = playlist.elements[num].timestamp;
      stories[i].timestamp = timeago.format(timestamp);
  
      // It's a video
      if (playlist.elements[num].snapInfo.streamingMediaInfo) {
        // Find suffix (depending whether there is an overlay or not)
        var suffix = playlist.elements[num].snapInfo.streamingMediaInfo.mediaWithOverlayUrl 
        // -- video has snapchat overlay --
        ? playlist.elements[num].snapInfo.streamingMediaInfo.mediaWithOverlayUrl
        // -- video doesn't have overlay --
        : playlist.elements[num].snapInfo.streamingMediaInfo.mediaUrl;
  
        stories[i].storyURL = playlist.elements[num].snapInfo.streamingMediaInfo.prefixUrl + suffix;
  
        stories[i].isImage = false;
      } 
      
      // It's an image
      else {
        stories[i].storyURL = playlist.elements[num].snapInfo.publicMediaInfo.publicImageMediaInfo.mediaUrl;
        stories[i].isImage = true;
      }
    }
  
    addCity(city); 
  
    // Initalise playlist object
    playlist = {};
  
    playlist.coords = {lat: city.lat, lng: city.lng};
    playlist.stories = stories;
    playlist.location = {city: city.city, country: city.country};
  
    resolve(playlist);
  });
}


/**
 * Adds a city to the curated list of verified cities. This should let rounds be loaded quicker.
 * @param {*} city A city object, containing: city[name], country, lat, lng.
 */
function addCity(city) {

  var cityData = {
    city: city.city,
    country: city.country,
    lat: city.lat,
    lng: city.lng
  };

  var data = fs.readFileSync(goodCitiesFilename);
  var goodCities = JSON.parse(data);

  // If the city is not already saved to the file, then add it.
  if (!goodCities.some(c => (c.lat == city.lat) && (c.lng == city.lng))) {
    goodCities.push(cityData);
    fs.writeFileSync(goodCitiesFilename, JSON.stringify(goodCities), function(err) {
      if (err) throw err;
    });
  }
}