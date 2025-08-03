require("dotenv").config();
const { Contract, JsonRpcProvider, isAddress } = require("ethers");

const provider = new JsonRpcProvider(process.env.RPC_URL);

// Minimal PancakeSwap V2 LP ABI
const LP_ABI = [
  "function symbol() view returns (string)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];

// Standard ERC20 ABI for symbol()
const ERC20_ABI = [
  "function symbol() view returns (string)"
];

async function getTokenSymbol(address) {
  try {
    const token = new Contract(address, ERC20_ABI, provider);
    return await token.symbol();
  } catch {
    return null;
  }
}

async function getPoolMetadata(poolAddress) {
  console.log("🔍 Verifying pool address:", poolAddress);

  if (!isAddress(poolAddress)) {
    console.error("❌ Invalid address format");
    return null;
  }

  try {
    const code = await provider.getCode(poolAddress);
    if (!code || code === "0x") {
      console.error("❌ Address is not a contract");
      return null;
    }

    const pool = new Contract(poolAddress, LP_ABI, provider);
    const token0Addr = await pool.token0();
    const token1Addr = await pool.token1();

    const [symbol0, symbol1] = await Promise.all([
      getTokenSymbol(token0Addr),
      getTokenSymbol(token1Addr)
    ]);

    if (!symbol0 || !symbol1) {
      console.error("❌ Could not fetch token symbols.");
      return null;
    }

    console.log(`✅ Pool contains: ${symbol0} (${token0Addr}), ${symbol1} (${token1Addr})`);

    return {
      pool: poolAddress.toLowerCase(),
      tokens: {
        token0: {
          symbol: symbol0,
          address: token0Addr.toLowerCase()
        },
        token1: {
          symbol: symbol1,
          address: token1Addr.toLowerCase()
        }
      }
    };

  } catch (error) {
    console.error("❌ Pool metadata fetch error:", error.reason || error.message);
    return null;
  }
}

module.exports = { getPoolMetadata };
