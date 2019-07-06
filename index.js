const express = require('express');
const snapMap = require('snapmap');
const ejs = require('ejs');
const app = express();

const cities = require('./cities.json');


app.set('view engine', 'ejs');



// home route
app.get('/', (req, res) => {

  var totalStories = 0;

  console.log("-----------------------------");
  console.log("--Looking for some stories!--");
  console.log("-----------------------------");
  
  do {
    var city = cities[Math.floor(Math.random()*cities.length)];
    console.log(city);
    snapMap.getPlaylist(city.lat, city.lng, 10000, 2).then(function(playlist) {
      // return res.send(playlist);
      if (!playlist.totalCount) {
        console.log("Breaking!");
        return
      } else {
        console.log("We shouldn't get here");
        console.log(playlist.totalCount + " stories found!");

        var story = playlist.elements[Math.floor(Math.random()*playlist.totalCount)];
        
        var storyURL = story.snapInfo.streamingMediaInfo.prefixUrl + story.snapInfo.streamingMediaInfo.mediaWithOverlayUrl;
      
        var timestamp = parseInt(new Date().getTime() - story.timestamp)/60/1000;
        return res.render('home', {storyURL: storyURL, timestamp: timestamp}); 
      }
       
     });
  } while (isNaN(totalStories) && totalStories != undefined && totalStories>0);
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));