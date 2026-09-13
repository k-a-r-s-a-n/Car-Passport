# Testing

Run the full matrix:

```bash
npm test
```

This executes [`test/CarPassport.test.js`](../test/CarPassport.test.js) on Hardhat’s in-process network.

## Matrix (maps to DA2 “test contract functions, access control, transaction handling”)

| Case | Expected |
|---|---|
| Deployer is owner and first authorized mechanic | `owner` and `authorizedMechanics[deployer]` true |
| VIN hashed with keccak256 as mapping key | `vinHashOf(VIN) == keccak256(utf8(VIN))` |
| Empty VIN | revert `EmptyVIN` |
| First record for a new VIN | succeeds; count 1; reputation 1 |
| Ascending mileage | appends; history length 2 |
| Equal mileage | allowed (not a rollback) |
| Descending mileage | revert `OdometerRollback(provided, last)`; count unchanged |
| Non-authorized `addServiceRecord` | revert `NotAuthorized` |
| Owner authorizes mechanic; mechanic writes | `MechanicAuthorized` then successful write |
| Revoked mechanic writes | revert `NotAuthorized` |
| Non-owner `authorizeMechanic` | revert `NotOwner` |
| `getHistory` from a buyer signer | view succeeds, no state change |
| Reputation increments per verified write | counts 1 then 2 stored on records |

Against a running `hardhat node` after `npm run deploy:localhost`:

```bash
npx hardhat run scripts/demo-flow.js --network localhost
```

This executes the Section 7 write/revert script (15000 → 18500 → rollback → unauthorized) and expects exactly two committed records.

## Frontend demo checks (manual)

Use VIN `1HGCM82633A004352`.

1. Mechanic Terminal, authorized wallet: 15,000 then 18,500 — both confirm.
2. Submit 16,000 — UI banner for `OdometerRollback`.
3. Unauthorized wallet — UI banner for `NotAuthorized`.
4. Buyer Portal, no MetaMask: search VIN — two records only; keccak256 key shown.

## Gas note

Hardhat tests do not measure Amoy gas. On Amoy, each successful write is one L2 tx; buyer reads are `eth_call` (no gas).
