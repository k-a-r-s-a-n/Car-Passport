/**
 * Network + explorer config. Contract address comes from (in order):
 * 1. scripts/deploy.js → deployed-address.js (local or latest deploy)
 * 2. amoy-deployment.js (committed Polygon Amoy address for examiners / buyer RPC)
 */
window.CARPASSPORT_CONFIG = {
  amoy: {
    chainId: 80002,
    hexChainId: "0x13882",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    explorer: "https://amoy.polygonscan.com",
    name: "Polygon Amoy Testnet",
  },
  sepolia: {
    chainId: 11155111,
    hexChainId: "0xaa36a7",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.etherscan.io",
    name: "Ethereum Sepolia Testnet",
  },
  localhost: {
    chainId: 31337,
    hexChainId: "0x7a69",
    rpcUrl: "http://127.0.0.1:8545",
    explorer: null,
    name: "Hardhat Localhost",
  },
};

window.CARPASSPORT_DEMO_VIN = "1HGCM82633A004352";
