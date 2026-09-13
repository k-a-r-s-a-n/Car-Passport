# Architecture

CarPassport is a three-tier DApp. One Solidity contract serves two frontends with different permission logic.

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (frontend/)                             │
│  ┌───────────────────────┐   ┌───────────────────────────┐  │
│  │ Mechanic Terminal      │   │ Buyer Portal               │  │
│  │ mechanic.html          │   │ buyer.html                 │  │
│  │ - Connect wallet       │   │ - Search by VIN            │  │
│  │ - Submit VIN + mileage │   │ - Immutable timeline       │  │
│  │   + notes              │   │ - No wallet (read RPC)     │  │
│  └───────────┬────────────┘   └────────────┬───────────────┘  │
└──────────────┼────────────────────────────┼──────────────────┘
               ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│  INTEGRATION LAYER — Ethers.js v6 + MetaMask                │
│  app.js / mechanic.js / buyer.js                            │
│  - Signs write transactions (mechanic)                      │
│  - Read-only JsonRpcProvider (buyer, no gas)                │
└──────────────┬──────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────┐
│  SMART CONTRACT — CarPassport.sol on Polygon Amoy / Hardhat │
│  - mapping(bytes32 => ServiceRecord[]) via keccak256(VIN)   │
│  - mapping(address => bool) authorizedMechanics             │
│  - addServiceRecord() with OdometerRollback                 │
│  - getHistory() view                                        │
│  - mechanicEntryCount reputation                            │
└─────────────────────────────────────────────────────────────┘
```

## Why VIN as keccak256

`vinHashOf(string)` returns `keccak256(bytes(vin))`. History is stored under that `bytes32` key, not a raw string slot that could collide across encodings. The original VIN is stored once in `vinByHash` on first write so explorers and UIs can reverse the hash for display.

## Two-sided UX, one contract

| Path | File | Provider | Can write? |
|---|---|---|---|
| Mechanic | `frontend/mechanic.html` | MetaMask `BrowserProvider` + signer | Only if `authorizedMechanics[msg.sender]` |
| Buyer | `frontend/buyer.html` | Public RPC `JsonRpcProvider` | Never (view calls only) |

## Gas-aware network choice

Polygon Amoy is a public EVM L2 testnet: faucet MATIC, fast blocks, Etherscan-class explorer. A two-person student network does not need Hyperledger’s multi-org orderers, CAs, and always-on peers. Each `addServiceRecord` is a single L2 transaction; `getHistory` is a free `eth_call`. That is the operational argument versus a permissioned consortium for an open buyer/mechanic market.

## Reputation (stretch)

Each successful write increments `mechanicEntryCount[mechanic]`. The count at write time is stored on the record (`mechanicReputationAtWrite`) so buyers can weight trust without a second contract.
