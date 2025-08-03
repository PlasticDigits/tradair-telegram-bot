const targetHourUTC = 15;
const targetMinuteUTC = 0;

const getTimeToNextUpdateUTC = () => {
  const now = new Date();
  const nextUpdate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    targetHourUTC,
    targetMinuteUTC
  ));

  // If the time has already passed today, schedule for tomorrow
  if (now >= nextUpdate) {
    nextUpdate.setUTCDate(nextUpdate.getUTCDate() + 1);
  }

  const diffMs = nextUpdate - now;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
};


const CHATGPT_PROMPT_BASE = `
Do the following as a nuanced but brave & confident analyst.
Assign each of the above 10 tokens a rating based on the news from Tavily above.
Ratings are: Strong Buy - SB, Buy - B, Neutral - N, Sell - S, Strong Sell - SS.
Be a bit bullish, but dont assign the same rating to all tokens - assign it relative to each other.
DONT be afraid to use STRONG ratings if you see STRONG evidence. Most of the time, you will have at least one STRONG sell or STRONG buy (SS or SB).
Build a json array of 10 tokens with a recommendation and reason based on the news.
Each token should be such as {"ticker":"CAKE","rec":"SB","reason":"CAKE benefits from strong DeFi adoption on Binance Smart Chain, with recent partnership news boosting community engagement and protocol liquidity"}. Finally return the json object as: {"tokens": [ ... put the 10 tokens here]}`

const tokenSchema = {
  "name": "pancakeswap_bsc_tickers",
  "schema": {
    "type": "object",
    "properties": {
      "tokens": {
        "type": "array",
        "description": "Array of token tickers, recommendations, and rationale trading on Pancakeswap BSC.",
        "items": {
          "type": "object",
          "properties": {
            "ticker": {
              "type": "string",
              "description": "The token ticker symbol.",
              "minLength": 1
            },
            "rec": {
              "type": "string",
              "description": "Recommendation for the token (SB=Strong Buy, B=Buy, N=Neutral, S=Sell, SS=Strong Sell).",
              "enum": ["SB", "B", "N", "S", "SS"]
            },
            "reason": {
              "type": "string",
              "description": "A one-sentence explanation for the recommendation decision."
            }
          },
          "required": ["ticker", "rec", "reason"],
          "additionalProperties": false
        }
      }
    },
    "required": ["tokens"],
    "additionalProperties": false
  },
  "strict": true
}

const ratings = {
  "SB": "🐂🟢 Pump",
  "B": "🔵 Buy",
  "N": "🟡 Hold",
  "S": "🟠 Sell",
  "SS": "🐻🔴 Dump",
}

const ADMIN_USERNAMES = ["@ceramicfingers", "@AgentDave007"];

function isAdmin(ctx) {
  return ADMIN_USERNAMES.includes(`@${ctx}`);
}

module.exports = { getTimeToNextUpdateUTC, targetHourUTC, targetMinuteUTC, CHATGPT_PROMPT_BASE, tokenSchema, ratings, isAdmin }