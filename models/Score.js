const mongoose = require('mongoose');

// Round score schema
const roundScoreSchema = mongoose.Schema({
  roundScore: {
    type: Number,
    required: true
  },
  guessLat: {
    type: Number,
    required: true,
  },
  guessLng: {
    type: Number,
    required: true
  }
})

// Score schema
const scoreSchema = mongoose.Schema({
  score: {
    type: Number,
    required: true
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    ref: "Account"
  },
  roundScores: [roundScoreSchema],
  game: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Game"
  },
  create_date: {
    type: Date,
    default: Date.now
  }
});

const Score = module.exports = mongoose.model('Score', scoreSchema);

// Get scores
module.exports.getScores = (callback, limit) => {
  Score.find(callback).limit(limit).sort([['score', 'asc']]);
}

// Add score
module.exports.addScore = (req, callback) => {
  var accId = (req.isAuthenticated()) ? req.user._id : null;
  score = req.body;

  Score.create({score: score.score, account: accId, roundScores: score.roundScores, game: score.gameId}, callback);
}