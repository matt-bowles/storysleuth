// Requirements
var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');
var favicon = require('serve-favicon');


const mongoose = require('mongoose');
const bodyParser = require('body-parser');

app.use(bodyParser.json());

Score = require('./models/Score');
Playlist = require('./models/Playlist');

// Connect to Mongoose
mongoose.connect('mongodb://localhost:27017/whereami', {useNewUrlParser: true});
var db = mongoose.connection;

// Specify public directory (to serve static files)
app.use(express.static('public'));

// Use a favicon
app.use(favicon(path.join(__dirname, 'public', 'img/favicon.ico')));

// Home route
app.get('/', (req, res) => {
  res.sendFile(__dirname+'/views/home.html');
});

// Score - POST
app.post('/api/score', (req, res) => {

  Score.addScore(req.body, (err) => {
    if (err) throw err;
    console.log("Score added!");
    res.json(req.body);
  });
});

// Score - GET
app.get('/api/score', (req, res) => {
  
  Score.getScores((err, scores) => {
    if (err) throw err;
    res.json(scores);
  });
});

// Playlist - GET
app.get('/api/playlist', (req, res) => {

  Playlist.getPlaylist(req.query, (playlist) => {
    res.send(playlist);
  });
});


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