const mongoose = require('mongoose');
const Playlist = require('./Playlist');

// Game schema
const gameSchema = mongoose.Schema({
  id: {
    type: Number,
    required: true
  }
});

const Game = module.exports = mongoose.model('Game', gameSchema);

// Generate a game
module.exports.generateGame = (req, numPlaylists=5) => {
  return new Promise(function(resolve, reject) {
    
    var promises = []; 

    for (i=0; i<numPlaylists; i++) {
      promises.push(Playlist.getPlaylist(req.query, 0));
    }

    console.log();

    Promise.all(promises).then((game) => {
      resolve(game);

      // Save game to db here
    })
  });
}

// Get a game
module.exports.getGameById = (id, callback) => {
  Game.findById(id, callback);
}

// Add a game
module.exports.addGame = (game, callback) => {
  Game.create(game, callback);
}