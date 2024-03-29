// Requirements
var express = require('express');
var app = express();
var favicon = require('serve-favicon');
var path = require('path');
require('dotenv').config();   // Requires a .env file to be located in the root directory

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
  // Custom helpers
  helpers: {
    'incrementByOne': (num) => { num++; return num },
    'formatDate': (date) => { return moment(date).format('DD MMMM YYYY') },
    'bestScore': (games) => {
      let bestGame = games.reduce((min, game) => min.score < game.score ? min : game);
      return { id: bestGame.id, score: bestGame.score };
    },
    'truncateUsername': (name) => {
      const maxLen = 45;
      return (name.length > maxLen) ? `<span title="${name}">${name.substring(0, maxLen)}...</span>` : name;
    }
  }
}));
app.set('view engine', 'handlebars');

// Model imports
Score = require('./models/Score');
Playlist = require('./models/Playlist');
Game = require('./models/Game');
Account = require('./models/Account');

// Connect to MongoDB via Mongoose
mongoose.connect(process.env.CONNECTION_STRING, {useNewUrlParser: true}, (err) => {
  if (err) throw err;
  console.log("Connected to MongoDB database!");
});
var db = mongoose.connection;

// Specify public directory (to serve static files)
app.use(express.static('public'));

// Use a favicon
app.use(favicon(path.join(__dirname, 'public', 'img/favicon.png')));

// Home/about route
app.get('/', (req, res) => {
  res.render('home', getSessionInfo(req));
});

// The "game"
app.get('/play', (req, res) => {
  let info = getSessionInfo(req);

  res.render('game', { layout: "game-layout", username: info.username, isLoggedIn: info.isLoggedIn, id: info.id });
});

app.get('/login', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true,
  successFlash: true
}));

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/signup', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  req.flash('messages.success', "Account created");
  res.render('signup');
});

// Account - GET (view)
app.get('/players/:id', async (req, res) => {
  
  let info = getSessionInfo(req);

  try {
    info.acc = await Account.findById(req.params.id).lean();

    info.games = await Score.find({ account: info.acc._id }).sort({create_date: 'desc'}).lean();
    info.recentGames = info.games.slice(0, 10);

    // Determines whether or not the "settings" button should be displayed
    // (user must be logged in as the correct account)
    info.displaySettingsButton = (req.isAuthenticated() && req.user._id === req.params.id);
  } catch(err) {
    console.log(err);
    return res.render('404', getSessionInfo(req));
  }

  // This object holds statistical information about the player, e.g. worst/best game, average score, etc.
  info.stats = {}

  // Calculate best/avg using ALL games 
  if (info.games.length > 0) {
    info.stats.bestGame = info.games.reduce((min, game) => min.score > game.score ? min : game);
    info.stats.worstGame = info.games.reduce((min, game) => min.score < game.score ? min : game);
    info.stats.avgScore = Math.round(info.games.reduce((total, next) => total + next.score, 0) / info.games.length);
    info.stats.numPerfectGames = info.games.filter(game => game.score >= 25000).length;
    info.stats.numPerfectRounds = 0;

    // TODO: rewrite - probably not very efficient
    // Calculate number of perfect rounds
    info.games.forEach((game) => {
      info.stats.numPerfectRounds += game.roundScores.filter((rs) => rs.roundScore >= 5000).length; 
    });
  }

  res.render('account', info);
});

// The page from which a user can manage their account details
app.get('/players/:id/settings', async (req, res) => {

  let info = getSessionInfo(req);

  // User is either not logged in, or logged into the wrong account
  if (req.isUnauthenticated() || req.user._id !== req.params.id) {
    req.flash("danger", "You are not authorised to view this page");
    return res.redirect('/login');
  }

  try {
    info.acc = await Account.findById(req.params.id).lean();
    return res.render('account-settings', info);
  } catch (err) {
    return res.render('404', info);
  }
});

// This route is accessed when a user updates their details
app.post('/players/:id/settings', async (req, res) => {
  // User is either not logged in, or logged into the wrong account
  if (req.isUnauthenticated() || req.user._id !== req.params.id) {
    req.flash("danger", "You are not authorised to view this page");
    return res.redirect('/login');
  }

  try {
    // Update account details
    await Account.updateOne({ _id: req.params.id }, {
      username: req.body.username,
      email: req.body.email
    });

    req.user.username = req.body.username;

    req.flash("success", "Account details updated");
    res.redirect(`/players/${req.params.id}`);
  } catch (err) {
    req.flash(err);
    return res.render('account-settings', info);
  }
});

/**
 * Permanently delete a user's account and redirect to homepage. How unfortunate.
 */
app.post('/players/:id/delete', async (req, res) => {
  // User is either not logged in, or logged into the wrong account
  if (req.isUnauthenticated() || req.user._id !== req.params.id) {
    res.sendStatus(401);
  }

  try {
    req.logout();
    await Account.deleteOne({ _id: req.params.id });
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

// Account - POST
app.post('/signup/', (req, res) => {

  Account.addAccount(req.body, (err) => {
    if (err) return res.json(err);
    req.flash("success", "Account registered - please login");
    res.redirect('/login');
  });
});

// High scores route
app.get('/leaderboard', (req, res) => {
  
  const n = 25;   // Number of high scores to be retrieved
  let info = getSessionInfo(req);

  Score.find().sort([['score', -1]]).populate('account', 'username').limit(n).lean().sort('create_date').then((scores, err) => {
    if (err) throw err;
    info.scores = scores;
    return res.render('leaderboard', info);
  });
});

// Rules page route
app.get('/rules', (req, res) => {
  res.render('rules', getSessionInfo(req));
})

// Score - POST
app.post('/api/score', (req, res) => {
  Score.addScore(req, (scoreId) => {
    res.status(200).send({ scoreId });
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
app.get('/api/game', async (req, res) => {
  try {
    let game = await Game.generateGame(req.body);
    return res.send(game);
  } catch (error) {
    return res.status(500).json(error);    
  }
});

// View game - GET
app.get('/games/:gameID', async (req, res) => {

  var gameData = await Score.findOne().where({ game: req.params.gameID }).populate('game').populate('username, account').lean();

  try {
    gameData = {time: moment(gameData.create_date).format('Do of MMMM, YYYY'), ...gameData};
    let info = getSessionInfo(req);
    res.render('game', {gameData: JSON.stringify(gameData), layout: "game-layout", isLoggedIn: info.isLoggedIn, id: info.id, username: info.username });
  } catch(err) {
    console.log(err);
    return res.render('404', getSessionInfo(req));
  }
});

// Game - POST
app.post('/api/game/', (req, res) => {
  Game.addGame(req.body, (err) => {
    if (err) throw err;
    console.log("Game added!");
    res.json(req.body);
  });
});

app.get('/api/test', (req, res) => {
  res.json({testMsg: "Test successful", req, sessionInfo: getSessionInfo(req)});
});

// Error catching
app.get('/*', (req, res) => {
  // API endpoint not found (via AJAX)
  if (req.xhr) {
    res.status(404).json({error: "Endpoint not found"});
  }
  // Page not found
  else {
    res.render('404');
  }
});

function getSessionInfo(req) {

  if (!req.isAuthenticated()) {
    return { isLoggedIn: false }
  } else {
    return {
      isLoggedIn: req.isAuthenticated(),
      username: req.user.username,
      id: req.user._id
    }
  }
}

// Run the web server using Express
var port = process.env.PORT || 3000;
app.listen(port, () => console.log(`The application is running on localhost:${port}!`));


// var job = schedule.scheduleJob("* * * * *", function() {
//   // Playlist.getPlaylist()
// });