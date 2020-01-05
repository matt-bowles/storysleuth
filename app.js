// Requirements
var express = require('express');
var app = express();
var favicon = require('serve-favicon');
var path = require('path');

const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const passwordHash = require('password-hash');
const exphbs = require('express-handlebars');
const helpers = require('handlebars-helpers')();

app.use(bodyParser.json());

app.engine('handlebars', exphbs({
  // Customer helpers
  helpers: {
    'incrementByOne': (num) => { num++; return num; }
  }
}));
app.set('view engine', 'handlebars');

// Model imports
Score = require('./models/Score');
Playlist = require('./models/Playlist');
Game = require('./models/Game');
Account = require('./models/Account');

// Connect to Mongoose
mongoose.connect('mongodb://localhost:27017/whereami', {useNewUrlParser: true}, (err) => {
  if (err) throw err;
  console.log("Connected to MongoDB database!");
});
var db = mongoose.connection;

// Specify public directory (to serve static files)
app.use(express.static('public'));

// Use a favicon
app.use(favicon(path.join(__dirname, 'public', 'img/favicon.ico')));

// Home route
app.get('/', (req, res) => {
  res.render('home');
});

// High scores route
app.get('/leaderboard', (req, res) => {
  
  const n = 10;   // Number of high scores to be retrieved

  Score.getScores((err, scores) => {
    if (err) throw err;
    res.render('leaderboard', {scores: scores});
  }, parseInt(req.query.n));
})

// Score - POST
app.post('/api/score', (req, res) => {

  Score.addScore(req.body, (err) => {
    if (err) throw err;
    console.log("Score added!");
    res.json(req.body);
  });
});

// Score - GET
app.get('/api/score', (req, res) => {
  
  Score.getScores((err, scores) => {
    if (err) throw err;
    res.json(scores);
  }, parseInt(req.query.n));
});

// Playlist - GET
app.get('/api/playlist', (req, res) => {
  Playlist.getPlaylist(req.query, (playlist) => {
    res.send(playlist);
  });
});


// View game - GET
app.get('/game/:gameID', (req, res) => {
  var gameID = req.params.gameID;
  res.send(gameID);
});

// Game - POST
app.post('/api/game/', (req, res) => {
  Game.addGame(req.body, (err) => {
    if (err) throw err;
    console.log("Game added!");
    res.json(req.body);
  });
});

// Account - POST
app.post('/signup/', (req, res) => {
  Account.addAccount(req.query, (err) => {
    if (err) throw err;
    console.log("Account registered!");
  });
  res.send("Success");
});


// Run the web server using Express
app.listen(3000, () => console.log('The application is running on localhost:3000!'));