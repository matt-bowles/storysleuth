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
  return new Promise(function(resolve, reject) {
    
    var rounds = []; 

    // Populate rounds array
    for (i=0; i<numRounds; i++) {
      rounds.push(Playlist.getPlaylist(req.query, 0));
    }

    console.log();

    Promise.all(rounds).then((game) => {

      // Save game to db here
      addGame(game, (err, g) => {
        if (err) console.log(err);
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