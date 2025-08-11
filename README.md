# 📈 TRADAIR Smart Trading Assistant 🤖

**TRADAIR** is a Telegram bot that delivers AI-powered token trading recommendations based on volume, liquidity, sentiment, and market news. It uses OpenAI and CoinGecko On-Chain API to analyze tokens daily and send personalized alerts for top-performing tokens on Binance Smart Chain (BSC).

---

## 🚀 Features

- 🔟 `/top10`: View top 10 token recommendations for the day, including _Promoted Tokens_.
- 🏅 `/best`: Get the best token pick with recommendation and reason.
- ❓ `/why [TICKER]`: Find out why a specific token is recommended. [TEMPORARILY DISABLED]
- 🧠 `/whyall`: Show reasons for all 10 recommendations.
- 📊 `/chart [TICKER]`: View static price chart + live links (DexScreener, CoinGecko).
- 🛒 `/buy [TICKER]`: Direct PancakeSwap link with token metadata and recommendation.
- 🔔 `/daily_on`: Subscribe to daily updates.
- 🔕 `/daily_off`: Unsubscribe from daily alerts.
- 🆘 `/help`: List all available commands via inline menu.
- 🛠️ `/admin`: Admin-only panel for managing promoted tokens.

---

## 🧠 AI Integration

- Uses OpenAI GPT Assistant API to analyze:
  - Token price
  - Volume & liquidity
  - News via Tavily API
  - Sentiment & historical patterns
- Fetches pools via CoinGecko On-Chain API
- Injects _Promoted Tokens_ every other day into the top 10 list

> AI-generated recommendations include a `rec` code:
>
> - 🔵 `B`: Buy
> - 🟡 `N`: Neutral / Hold
> - 🔴 `S`: Sell
> - 🐻 `SS`: Strong Sell
> - 🚀 `SB`: Strong Buy

---

## 🛠️ Tech Stack

- **Node.js** – backend bot logic
- **MongoDB + Mongoose** – storage (users, tokens, promoted list, settings)
- **Telegram Bot API** – using `node-telegram-bot-api`
- **node-cron** – daily scheduling
- **Dotenv** – secrets & environment config
- **OpenAI API** – smart recommendations
- **Tavily API** – news summarization
- **CoinGecko API** – token/pool data

---

## 📁 Project Structure

```
src/
├── events/               # Command handlers
│   ├── top10.js
│   ├── best.js
│   ├── why.js
│   ├── whyall.js
│   ├── buy.js
│   ├── chart.js
│   ├── dailyOn.js
│   ├── dailyOff.js
│   └── admin/            # Admin-only actions
├── models/
│   ├── tokenModel.js
│   ├── userModel.js
│   ├── promotedTokenModel.js
│   └── settingsModel.js
├── utils/
│   ├── botInstance.js
│   ├── fetchAIRecommendations.js
│   ├── fetchNarrativeOfTheDay.js
│   └── helper.js
├── index.js              # Entrypoint + scheduler
└── .env                  # API keys and secrets
```

---

## ⚙️ Environment Setup

1. **Clone the repo**

```bash
git clone https://github.com/yourusername/tradair-bot.git
cd tradair-bot
npm install
```

2. **Add `.env` file**

```env
BOT_TOKEN=your-telegram-bot-token
MONGO_URI=your-mongodb-uri
OPENAI_API_KEY=your-openai-key
OPENAI_ASSISTANT_SMARTTRADING_ID=your-assistant-id
TAVILY_KEY=your-tavily-api-key
COINGECKO_API_KEY=your-coingecko-api-key
```

3. **Run the bot**

```bash
node index.js
```

---

## 🕰️ Daily AI Recommendations

- Triggered daily via `node-cron` (UTC time).
- Saves to MongoDB with schema:

```json
{
  "date": "2025-07-31",
  "tokens": [
    {
      "ticker": "TRIAS",
      "address": "0x...",
      "pool": "0x...",
      "rec": "B",
      "reason": "Strong bullish forecast based on volume and price action..."
    }
  ]
}
```

- Every **even-numbered day**, one of the 10 tokens is replaced with a `PromotedToken`.

---

## 📢 Promoted Tokens

Admin-only panel supports:

- ➕ Add a promoted token (address, ticker, pool, reason, rating)
- ➖ Remove a promoted token
- 📃 List all promoted tokens

Injected on alternating days using:

```js
PromotedToken.find();
```

---

## ☁️ Hosting Suggestions

- [Render](https://render.com)
- [Railway](https://railway.app)
- [Replit](https://replit.com)
- VPS with Node.js + MongoDB

---

## 🧾 License

MIT License – free for commercial or personal use.

---

## ✉️ Contact / Maintainer

**Telegram:** [@AgentDave007](https://t.me/AgentDave007)  
**GitHub:** [yourusername/tradair-bot](https://github.com/yourusername/tradair-bot)

---

🧠 _Stay smart. Stay automated. Trade with TRADAIR._
