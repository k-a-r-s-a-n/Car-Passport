# Contract API — `CarPassport`

Source: [`contracts/CarPassport.sol`](../contracts/CarPassport.sol)

## Types

```solidity
struct ServiceRecord {
    uint256 timestamp;
    uint256 odometer;
    string description;
    address mechanic;
    uint256 mechanicReputationAtWrite;
    bytes32 vinHash;
}
```

## Custom errors

| Error | When |
|---|---|
| `NotOwner()` | Caller is not `owner` |
| `NotAuthorized()` | Caller is not in `authorizedMechanics` |
| `EmptyVIN()` | VIN string length is 0 |
| `ZeroAddress()` | `address(0)` passed to authorize/revoke/transfer |
| `OdometerRollback(uint256 provided, uint256 lastRecorded)` | New odometer is **strictly less** than last committed value |

Equal mileage is allowed (same-day reading, no rollback).

## State

| Name | Type | Visibility |
|---|---|---|
| `owner` | `address` | public |
| `authorizedMechanics` | `mapping(address => bool)` | public |
| `mechanicEntryCount` | `mapping(address => uint256)` | public |
| `vinByHash` | `mapping(bytes32 => string)` | public |
| `vehicleHistory` | `mapping(bytes32 => ServiceRecord[])` | private |

## Functions

### `vinHashOf(string calldata vin) → bytes32`

Pure. Reverts `EmptyVIN` if `vin` is empty. Returns `keccak256(bytes(vin))`.

### `authorizeMechanic(address mechanic)`

`onlyOwner`. Sets `authorizedMechanics[mechanic] = true`. Emits `MechanicAuthorized`. Reverts `ZeroAddress`.

### `revokeMechanic(address mechanic)`

`onlyOwner`. Sets flag false. Emits `MechanicRevoked`. Reverts `ZeroAddress`.

### `transferOwnership(address newOwner)`

`onlyOwner`. Emits `OwnershipTransferred`. Reverts `ZeroAddress`.

### `addServiceRecord(string calldata vin, uint256 odometer, string calldata description)`

`onlyMechanic`.

1. Hash VIN.
2. If history is non-empty and `odometer < last.odometer`, revert `OdometerRollback`.
3. Increment `mechanicEntryCount[msg.sender]`.
4. Push `ServiceRecord` (`block.timestamp`, caller, reputation).
5. Emit `ServiceLogged(vinHash, odometer, mechanic, reputation)`.

### `getHistory(string calldata vin) → ServiceRecord[]`

View. Anyone. Empty array if unknown VIN.

### `getHistoryByHash(bytes32 vinHash) → ServiceRecord[]`

View. Lookup without the original string.

### `getRecordCount(string calldata vin) → uint256`

View.

### `getLastOdometer(string calldata vin) → uint256`

View. `0` if no records.

## Events

- `MechanicAuthorized(address indexed mechanic)`
- `MechanicRevoked(address indexed mechanic)`
- `OwnershipTransferred(address indexed previousOwner, address indexed newOwner)`
- `ServiceLogged(bytes32 indexed vinHash, uint256 odometer, address indexed mechanic, uint256 reputation)`
