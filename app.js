// Requirements
var express = require('express');
var snapMap = require('snapmap');
var app = express();
var fs = require('fs');
var favicon = require('serve-favicon');
var path = require('path');
var timeago = require("timeago.js");
var cities = require('./verifiedCities.json');
var goodCitiesFilename = 'verifiedCities.json';

// Constants
const RADIUS = 3000;   // in metres
const ZOOM = 2;        // between 2-18
const MIN_STORIES = 5; // the min. amount of stories a successful playlist must have

// Specify public directory (to serve static files)
app.use(express.static('public'));

// Use a favicon
app.use(favicon(path.join(__dirname, 'public', 'img/favicon.ico')));

// API
app.get('/api/', (req, res) => {
  getStories(res);
});

// home route
app.get('/', (req, res) => {
  res.sendFile(__dirname+'/views/home.html');
});

/**
 * Returns a playlist contains zero or many 'stories' for a given city
 * @param {*} res   The response object that will be sent to the browser
 * @param {*} city  The city for which the stories will be searched for
 */
function getStories(res) {
  var city = getCity();

  snapMap.getPlaylist(city.lat, city.lng, RADIUS, ZOOM)
    .then((pl) => { 
      console.log(pl.totalCount + " stories found!");

      // If stories exist, and the playlist contains the min. amount of stories...
      if (!isNaN(pl.totalCount) && pl.totalCount >= MIN_STORIES) {
        console.log("Successful city found!");
          // Process the playlist - e.g. get timestamp, URLS, etc.
          processPlaylist(pl, res, city);
      } 

      // Not enough stories, find new city
      else {
        console.log("Finding a new city...");
        getStories(res);
      }
    })
    .catch((error) => {
      console.log(error);
    });
}

/**
 * Pulls a random city JSON object from cities.json.
 */
function getCity() {
  // Find random city and print it
  do {
    var city = cities[Math.floor(Math.random()*cities.length)];
    console.log(city.city + ", " + city.country);
  } 

  // No USA mode!
  while (city.country === "United States");
  
  return city;
}

/**
 * 
 * @param {*} playlist  The playlist containing stories.
 * @param {*} res       The response object to be sent back to the client.
 * @param {*} city      The name of the city 
 */
function processPlaylist(playlist, res, city) {
  stories = [];   // Holds MIN_STORIES amount of stories

  // Get random stories from playlist
  for (var i=0; i<MIN_STORIES; i++) {

    // Make sure that the story hasn't already been picked.
    do {
      var num = [Math.floor(Math.random()*playlist.totalCount)]; 
    } while (stories.includes(playlist.elements[num]));

    stories.push({});

    // Get timestamp for each story - How long ago was the story posted?
    try {
      let timestamp = playlist.elements[num].timestamp;
      timestampInWords = timeago.format(timestamp);
      stories[i].timestamp = timestampInWords;
    } catch (e) {
      stories[i].timestamp = "Error getting timestamp";
      console.log(e);
      playlist.error = "Timestamp error";
      return res.send(playlist);
    }

    // It's a video
    if (playlist.elements[num].snapInfo.streamingMediaInfo) {
      // Find suffix (depending whether there is an overlay or not)
      var suffix = playlist.elements[num].snapInfo.streamingMediaInfo.mediaWithOverlayUrl 
      ? playlist.elements[num].snapInfo.streamingMediaInfo.mediaWithOverlayUrl
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

  console.log(city.city + ", " + city.country + " - " + playlist.totalCount + " stories found!");
  addCity(city); 

  // Initalise playlist object
  playlist = {};

  playlist.coords = {lat: city.lat, lng: city.lng};
  playlist.stories = stories;

  return res.send(playlist);
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

// Run the web server using Express
app.listen(3000, () => console.log('The application is running on localhost:3000!'));