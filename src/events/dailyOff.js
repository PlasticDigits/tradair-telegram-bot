const User = require('../models/userModel');

module.exports = async function dailyOffCommand({ bot, chatId }) {
  await User.findOneAndUpdate(
    { chatId },
    { daily: false },
    { upsert: true, new: true }
  );

  await bot.sendMessage(chatId, "❌ Daily updates have been turned *OFF*.");
};
