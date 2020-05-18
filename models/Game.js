const mongoose = require('mongoose');
const Playlist = require('./Playlist');

// Coords schema
const coordsSchema = mongoose.Schema({
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  }
})

// Story schema
const storySchema = mongoose.Schema({
  timestamp: {
    type: String,
    required: true
  },
  storyURL: {
    type: String,
    required: true
  },
  isImage: {
    type: Boolean,
    required: true
  }
})

// Location schema
const locationSchema = mongoose.Schema({
  city: { type: String },
  country: { type: String }
})

// Round schema
const roundSchema = mongoose.Schema({
  coords: coordsSchema,
  location: locationSchema,
  stories: [storySchema]
})

// Game schema
const gameSchema = mongoose.Schema({
  rounds: [roundSchema]
});

const Game = module.exports = mongoose.model('Game', gameSchema);

// Generate a game
module.exports.generateGame = (req, numRounds=5) => {
  console.log();  // Log a blank for console clarity
  
  return new Promise(async function(resolve, reject) {
    
    // Essentially the "game" - a collection of rounds
    var rounds = []; 
    
    // Populate game with as many rounds as required (dictated by numRounds)
    while (rounds.length < numRounds) {
      try {
        let round = await Playlist.getPlaylist(req.query)
        rounds.push(round);
      } catch (err) {
        console.log("Error - too many requests, not enough successful playlists");
        return reject(err);
      }
    }
    
    // Save game to database and fulfill promise
    Promise.all(rounds).then((game) => {
      addGame(game, (err, g) => {
        if (err) console.log(err);
        console.log("Game generated!");
        resolve(g);
      })
    })
  });
}

// Get a game
module.exports.getGameById = (id, callback) => {
  Game.findById(id, callback);
}

// Add a game
function addGame(game, callback) {
  var g = {};
  g.rounds = [];

  game.forEach(round => {
    g.rounds.push(round);
  });

  Game.create(g, callback);
}