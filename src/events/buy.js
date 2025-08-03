const Token = require("../models/tokenModel");
const { ratings } = require("../utils/helper");

function getDateString(offsetDays = 0) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return date.toISOString().split("T")[0];
}

module.exports = async ({ bot, chatId, args }) => {
    try {
        const ticker = args[1]?.toUpperCase();
        if (!ticker) {
            return bot.sendMessage(chatId, "⚠️ Please provide a token symbol. Example:\n`/buy CAKE`", { parse_mode: "Markdown" });
        }

        let date = getDateString(0); // today
        let tokenData = await Token.findOne({ date });

        if (!tokenData || !tokenData.tokens.length) {
            date = getDateString(-1);
            tokenData = await Token.findOne({ date });

            if (!tokenData || !tokenData.tokens.length) {
                return bot.sendMessage(chatId, "⚠️ No token data found for today or yesterday.");
            }
        }

        const token = tokenData.tokens.find(t => t.ticker?.toUpperCase() === ticker);

        if (!token) {
            return bot.sendMessage(chatId, `❌ Token \`${ticker}\` not found in today's recommendations.`, { parse_mode: "Markdown" });
        }

        const buyLink = `https://pancakeswap.finance/swap?outputCurrency=${token.address}`;

        const message = `🛒 *Buy ${token.ticker} on PancakeSwap*\n\n - Disclaimer:\nTradair is not affiliate with the trading dex below\n\n📈 *Recommendation:* ${ratings[token.rec]}\n💬 *Reason:* ${token.reason}\n\n🔗 [Buy Now](${buyLink})`;

        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (err) {
        console.error("❌ /buy command error:", err.message);
        bot.sendMessage(chatId, "⚠️ Could not fetch token reason.");
    }
};
