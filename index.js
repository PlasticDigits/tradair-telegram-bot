require("dotenv").config();
const mongoose = require("mongoose");
const { default: slugify } = require("slugify");
const cron = require("node-cron");

const bot = require("./src/utils/botInstance");

// Commands
const top10Command = require("./src/events/top10");
const bestCommand = require("./src/events/best");
const whyCommand = require("./src/events/why");
const chartCommand = require("./src/events/chart");
const buyCommand = require("./src/events/buy");
const whyAllCommand = require("./src/events/whyall");
const dailyOnCommand = require("./src/events/dailyOn");
const dailyOffCommand = require("./src/events/dailyOff");
const addPromotedToken = require("./src/events/addPromotedToken");
const removePromotedToken = require("./src/events/removePromotedToken");
const listPromotedToken = require("./src/events/listPromotedToken");

const { getTimeToNextUpdateUTC, targetMinuteUTC, targetHourUTC, isAdmin } = require("./src/utils/helper");
const { sendDailyMessages } = require("./src/utils/regularJobs");

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then((conn) => {
    console.log("✅ MongoDB connected:", conn.connections[0].name);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Set Telegram commands
const commands = [
  { command: "/top10", description: "Show top 10 token recommendations" },
  { command: "/best", description: "Show best buy recommendation" },
  { command: "/why", description: "Get reason for a specific token" },
  { command: "/chart", description: "Get buy/sell charts for a specific token" },
  { command: "/buy", description: "Return pancakeswap link to purchase a specific token" },
  { command: "/whyall", description: "Reasons for all top 10 tokens" },
  { command: "/settings", description: "Manage daily alert settings" },
  { command: "/help", description: "List all available commands" }
];

bot.setMyCommands(commands, {
  scope: { type: "default" },
})
  .then(() => console.log("✅ Telegram commands set"))
  .catch(console.error);

const inlineKeyboard = {
  reply_markup: {
    inline_keyboard: commands.map(c => [{
      text: `${c.description}`,
      callback_data: c.command
    }])
  }
};

// Command dispatcher
const switchCases = async (event, bot, chatId, msg) => {
  const text = msg.text?.trim();
  const args = text?.split(" ") || [];
  const username = msg?.from?.username || msg?.username || "";

  if (!event?.startsWith("/") && !event?.startsWith("admin") && !["top10", "best", "why", "chart", "buy", "whyall", "daily_on", "daily_off", "settings", "help", "start"].includes(event)) {
    return;
  }

  try {
    switch (event) {
      case "top10": return top10Command({ bot, chatId });
      case "best": return bestCommand({ bot, chatId });
      case "why": return whyCommand({ bot, chatId, args });
      case "chart": return chartCommand({ bot, chatId, args });
      case "buy": return buyCommand({ bot, chatId, args });
      case "whyall": return whyAllCommand({ bot, chatId });
      case "daily_on": return dailyOnCommand({ bot, chatId });
      case "daily_off": return dailyOffCommand({ bot, chatId });
      case "admin":
        if (!isAdmin(username)) {
          return await bot.sendMessage(chatId, "🚫 ACCESS BLOCKED");
        }
        return await bot.sendMessage(chatId, "⚙️ Admin Panel", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Promoted Tokens", callback_data: "admin_promoted_tokens" }]
            ]
          }
        })
      case "admin_promoted_tokens":
        return await bot.sendMessage(chatId, "📢 Promoted Token Management", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "➕ Add Promoted Token", callback_data: "admin_add_token" }],
              [{ text: "➖ Remove Promoted Token", callback_data: "admin_remove_token" }],
              [{ text: "📋 List Promoted Tokens", callback_data: "admin_list_token" }],
              [{ text: "🔙 Back", callback_data: "admin" }]
            ]
          }
        });
      case "admin_add_token": return addPromotedToken({ bot, chatId });
      case "admin_remove_token": return removePromotedToken({ bot, chatId });
      case "admin_list_token": return listPromotedToken({ bot, chatId });
      case "settings":
        return await bot.sendMessage(chatId, "⚙️ Manage your daily alerts:", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🟢 Turn on daily updates", callback_data: "daily_on" }],
              [{ text: "🔴 Turn off daily updates", callback_data: "daily_off" }],
              [{ text: "☰ Menu", callback_data: "help" }]
            ]
          }
        });

      case "help":
        const timeRemaining = getTimeToNextUpdateUTC();
        const updateMsg = `Here are your available commands:\n⏳ Next update in ${timeRemaining} (at ${String(targetHourUTC).padStart(2, '0')}:${String(targetMinuteUTC).padStart(2, '0')} UTC)`;

        return await bot.sendMessage(chatId, updateMsg, inlineKeyboard);
      case "start":
        return await bot.sendMessage(
          chatId,
          "<b>Tradair Smart Trading Assistant</b>\n<i>AI-Powered Trading Intelligence that uncovers hidden patterns.</i>\nHere are your available commands:",
          {
            parse_mode: "HTML",
            ...inlineKeyboard
          }
        );

      default:
        return await bot.sendMessage(chatId, "Here are the available commands:", inlineKeyboard);
    }
  } catch (err) {
    console.error(`❌ Command error: ${err.message}`);
  }
};

// Message handler
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text?.startsWith("/")) return;

  const event = slugify(text.split(" ")[0]);
  await switchCases(event, bot, chatId, msg);
});

// Callback query handler
bot.on("callback_query", async (callback_query) => {
  const chatId = callback_query.from.id;
  const data = callback_query.data?.trim();
  const username = callback_query.from.username;

  if (!data) return;

  await bot.answerCallbackQuery(callback_query.id); // Always acknowledge

  // Handle /buy
  if (data.startsWith("buy:")) {
    const ticker = data.split(":")[1];
    return await switchCases("buy", bot, chatId, { text: `/buy ${ticker}` });
  }

  // Handle /chart
  if (data.startsWith("chart:")) {
    const ticker = data.split(":")[1];
    return await switchCases("chart", bot, chatId, { text: `/chart ${ticker}` });
  }

  // 🔒 Admin-only access control
  if (data.startsWith("admin") && !isAdmin(username)) {
    return await bot.sendMessage(chatId, "🚫 ACCESS BLOCKED");
  }

  // Manage promoted token
  if (data.startsWith("admin_remove_token:")) {
    return await removePromotedToken({ bot, chatId, data });
  }

  // Fallback: normalize event name
  const event = slugify(data);
  return await switchCases(event, bot, chatId, { text: data, username });
});



cron.schedule(`${targetMinuteUTC} ${targetHourUTC} * * *`, () => {
  console.log("🕜 Running daily update job at", targetHourUTC, ":", targetMinuteUTC, "UTC");
  sendDailyMessages();
}, { timezone: "Etc/UTC" });

