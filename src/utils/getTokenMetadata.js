require("dotenv").config();
const { Contract, JsonRpcProvider, isAddress } = require("ethers");

const provider = new JsonRpcProvider(process.env.RPC_URL);

const ERC20_ABI = [
  "function symbol() view returns (string)"
];

async function getTokenMetadata(address) {
  console.log("🔍 Checking address:", address);

  if (!isAddress(address)) {
    console.error("❌ Invalid address format");
    return null;
  }

  try {
    const contract = new Contract(address, ERC20_ABI, provider);
    const symbol = await contract.symbol();
    return symbol;
  } catch (error) {
    console.error("❌ Error fetching token symbol:", error.reason || error.message);
    return null;
  }
}

module.exports = { getTokenMetadata };
