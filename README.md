# CarPassport Pro
### Decentralized Vehicle History & Digital Title Protocol

CarPassport Pro is a public Layer-2 (Polygon Amoy) DApp that binds a vehicle's VIN to an on-chain, append-only service ledger. By representing vehicles as **ERC-721 NFTs**, the protocol enables a secure, cryptographically verifiable "Digital Title" that can be transferred during a real-world sale, alongside a functional maintenance history.

**Team:** Karwin S.C (25BCE1682) · Kevin Fernando (25BCE1981)

---

## 🚀 Key Pro Features

1.  **Vehicle Identity as NFT (ERC-721):** Each car is a unique token on-chain. The `tokenId` is the `keccak256` hash of the VIN. Transferring the NFT transfers the official "Digital Title" and maintenance custody.
2.  **Monotonicity Enforcement:** The smart contract refuses any odometer entry lower than the last recorded value — mileage fraud is a state-transition error, not just a policy violation.
3.  **Anomaly Guard (Fat-Finger Protection):** Automatically rejects entries with unrealistic mileage jumps (> 50,000 miles in one go), preventing corrupt data entries from fat-fingered inputs.
4.  **Role-Based Access Control (AccessControl):** Uses industrial-grade roles (`MECHANIC_ROLE`) to ensure only authorized workshops can write data, while anyone can read for free.
5.  **Privacy by Hashing:** VINs are hashed on-chain to ensure uniqueness without exposing plaintext vehicle identities on the public ledger.

## 🛠️ Tech Stack

| Layer | Tool |
|---|---|
| Smart Contract | Solidity ^0.8.24 (OpenZeppelin) |
| L2 Network | Polygon Amoy Testnet (ChainID: 80002) |
| Integration | Ethers.js v6 + MetaMask |
| Tooling | Hardhat + GitHub Actions (CI/CD) |
| Frontend | HTML5 / Tailwind CSS / Vanilla JS |

## 📂 Project Structure

```text
/contracts          CarPassport.sol (ERC-721 + AccessControl)
/test               CarPassport.test.js (28 Passing Scenarios)
/frontend           Unified Project Hub (index.html)
/scripts            deploy.js & demo-flow.js
/.github            CI/CD pipeline
```

## 🚦 Getting Started

```bash
# Install dependencies
npm install

# Run the 28-test security matrix
npm run test

# Launch local blockchain & demo
npm run node
npm run deploy:localhost
npm run demo
```

## 🎓 Viva Demo Script

1.  **Mechanic Terminal:** Connect an authorized wallet.
2.  **Service Log:** Add record for VIN `1HGCM82633A004352` @ 15,000 mi.
3.  **Audit Trail:** Switch to **Buyer Portal**. Search VIN. Observe the record and "Digital Title" held by Admin.
4.  **Fraud Prevention:** Attempt to log 12,000 mi (Rollback) or 80,000 mi (Anomaly). Observe UI error banners.
5.  **Title Transfer:** As the NFT owner, transfer the "Digital Title" to a new buyer address. Observe the updated owner on the timeline.

## 📜 Documentation
- [Architecture & Blueprint](project_details.artifact.md)
- [Contract API](docs/api.md)
- [Testing Matrix](docs/testing.md)
