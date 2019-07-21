const express = require('express');
const snapMap = require('snapmap');
const app = express();

const cities = require('./cities.json');

const RADIUS = 3000;   // in metres
const ZOOM = 2;        // between 2-18
const MIN_STORIES = 5; // the min. amount of stories a successful playlist must have


app.set('view engine', 'ejs');


// home route
app.get('/', (req, res) => {
  console.log();
  city = getCity();

  // Get stories for city
  playlist = getStories(res, city);
});


function getStories(res, city) {
  snapMap.getPlaylist(city.lat, city.lng, RADIUS, ZOOM)
    .then((pl) => { 
      console.log(pl.totalCount + " stories found!");
      if (!isNaN(pl.totalCount) && pl.totalCount >= MIN_STORIES) {
        console.log("Successful city found!");
        processPlaylist(pl, res, city);
        return;
      } else {
        // Find new city
        console.log("Finding a new city...");
        newCity = getCity();
        getStories(res, newCity);
      }
    })
    .catch((error) => {
      console.log(error);
    });
}

function getCity() {
  // Find city and print it
  do {
    var city = cities[Math.floor(Math.random()*cities.length)];
    console.log(city.city + ", " + city.country);
  } 
  // no USA
  while (city.country == "United States");
  
  return city;
}

function deleteCity(city) {
  console.log(cities.filter(function(data) {
    data.id == city.id;
  }));
  
}

function processPlaylist(playlist, res, city) {
  // Get random stories from playlist
  stories = [];

  for (var i=0; i<MIN_STORIES; i++) {
    var num = [Math.floor(Math.random()*playlist.totalCount)]; 

    stories.push(playlist.elements[num]);
    // delete playlist.elements[0];

    // get timestamp for each story - How long ago was the story posted?
    try {
      stories[i].timestamp = timeSince(stories[i].timestamp);
    } catch (e) {
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
    else {
      console.log("It's an image");
      stories[i].storyURL = stories[i].snapInfo.publicMediaInfo.publicImageMediaInfo.mediaUrl;
      stories[i].isImage = true;
    }
  }

  console.log(city.city + ", " + city.country + " - " + playlist.totalCount + " stories found!");

  // return res.send(stories); 
  return res.render('home', {stories: JSON.stringify(stories), lat: city.lat, long: city.lng}); 
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