# Setup

## Prerequisites

- Node.js 18+
- MetaMask (Mechanic Terminal only)
- For Amoy: a **testnet-only** private key and faucet MATIC

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
```

Never put a mainnet key in `.env`. `.env` is gitignored.

## Local Hardhat

Terminal 1:

```bash
npx hardhat node
```

Terminal 2:

```bash
npm run deploy:localhost
npm run frontend
```

`scripts/deploy.js` writes:

- `frontend/abi.js`
- `frontend/deployed-address.js` (gitignored; regenerated every deploy)

### MetaMask on localhost

1. Add network: chain id `31337`, RPC `http://127.0.0.1:8545`, symbol `ETH`.
2. Import a Hardhat account private key from the node console (Account #0 is the deployer / first mechanic).
3. Open http://localhost:5173/mechanic.html and connect.

After every restart of `hardhat node`, contracts are gone — run `deploy:localhost` again and hard-refresh the UI.

## Polygon Amoy

1. Add Amoy in MetaMask (the Mechanic page can prompt `wallet_addEthereumChain`): chain id `80002` (`0x13882`), RPC `https://rpc-amoy.polygon.technology`, explorer `https://amoy.polygonscan.com`.
2. Fund the deployer from an Amoy faucet (get MATIC early; faucets dry up).
3. Set `PRIVATE_KEY` in `.env` (hex key, with or without `0x`).
4. Optional: `AMOY_RPC_URL` if the public RPC is rate-limited.

```bash
npm run deploy:amoy
npm run frontend
```

On Amoy, deploy also writes:

- `frontend/amoy-deployment.js` — address loaded by both HTML pages
- `frontend/amoy-deployment.json` — same data for examiners / README

Contract URL: `https://amoy.polygonscan.com/address/<address>`

## Reconnect after redeploy

If you deploy a new contract, the old address is stale. Refresh after deploy so `deployed-address.js` / `amoy-deployment.js` reload. Buyer Portal does not need MetaMask; it uses the public RPC in `frontend/config.js`.

## Two-wallet demo

1. Deployer wallet is already an authorized mechanic.
2. On Mechanic Terminal (as owner), paste a second address into **Authorize mechanic**.
3. Switch MetaMask to an **unauthorized** third account to show `NotAuthorized`.
