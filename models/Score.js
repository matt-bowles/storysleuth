const mongoose = require('mongoose');

// Score schema
const scoreSchema = mongoose.Schema({
  score: {
    type: Number,
    required: true
  },
  account: {
    type: String,
    default: "A player"
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
module.exports.addScore = (score, callback) => {
  Score.create({score: score.score, user: score.user}, callback);
}