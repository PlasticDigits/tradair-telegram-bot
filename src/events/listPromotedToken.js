const PromotedToken = require("../models/promotedTokenModel");
const { ratings } = require("../utils/helper");

module.exports = async function listPromotedTokens({ bot, chatId }) {
  try {
    const tokens = await PromotedToken.find();

    if (!tokens.length) {
      return bot.sendMessage(chatId, "ℹ️ No promoted tokens found.");
    }

    for (const token of tokens) {
      const message = `💠 *${token.ticker}*\n📍 Address: \`${token.address}\`\n⭐ Rating: ${ratings[token.rec]}\n📝 Reason: ${token.reason}`;

      await bot.sendMessage(chatId, message);
    }
  } catch (err) {
    console.error("Error listing promoted tokens:", err.message);
    await bot.sendMessage(chatId, "⚠️ Could not list promoted tokens.");
  }
};
