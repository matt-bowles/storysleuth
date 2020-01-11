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

// Round schema
const roundSchema = mongoose.Schema({
  coords: coordsSchema,
  stories: [storySchema]
})

// Game schema
const gameSchema = mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  rounds: [roundSchema]
});

const Game = module.exports = mongoose.model('Game', gameSchema);

// Generate a game
module.exports.generateGame = (req, numRounds=5) => {
  return new Promise(function(resolve, reject) {
    
    var rounds = []; 

    for (i=0; i<numRounds; i++) {
      rounds.push(Playlist.getPlaylist(req.query, 0));
    }

    console.log();

    Promise.all(rounds).then((game) => {
      game.id = 1;
      resolve(game);

      // Save game to db here
      addGame(game, (err) => {
        if (err) console.log(err);
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
  g.id = game.id;
  g.rounds = [];

  game.forEach(round => {
    g.rounds.push(round);
  });

  Game.create(g, callback);
}