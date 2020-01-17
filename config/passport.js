const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const Account = require('../models/Account');

function inititalisePassport(passport) {
  
  passport.use(new LocalStrategy(
    function(username, password, done) {
      Account.findOne({ username: username }, function (err, acc) {

        console.log(acc);

        // Check for any errors that somehow occured
        if (err) return done(err);

        // Check if account exists
        if (!acc) return done(null, false, { message: "Username invalid"} );
        
        // Check if password matches  
        return bcrypt.compare(password, acc.password) ?
          done(null, acc) :
          done(null, false, { message: "Password incorrect" });

      });
    }
  ));

  // passport.serializeUser((acc, done) => done(null, acc.id));
  // passport.deserializeUser((id, done) => { });
}

module.exports = inititalisePassport;