const PromotedToken = require("../models/promotedTokenModel");

module.exports = async function removePromotedToken({ bot, chatId, data }) {
  try {
    // Step 1: If no data, show selection
    if (!data || !data.includes(":")) {
      const tokens = await PromotedToken.find();

      if (!tokens.length) {
        return bot.sendMessage(chatId, "ℹ️ No promoted tokens available to remove.");
      }

      const buttons = tokens.map((token) => {
        return [{
          text: `❌ Remove ${token.ticker}`,
          callback_data: `admin_remove_token:${token.address}`
        }];
      });

      return bot.sendMessage(chatId, "🗑️ Select a token to remove:", {
        reply_markup: { inline_keyboard: buttons }
      });
    }

    // Step 2: Remove selected token
    const address = data.split(":")[1];
    const token = await PromotedToken.findOneAndDelete({ address });

    if (!token) {
      return bot.sendMessage(chatId, "⚠️ Token not found or already removed.");
    }

    await bot.sendMessage(chatId, `✅ Removed promoted token: *${token.ticker}*`, {
      parse_mode: "Markdown"
    });

  } catch (err) {
    console.error("Error removing promoted token:", err.message);
    await bot.sendMessage(chatId, "⚠️ Could not remove the token.");
  }
};
