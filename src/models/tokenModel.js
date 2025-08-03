const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  tokens: [{
    ticker: String,
    address: {
      type: String,
      required: true,
    },
    pool: {
      type: String,
      required: true,
    },
    rec: String,
    reason: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Token', tokenSchema);
