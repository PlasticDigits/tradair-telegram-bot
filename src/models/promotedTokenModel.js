const mongoose = require('mongoose');

const promotedTokenSchema = new mongoose.Schema({
  ticker: { type: String, required: true, unique: true },
  address: { type: String, required: true, unique: true },
  pool: { type: String, required: true },
  rec: { type: String, default: 'N' },
  reason: { type: String, default: '' },
  addedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('PromotedToken', promotedTokenSchema);
