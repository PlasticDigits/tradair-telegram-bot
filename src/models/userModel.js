const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, unique: true },
  username: { type: String },
  firstName: { type: String },
  daily: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
