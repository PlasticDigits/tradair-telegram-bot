const PromotedToken = require("../models/promotedTokenModel");
const { getPoolMetadata } = require("../utils/getPoolMetadata");
const { ratings } = require("../utils/helper");

const conversations = {};

module.exports = async function addPromotedToken({ bot, chatId }) {
    conversations[chatId] = { step: "awaiting_pool" };

    await bot.sendMessage(chatId, "📥 Send the *pool address* of the token you want to promote:", {
        parse_mode: "Markdown"
    });

    const listener = async (msg) => {
        if (msg.chat.id !== chatId) return;
        const text = msg.text?.trim();

        if (text.startsWith("/")) {
            delete conversations[chatId];
            return bot.sendMessage(chatId, "⚠️ Process aborted. Cannot use commands here.");
        }

        const convo = conversations[chatId];

        if (convo.step === "awaiting_pool") {
            const pool = await getPoolMetadata(text.toLowerCase());
            if (!pool) return bot.sendMessage(chatId, "❌ Invalid pool address. Please send a valid one.");

            convo.pool = text.toLowerCase();
            convo.tokens = pool.tokens; // e.g. { token0: { address, symbol }, token1: { ... } }
            convo.step = "awaiting_token_choice";

            const buttons = [
                [{ text: `🍀 ${pool.tokens.token0.symbol}`, callback_data: `select_${pool.tokens.token0.address}` }],
                [{ text: `💧 ${pool.tokens.token1.symbol}`, callback_data: `select_${pool.tokens.token1.address}` }],
            ];

            return bot.sendMessage(chatId, `🧬 Pool detected:\nChoose which token to promote:`, {
                reply_markup: { inline_keyboard: buttons }
            });
        }

        if (convo.step === "awaiting_reason") {
            convo.reason = text;

            const exists = await PromotedToken.findOne({ address: convo.address });
            if (exists) {
                delete conversations[chatId];
                return bot.sendMessage(chatId, "⚠️ Token is already promoted.");
            }

            await PromotedToken.create({
                ticker: convo.ticker,
                address: convo.address,
                pool: convo.pool,
                rec: convo.rating,
                reason: convo.reason
            });

            delete conversations[chatId];
            return bot.sendMessage(chatId, `✅ ${convo.ticker} promoted successfully.`);
        }
    };

    const callbackListener = async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data?.trim();
        const convo = conversations[chatId];

        if (!convo) return;

        if (convo.step === "awaiting_token_choice" && data.startsWith("select_")) {
            const address = data.split("_")[1];
            const token = Object.values(convo.tokens).find(t => t.address === address);
            if (!token) return;

            convo.address = token.address;
            convo.ticker = token.symbol;
            convo.step = "awaiting_rating";

            const ratingButtons = Object.entries(ratings).map(([key, emoji]) => [{
                text: `${emoji} ${key}`,
                callback_data: `rating_${key}`
            }]);

            return bot.sendMessage(chatId, `📈 Selected token: *${token.symbol}*\n\nNow select a rating:`, {
                parse_mode: "Markdown",
                reply_markup: { inline_keyboard: ratingButtons }
            });
        }

        if (convo.step === "awaiting_rating" && data.startsWith("rating_")) {
            const rating = data.split("_")[1];
            if (!ratings[rating]) return;

            convo.rating = rating;
            convo.step = "awaiting_reason";
            return bot.sendMessage(chatId, `✍️ Please write the reason for marking *${convo.ticker}* as ${ratings[rating]}`, {
                parse_mode: "Markdown"
            });
        }
    };

    bot.on("message", listener);
    bot.on("callback_query", callbackListener);
};
