const User = require('../models/userModel');

module.exports = async function dailyOnCommand({ bot, chatId }) {
  await User.findOneAndUpdate(
    { chatId },
    { daily: true },
    { upsert: true, new: true }
  );

  await bot.sendMessage(chatId, "✅ Daily updates have been turned *ON*.");
};
