const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


// Account schema
const accountSchema = mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: false,
    sparse: true
  },
  password: {
      type: String,
      required: true
  },
  create_date: {
    type: Date,
    default: Date.now
  }
});

const Account = module.exports = mongoose.model('Account', accountSchema);


// Get all accounts
module.exports.getAccounts = (callback, limit) => {
  Account.find(callback).limit(limit);
}

// Add account
module.exports.addAccount = (account, callback) => {
  // Hash password and save account to database
  bcrypt.genSalt(10, (err, salt) => {

    if (err) throw err;

    bcrypt.hash(account.password, salt, (err, hash) => {
      Account.create({ username: account.username, password: hash }, callback);
    })
  });
}