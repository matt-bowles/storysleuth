const express = require('express');
const snapMap = require('snapmap');
const ejs = require('ejs');
const app = express();

const cities = require('./cities.json');

const RADIUS = 3000;   // in metres
const ZOOM = 2;        // between 2-18
const MIN_STORIES = 3; // the min. amount of stories a successful playlist must have


app.set('view engine', 'ejs');



// home route
app.get('/', (req, res) => {
  // var data = getStories();9
  console.log();
  city = getCity();

  // Get stories for city
  playlist = getStory(res, city);

  // return res.render('home', {storyURL: "storyURL", timestamp: timestamp}); 
});


function getStory(res, city) {
  snapMap.getPlaylist(city.lat, city.lng, RADIUS, ZOOM)
    .then((pl) => { 
      console.log(pl.totalCount + " stories found!");
      if (!isNaN(pl.totalCount) && pl.totalCount >= MIN_STORIES) {
        console.log("Doing shit...");
        console.log(city.lat + ", " + city.lng);
        doShit(pl, res);
      }

      // Story is rejected
      else {
        // Delete city from cities.json
        // cities.filter(function(data) {
        //   return data.id !== city.id;
        // });

        // Find new city
        console.log("Finding a new city...");
        newCity = getCity();
        getStory(res, newCity);
      }
    })
    .catch((error) => {
      console.log(error);
    });
}

function getCity() {
  // Find city and print it
  var city = cities[Math.floor(Math.random()*cities.length)];
  console.log(city.city + ", " + city.country);
  return city;
}

function deleteCity(city) {
  console.log(cities.filter(function(data) {
    data.id == city.id;
  }));
  
}

function doShit(playlist, res) {
  // Get random story from playlist
  var story = playlist.elements[Math.floor(Math.random()*playlist.totalCount)];

  try {
  var suffix = (story.snapInfo.streamingMediaInfo.mediaWithOverlayUrl) ? story.snapInfo.streamingMediaInfo.mediaWithOverlayUrl : story.snapInfo.streamingMediaInfo.mediaUrl;
  } catch (err) {
    console.log("wtf happened bro");
    console.log("Finding a new city...");
    city = getCity();
    return getStory(res, city);
  }
  var storyURL = story.snapInfo.streamingMediaInfo.prefixUrl + suffix;

  // How long ago was the story posted?
  var timestamp = timeSince(story.timestamp);

  console.log(city.city + ", " + city.country + " - " + playlist.totalCount + " stories found!");

  // return res.send(playlist); 
  return res.render('home', {storyURL: storyURL, timestamp: timestamp, lat: city.lat, long: city.lng}); 
}

function timeSince(timeStamp) {
  var now = new Date(),
    secondsPast = (now.getTime() - timeStamp) / 1000;
  if(secondsPast < 60){
    return parseInt(secondsPast) + ' seconds ago';
  }
  if(secondsPast < 3600){
    return parseInt(secondsPast/60) + ' minutes ago';
  }
  if(secondsPast <= 86400){
    return parseInt(secondsPast/3600) + ' hours ago';
  }
  if(secondsPast > 86400){
      day = timeStamp.getDate();
      month = timeStamp.toDateString().match(/ [a-zA-Z]*/)[0].replace(" ","");
      year = timeStamp.getFullYear() == now.getFullYear() ? "" :  " "+timeStamp.getFullYear();
      return day + " " + month + year;
  }
}

app.listen(3000, () => console.log('The application is running on localhost:3000!'));