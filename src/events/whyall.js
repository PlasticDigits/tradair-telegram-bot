const Token = require("../models/tokenModel");
const { ratings } = require("../utils/helper");

function getDateString(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

module.exports = async ({ bot, chatId }) => {
  try {
    let date = getDateString(0); // today
    let tokenData = await Token.findOne({ date });

    if (!tokenData || !tokenData.tokens.length) {
      // Try yesterday if today is missing
      date = getDateString(-1);
      tokenData = await Token.findOne({ date });

      if (!tokenData || !tokenData.tokens.length) {
        return bot.sendMessage(chatId, "⚠️ No token data found for today or yesterday.");
      }
    }

    let message = `📖 Full Reasons for Top 10 Tokens (${date}):\n\n`;
    tokenData.tokens.forEach((token, index) => {
      message += `${index + 1}. ${token.ticker} — ${ratings[token.rec]}\n💬 ${token.reason}\n\n`;
    });

    await bot.sendMessage(chatId, message);
  } catch (err) {
    console.error("❌ /whyall command error:", err.message);
    bot.sendMessage(chatId, "⚠️ Could not fetch full token reasons.");
  }
};
