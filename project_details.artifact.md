# CarPassportPro — Core Project Blueprint & Architectural Specifications

This document serves as the living source-of-truth master ledger for the CarPassport architectural enhancements, designed specifically for production delivery and viva defenses.

---

## 1. Executive Summary & Core Value Proposition
CarPassportPro upgrades traditional physical vehicle service tracking into a decentralized, append-only protocol on Polygon Amoy. By transforming each unique vehicle into a standardized **ERC-721 Non-Fungible Token (NFT)** where the token ID is derived from `keccak256(VIN)`, it locks down digital titles and physical-world invariants directly as state-machine constraints.

---

## 2. Advanced Architectural Features Implemented

### 2.1 Vehicle Identity as an ERC-721 NFT
- **Identity Standard:** Leverages OpenZeppelin's industrial-grade `ERC721` implementation.
- **Title Ownership:** Real-world vehicle sales can trigger a transfer of the vehicle NFT token directly between buyer and seller wallets, assigning immutable title rights to the vehicle maintenance timeline.

### 2.2 Privacy Preservation & Compliance
- **Mechanism:** Plaintext VIN strings are hashed using `keccak256` to produce a 32-byte hash (`uint256 tokenId`), ensuring zero exposure of raw Personally Identifiable Information (PII) on a public L2 ledger.
- **Compliance Alignment:** GDPR & DPDP compliance.

### 2.3 System Anomaly & Fat-Finger Protection
- **Rule Guard:** The contract dynamically computes the variance between consecutive odometer entries. Jumps greater than **50,000 miles** per entry revert instantly via a custom error: `error UnrealisticMileageJump(uint256 provided, uint256 maxAllowed)`.

### 2.4 Production Access Control
- **Role Gating:** Uses OpenZeppelin `AccessControl` with a dedicated `MECHANIC_ROLE` to ensure only certified automotive technicians can write data.

---

## 3. Reference Implementation Checklist
- Smart Contract: [CarPassport.sol](file:///C:/Users/leela/Projects/CarPassport/contracts/CarPassport.sol) (Solidity ^0.8.24 + Cancun EVM Target)
- Automated Test Suite: [CarPassport.test.js](file:///C:/Users/leela/Projects/CarPassport/test/CarPassport.test.js)
- Frontend Configuration: [app.js](file:///C:/Users/leela/Projects/CarPassport/frontend/app.js) | [mechanic.js](file:///C:/Users/leela/Projects/CarPassport/frontend/mechanic.js) | [buyer.js](file:///C:/Users/leela/Projects/CarPassport/frontend/buyer.js)
- CI/CD Automation: [.github/workflows/test.yml](file:///C:/Users/leela/Projects/CarPassport/.github/workflows/test.yml)
