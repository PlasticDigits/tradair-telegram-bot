const Token = require("../models/tokenModel");
const { ratings } = require("../utils/helper");

// Helper to rank recommendations
const recRank = {
  SB: 5,
  B: 4,
  N: 3,
  S: 2,
  SS: 1
};

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
      // Try yesterday
      date = getDateString(-1);
      tokenData = await Token.findOne({ date });

      if (!tokenData || !tokenData.tokens.length) {
        return bot.sendMessage(chatId, "⚠️ No recommendations found for today or yesterday.");
      }
    }

    // Sort by recommendation strength
    const sorted = [...tokenData.tokens].sort((a, b) => {
      return (recRank[b.rec] || 0) - (recRank[a.rec] || 0);
    });

    const top = sorted[0];

    const message = `🏅 *Best Recommendation* for *${date}*:\n\n` +
      `📌 *Token*: ${top.ticker}\n` +
      `📈 *Recommendation*: ${ratings[top.rec]}\n` +
      `💬 *Reason*: ${top.reason}`;

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("❌ /best command error:", err.message);
    await bot.sendMessage(chatId, "⚠️ An error occurred while fetching the best recommendation.");
  }
};
