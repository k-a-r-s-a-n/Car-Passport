// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CarPassport
/// @notice Public Layer-2 vehicle history protocol. Represents vehicles as ERC-721 NFTs.
///         Enforces mileage monotonicity and provides a digital title transfer flow.
contract CarPassport is ERC721, AccessControl {
    bytes32 public constant MECHANIC_ROLE = keccak256("MECHANIC_ROLE");

    // Fat-finger guard: Reverts if an entry increases mileage by > 50,000 miles in one go.
    // This is a safety check for data entry errors, not a hard physical limit.
    uint256 public constant MAX_MILEAGE_JUMP = 50000;

    struct ServiceRecord {
        uint256 timestamp;
        uint256 odometer;
        string description; // Service details or IPFS hash
        address mechanic;
        uint256 mechanicReputationAtWrite;
    }

    // tokenId (uint256 derived from VIN hash) => service records
    mapping(uint256 => ServiceRecord[]) private _vehicleHistory;
    mapping(bytes32 => string) public vinByHash;
    mapping(address => uint256) public mechanicEntryCount;

    address public owner;

    event MechanicAuthorized(address indexed mechanic);
    event MechanicRevoked(address indexed mechanic);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event VehicleTitleTransferred(uint256 indexed tokenId, address indexed from, address indexed to);
    event ServiceLogged(
        bytes32 indexed vinHash,
        uint256 odometer,
        address indexed mechanic,
        uint256 reputation
    );

    error NotOwner();
    error NotVehicleOwner();
    error NotAuthorized();
    error EmptyVIN();
    error ZeroAddress();
    error OdometerRollback(uint256 provided, uint256 lastRecorded);
    error UnrealisticMileageJump(uint256 provided, uint256 maxAllowed);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyMechanic() {
        if (!hasRole(MECHANIC_ROLE, msg.sender)) revert NotAuthorized();
        _;
    }

    constructor() ERC721("CarPassport", "CAR") {
        owner = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MECHANIC_ROLE, msg.sender);
        emit MechanicAuthorized(msg.sender);
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @dev Internal logic for logging service to avoid code duplication
    function _logService(uint256 tokenId, uint256 odometer, string memory description) internal {
        // Auto-mint the vehicle NFT to the contract owner (Admin) if it doesn't exist.
        // The Admin can then transfer the "Title" to the actual car owner.
        if (_ownerOf(tokenId) == address(0)) {
            _safeMint(owner, tokenId);
        }

        ServiceRecord[] storage history = _vehicleHistory[tokenId];

        if (history.length > 0) {
            uint256 lastOdometer = history[history.length - 1].odometer;
            if (odometer < lastOdometer) {
                revert OdometerRollback(odometer, lastOdometer);
            }
            if (odometer > lastOdometer + MAX_MILEAGE_JUMP) {
                revert UnrealisticMileageJump(odometer, lastOdometer + MAX_MILEAGE_JUMP);
            }
        }

        mechanicEntryCount[msg.sender] += 1;
        uint256 reputation = mechanicEntryCount[msg.sender];

        history.push(
            ServiceRecord({
                timestamp: block.timestamp,
                odometer: odometer,
                description: description,
                mechanic: msg.sender,
                mechanicReputationAtWrite: reputation
            })
        );

        emit ServiceLogged(bytes32(tokenId), odometer, msg.sender, reputation);
    }

    function addServiceRecord(uint256 tokenId, uint256 odometer, string calldata ipfsHash) external onlyMechanic {
        _logService(tokenId, odometer, ipfsHash);
    }

    function addServiceRecordByVin(string calldata vin, uint256 odometer, string calldata description) external onlyMechanic {
        bytes32 hashKey = vinHashOf(vin);
        uint256 tokenId = uint256(hashKey);

        // Map hash back to human string only on first entry
        if (_ownerOf(tokenId) == address(0)) {
            vinByHash[hashKey] = vin;
        }

        _logService(tokenId, odometer, description);
    }

    /// @notice Transfers the "Digital Title" (NFT) of the vehicle.
    /// @dev Only the current NFT holder can transfer the title.
    function transferVehicle(string calldata vin, address newOwner) external {
        uint256 tokenId = uint256(vinHashOf(vin));
        if (ownerOf(tokenId) != msg.sender) revert NotVehicleOwner();
        if (newOwner == address(0)) revert ZeroAddress();

        _transfer(msg.sender, newOwner, tokenId);
        emit VehicleTitleTransferred(tokenId, msg.sender, newOwner);
    }

    // --- Administrative Functions ---

    function authorizeMechanic(address mechanic) external onlyOwner {
        if (mechanic == address(0)) revert ZeroAddress();
        _grantRole(MECHANIC_ROLE, mechanic);
        emit MechanicAuthorized(mechanic);
    }

    function revokeMechanic(address mechanic) external onlyOwner {
        if (mechanic == address(0)) revert ZeroAddress();
        _revokeRole(MECHANIC_ROLE, mechanic);
        emit MechanicRevoked(mechanic);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previous = owner;
        owner = newOwner;
        _grantRole(DEFAULT_ADMIN_ROLE, newOwner);
        _revokeRole(DEFAULT_ADMIN_ROLE, previous);
        emit OwnershipTransferred(previous, newOwner);
    }

    // --- View Helpers ---

    function authorizedMechanics(address mechanic) external view returns (bool) {
        return hasRole(MECHANIC_ROLE, mechanic);
    }

    function vinHashOf(string calldata vin) public pure returns (bytes32) {
        if (bytes(vin).length == 0) revert EmptyVIN();
        return keccak256(bytes(vin));
    }

    function getVinHash(string calldata vin) external pure returns (bytes32) {
        return keccak256(bytes(vin));
    }

    function getHistory(uint256 tokenId) external view returns (ServiceRecord[] memory) {
        return _vehicleHistory[tokenId];
    }

    function getHistoryByVin(string calldata vin) external view returns (ServiceRecord[] memory) {
        return _vehicleHistory[uint256(vinHashOf(vin))];
    }

    function getRecordCount(string calldata vin) external view returns (uint256) {
        return _vehicleHistory[uint256(vinHashOf(vin))].length;
    }

    function getLastOdometer(string calldata vin) external view returns (uint256) {
        ServiceRecord[] storage history = _vehicleHistory[uint256(vinHashOf(vin))];
        if (history.length == 0) return 0;
        return history[history.length - 1].odometer;
    }

    function getVehicleOwner(string calldata vin) external view returns (address) {
        uint256 tokenId = uint256(vinHashOf(vin));
        try this.ownerOf(tokenId) returns (address addr) {
            return addr;
        } catch {
            return address(0);
        }
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
