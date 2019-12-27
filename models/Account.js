const mongoose = require('mongoose');

// Account schema
const accountSchema = mongoose.Schema({
  account: {
    type: String,
    unique: true,
    required: true
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
    console.log(account);
  Account.create({account: account.account, password: account.password}, callback);
}