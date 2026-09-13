require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;

const isValidPrivateKey = (key) => {
  if (!key || typeof key !== "string") return false;
  const cleanKey = key.trim().startsWith("0x") ? key.trim().slice(2) : key.trim();
  return cleanKey.length === 64 && /^[0-9a-fA-F]{64}$/.test(cleanKey);
};

const getAccounts = () => {
  if (isValidPrivateKey(PRIVATE_KEY)) {
    return [PRIVATE_KEY.trim().startsWith("0x") ? PRIVATE_KEY.trim() : `0x${PRIVATE_KEY.trim()}`];
  }
  return [];
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: getAccounts(),
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: getAccounts(),
      chainId: 11155111,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
