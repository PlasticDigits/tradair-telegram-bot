const Token = require("../models/tokenModel");
const { ratings } = require("../utils/helper");

function getDateString(offsetDays = 0) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return date.toISOString().split("T")[0];
}

module.exports = async ({ bot, chatId, args }) => {
    try {
        const tokenName = args[1]?.toUpperCase();
        if (!tokenName) {
            return bot.sendMessage(chatId, "⚠️ Please provide a token symbol. Example:\n`/why CAKE`", { parse_mode: "Markdown" });
        }

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

        const token = tokenData.tokens.find(t => t.ticker === tokenName);

        if (!token) {
            return bot.sendMessage(chatId, `❌ Token \`${tokenName}\` not found in today's recommendations.`, { parse_mode: "Markdown" });
        }

        const message = `📌 Token: ${token.ticker}\n📈 Recommendation: ${ratings[token.rec]}\n💬 Reason: ${token.reason}`;
        await bot.sendMessage(chatId, message);
    } catch (err) {
        console.error("❌ /why command error:", err.message);
        bot.sendMessage(chatId, "⚠️ Could not fetch token reason.");
    }
};
