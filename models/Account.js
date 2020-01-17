const mongoose = require('mongoose');


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
    required: false
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

// Get accounts
module.exports.getAccounts = (callback, limit) => {
  Account.find(callback).limit(limit);
}

// Add account
module.exports.addAccount = (account, callback) => {
  // Hash password here

  Account.create({ username: account.username, password: account.password, email: account.email }, callback);
}