const Token = require("../models/tokenModel");
const PromotedToken = require("../models/promotedTokenModel");
const User = require("../models/userModel");
const Setting = require("../models/settingsModel");
const { getNarrativeOfTheDay } = require("./fetchNarrativeOfTheDay");
const { fetchAIRecommendations } = require("./fetchAIRecommendations");
const { ratings } = require("./helper");
const bot = require("./botInstance");

const getUTCDateString = () => {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

async function getSetting(key) {
  const setting = await Setting.findOne({ key });
  return setting ? setting.value : null;
}

async function setSetting(key, value) {
  await Setting.findOneAndUpdate(
    { key },
    { value },
    { upsert: true, new: true }
  );
}

const sendDailyMessages = async () => {
  try {
    const todayStr = getUTCDateString();

    // Avoid duplicate generation
    const exists = await Token.findOne({ date: todayStr });
    if (exists) {
      console.log(`⚠️ Token data already exists for ${todayStr}`);
      return;
    }

    const aiTokens = await fetchAIRecommendations();
    const promotedTokens = await PromotedToken.find({});

    if (promotedTokens.length > 0) {
      // Get and increment index from Settings
      let index = (await getSetting("promotedTokenIndex")) || 0;
      const promoted = promotedTokens[index % promotedTokens.length];

      await setSetting("promotedTokenIndex", index + 1);

      const promotedEntry = {
        ticker: promoted.ticker || "PROMO",
        rec: promoted.rec || "B",
        reason: promoted.reason || "Promoted token.",
        address: promoted.address,
        pool: promoted.pool,
      };

      // Replace a fixed token slot (e.g., index 4)
      if (aiTokens.length >= 5) {
        aiTokens[4] = promotedEntry;
      } else {
        aiTokens.push(promotedEntry);
      }

      console.log(`🎯 Promoted token injected: ${promotedEntry.ticker}`);
    }

    // Save token list
    await Token.create({ date: todayStr, tokens: aiTokens });
    console.log("✅ Token data saved for", todayStr);

    const users = await User.find({ daily: true });
    console.log(`📤 Sending daily updates to ${users.length} users`);

    // Fetch and store daily narrative
    let narrativeMsg = "";
    try {
      const { narrative } = await getNarrativeOfTheDay();
      await setSetting(`narrative_${todayStr}`, narrative);
      narrativeMsg = `🧠 *Narrative of the Day:*\n${narrative}\n\n`;
    } catch (err) {
      console.warn("⚠️ Could not fetch narrative of the day:", err.message);
      narrativeMsg = "🧠 *Narrative of the Day:*\n_Could not fetch today’s narrative._\n\n";
    }

    for (const user of users) {
      let msg = `📊 Top 10 Recommendations for ${todayStr}:\n\n${narrativeMsg}`;
      aiTokens.forEach((t, i) => {
        msg += `${i + 1}. ${t.ticker} — ${ratings[t.rec]}\n💬 ${t.reason}\n\n`;
      });

      await bot.sendMessage(user.chatId, msg);
    }

  } catch (err) {
    console.error("❌ Daily update error:", err.message);
  }
};

module.exports = { sendDailyMessages };
