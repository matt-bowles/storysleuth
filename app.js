// Requirements
var express = require('express');
var snapMap = require('snapmap');
var app = express();
var fs = require('fs');
var favicon = require('serve-favicon');
var path = require('path');
var cities = require('./verifiedCities.json');
var goodCitiesFilename = 'verifiedCities.json';

// Constants
const RADIUS = 3000;   // in metres
const ZOOM = 2;        // between 2-18
const MIN_STORIES = 5; // the min. amount of stories a successful playlist must have

// Things
const NEW_ROUND = "NEW_ROUND";
const NEW_GAME = "NEW_GAME";

// Set view engine
app.set('view engine', 'ejs');

// Specify public directory (to serve static files)
app.use(express.static('public'));

// Use a favicon
app.use(favicon(path.join(__dirname, 'public', 'img/favicon.ico')));

// API
app.get('/api/', (req, res) => {
  getStories(res, NEW_ROUND);
});

// home route
app.get('/', (req, res) => {
  console.log();

  // Get stories for a random city
  getStories(res, NEW_GAME);
});

/**
 * Returns a playlist contains zero or many 'stories' for a given city
 * @param {*} res   The response object that will be sent to the browser
 * @param {*} city  The city for which the stories will be searched for
 */
function getStories(res, onSuccess) {
  var city = getCity();

  snapMap.getPlaylist(city.lat, city.lng, RADIUS, ZOOM)
    .then((pl) => { 
      console.log(pl.totalCount + " stories found!");

      // If stories exist, an d the playlist contains the min. amount of stories...
      if (!isNaN(pl.totalCount) && pl.totalCount >= MIN_STORIES) {
        console.log("Successful city found!");
          // Process the playlist - e.g. get timestamp, URLS, etc.
          processPlaylist(pl, res, city, onSuccess);
      } 

      // Not enough stories, find new city
      else {
        console.log("Finding a new city...");
        getStories(res, onSuccess);
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
  while (city.country == "United States");
  
  return city;
}

/**
 * 
 * @param {*} playlist  The playlist containing stories.
 * @param {*} res       The response object to be sent back to the client.
 * @param {*} city      The name of the city 
 */
function processPlaylist(playlist, res, city, onSuccess) {
  stories = [];   // Holds MIN_STORIES amount of stories

  // Get random stories from playlist
  for (var i=0; i<MIN_STORIES; i++) {

    // Make sure that the story hasn't already been picked.
    do {
      var num = [Math.floor(Math.random()*playlist.totalCount)]; 
    } while (stories.includes(playlist.elements[num]));

    stories.push(playlist.elements[num]);

    // Get timestamp for each story - How long ago was the story posted?
    try {
      stories[i].timestamp = timeSince(stories[i].timestamp/1000);
    } catch (e) {
      stories[i].timestamp = "Error getting timestamp";
      console.log(e);
      playlist.error = "Timestamp error";
      return res.send(playlist);
    }

    // It's a video
    if (stories[i].snapInfo.streamingMediaInfo) {
      var suffix = stories[i].snapInfo.streamingMediaInfo.mediaWithOverlayUrl ? stories[i].snapInfo.streamingMediaInfo.mediaWithOverlayUrl : stories[i].snapInfo.streamingMediaInfo.mediaUrl;
      stories[i].storyURL = stories[i].snapInfo.streamingMediaInfo.prefixUrl + suffix;
    } 
    
    // It's an image
    // TODO: deal with this or something
    else {
      console.log("It's an image");
      stories[i].storyURL = stories[i].snapInfo.publicMediaInfo.publicImageMediaInfo.mediaUrl;
      stories[i].isImage = true;
    }
  }

  console.log(city.city + ", " + city.country + " - " + playlist.totalCount + " stories found!");
  addCity(city); 

  // Initalise playlist object
  playlist = {};

  playlist.coords = {lat: city.lat, lng: city.lng};
  playlist.stories = stories;

  if (onSuccess == NEW_ROUND) {
    // Send only the JSON file
    return res.send(playlist); 
  } else if (onSuccess == NEW_GAME) {
    // Format the page using the JSON file
    return res.render('home', {playlist: JSON.stringify(playlist)});
  } 
}

/**
 * Converts a unix timestamp into a time string (e.g. 50 minutes ago, 6 hours ago, etc.)
 * @param {*} timeStamp A unix timestamp
 */
function timeSince(timeStamp) {
  var now = Math.round((new Date()).getTime()/1000);
  var secondsPast = (now - timeStamp);
  if(secondsPast < 60){
    return parseInt(secondsPast) + ' seconds ago';
  }
  if(secondsPast < 3600){
    return parseInt(secondsPast/60) + ' minutes ago';
  }
  if(secondsPast <= 86400){
    return parseInt(secondsPast/3600) + ' hours ago';
  }
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
  if (!goodCities.some(c => (c.lat == city.lat) && (c.lng == city.lng))) {
    goodCities.push(cityData);
    fs.writeFileSync(goodCitiesFilename, JSON.stringify(goodCities), function(err) {
      if (err) throw err;
    });
  }
}

// Run the web server using Express
app.listen(3000, () => console.log('The application is running on localhost:3000!'));