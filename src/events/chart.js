const Token = require("../models/tokenModel");

function getDateString(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

module.exports = async ({ bot, chatId, args }) => {
  try {
    const ticker = args[1]?.toUpperCase();
    if (!ticker) {
      return bot.sendMessage(chatId, "⚠️ Please provide a token symbol.\nExample:\n`/chart CAKE`", {
        parse_mode: "Markdown",
      });
    }

    // Try today’s data first, fallback to yesterday
    let date = getDateString(0);
    let tokenData = await Token.findOne({ date });

    if (!tokenData || !tokenData.tokens.length) {
      date = getDateString(-1);
      tokenData = await Token.findOne({ date });

      if (!tokenData || !tokenData.tokens.length) {
        return bot.sendMessage(chatId, "⚠️ No token data found for today or yesterday.");
      }
    }

    const token = tokenData.tokens.find(t => t.ticker?.toUpperCase() === ticker);

    if (!token || !token.pool) {
      return bot.sendMessage(chatId, `❌ Token \`${ticker}\` not found in recent recommendations.`, {
        parse_mode: "Markdown",
      });
    }

    const dexScreenerLink = `https://dexscreener.com/bsc/${token.pool}`;

    const message = `📌 *${token.ticker}*\n🔗 [View on DexScreener](${dexScreenerLink})\n\nDisclaimer: Tradair is not affiliated with the chart provider.`;

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    });

  } catch (err) {
    console.error("❌ /chart command error:", err.message);
    bot.sendMessage(chatId, "⚠️ Could not fetch chart links.");
  }
};
