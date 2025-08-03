const Token = require("../models/tokenModel");
const { ratings } = require("../utils/helper");

function getDateString(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

module.exports = async ({ bot, chatId }) => {
  try {
    let date = getDateString(0);
    let tokenData = await Token.findOne({ date });

    if (!tokenData || !tokenData.tokens.length) {
      date = getDateString(-1);
      tokenData = await Token.findOne({ date });

      if (!tokenData || !tokenData.tokens.length) {
        return bot.sendMessage(chatId, "⚠️ No token data found for today or yesterday.");
      }
    }

    // 👇 Final header with date + narrative
    const header = `📊 *Top 10 Token Recommendations for ${date}:*\n\n`;
    await bot.sendMessage(chatId, header, { parse_mode: "Markdown" });

    for (let i = 0; i < tokenData.tokens.length; i++) {
      const token = tokenData.tokens[i];
      const shortMsg = `*${i + 1}. ${token.ticker}* — ${ratings[token.rec]}\n💎 ${token.reason}\n_Disclaimer: Tradair is not affiliated with the trading DEX below._`;

      const buttons = {
        reply_markup: {
          inline_keyboard: [[
            {
              text: `TRADE ${token.ticker}`,
              callback_data: `buy:${token.ticker}`
            },
            {
              text: `CHART ${token.ticker}`,
              callback_data: `chart:${token.ticker}`
            }
          ]]
        },
        parse_mode: "Markdown"
      };

      await bot.sendMessage(chatId, shortMsg, buttons);
    }
  } catch (err) {
    console.error("❌ /top10 command error:", err.message);
    await bot.sendMessage(chatId, "⚠️ Could not fetch top 10 tokens.");
  }
};
