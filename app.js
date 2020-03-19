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
const bcrypt = require('bcryptjs');
const moment = require('moment');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const inititalisePassport = require('./config/passport');

inititalisePassport(passport);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(flash());
app.use(session({ secret: "sneakret", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.engine('handlebars', exphbs({
  // Customer helpers
  helpers: {
    'incrementByOne': (num) => { num++; return num },
    'formatDate': (date) => { return moment(date).format('DD MMMM YYYY') },
    'bestScore': (games) => {
      let bestGame = games.reduce((min, game) => min.score < game.score ? min : game);
      return { id: bestGame.id, score: bestGame.score };
    }
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

// Home route (the "game")
app.get('/', (req, res) => {
  res.render('game', getSessionInfo(req));
});

app.get('/login', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/signup', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  res.render('signup', getSessionInfo(req));
});

// Account - GET (view)
app.get('/players/:id', async (req, res) => {
  
  try {
  var acc = await Account.findById(req.params.id);
  var games = await Score.find({ account: acc.id }).sort({create_date: 'desc'}).limit(10);
  } catch(err) {
    // TODO: send 404 page
    res.status(404).json({ error: "Invalid account id" })
  }

  Score.find({account: acc.id}, 'score').then((scores, err) => {
    if (err) throw err;

    // Calculate best/avg using ALL games
    let bestGame = scores.reduce((min, game) => min.score < game.score ? min : game)
    let avgScore = Math.round(scores.reduce((total, next) => total + next.score, 0) / scores.length);

    res.render('account', {acc, games, bestGame, avgScore});
  })
});

// Account - POST
app.post('/signup/', (req, res) => {
  Account.addAccount(req.body, (err) => {
    if (err) throw err;
    console.log("Account registered!");
  });
  res.send("Success", getSessionInfo(req));
});

// High scores route
app.get('/leaderboard', (req, res) => {
  
  const n = 15;   // Number of high scores to be retrieved

  Score.find().populate('account', 'username').sort('score').limit(n).then((scores, err) => {
    if (err) throw err;
    return res.render('leaderboard', {scores: scores});
  });
});

// Score - POST
app.post('/api/score', (req, res) => {

  Score.addScore(req, (err) => {
    if (err) throw err;
    res.sendStatus(200);
  });
});

// Top scores - GET
app.get('/api/score', (req, res) => {
  
  Score.getScores((err, scores) => {
    if (err) throw err;
    res.json(scores);
  }, parseInt(req.query.n));
});

// Playlist - GET
app.get('/api/playlist', (req, res) => {
  console.log()
  Playlist.getPlaylist(req.query, 0).then((pl) => {
    res.send(pl);
  })
  
  .catch((err) => {
    res.send(err);
  });
});

// Generate new game - GET
app.get('/api/game', (req, res) => {
  Game.generateGame(req).then((game) => {
    res.send(game);
  })
});

// View game - GET
app.get('/games/:gameID', (req, res) => {
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

function getSessionInfo(req) {
  return {
    isLoggedIn: req.isAuthenticated(),
  }
}

// Run the web server using Express
app.listen(3000, () => console.log('The application is running on localhost:3000!'));