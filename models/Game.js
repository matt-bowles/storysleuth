const mongoose = require('mongoose');

// Game schema
const gameSchema = mongoose.Schema({
  id: {
    type: Number,
    required: true
  }
});

const Game = module.exports = mongoose.model('Game', gameSchema);

// Get a game
module.exports.getGameById = (id, callback) => {
  Game.findById(id, callback);
}

// Add a game
module.exports.addGame = (game, callback) => {
  Game.create(game, callback);
}