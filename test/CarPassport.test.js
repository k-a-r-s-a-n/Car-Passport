const { expect } = require("chai");
const { ethers } = require("hardhat");

const VIN = "1HGCM82633A004352";
const ANOTHER_VIN = "1ABCD123456789012";

describe("CarPassport Protocol V2", function () {
  async function deployFixture() {
    const [owner, mechanic, buyer, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CarPassport");
    const passport = await Factory.deploy();
    await passport.waitForDeployment();
    return { passport, owner, mechanic, buyer, stranger };
  }

  describe("1. Deployment & Identity Strategy", function () {
    it("Should set the deployer as the initial owner", async function () {
      const { passport, owner } = await deployFixture();
      expect(await passport.owner()).to.equal(owner.address);
    });

    it("Should grant the deployer the initial MECHANIC_ROLE", async function () {
      const { passport, owner } = await deployFixture();
      expect(await passport.authorizedMechanics(owner.address)).to.equal(true);
    });

    it("Should compute keccak256 VIN hashes correctly (vinHashOf)", async function () {
      const { passport } = await deployFixture();
      const expected = ethers.keccak256(ethers.toUtf8Bytes(VIN));
      expect(await passport.vinHashOf(VIN)).to.equal(expected);
    });

    it("Should provide a getVinHash alias for frontend convenience", async function () {
      const { passport } = await deployFixture();
      const expected = ethers.keccak256(ethers.toUtf8Bytes(VIN));
      expect(await passport.getVinHash(VIN)).to.equal(expected);
    });

    it("Should revert on empty VIN strings via vinHashOf", async function () {
      const { passport } = await deployFixture();
      await expect(passport.vinHashOf("")).to.be.revertedWithCustomError(passport, "EmptyVIN");
    });
  });

  describe("2. Service Logging & Odometer Invariants", function () {
    it("Should mint a vehicle NFT on the first service log", async function () {
      const { passport, owner } = await deployFixture();
      const tokenId = BigInt(ethers.keccak256(ethers.toUtf8Bytes(VIN)));
      await passport.addServiceRecordByVin(VIN, 1000, "Initial");
      expect(await passport.ownerOf(tokenId)).to.equal(owner.address);
    });

    it("Should accept ascending mileage entries", async function () {
      const { passport } = await deployFixture();
      await passport.addServiceRecordByVin(VIN, 1000, "Service 1");
      await passport.addServiceRecordByVin(VIN, 2000, "Service 2");
      const history = await passport.getHistoryByVin(VIN);
      expect(history[1].odometer).to.equal(2000n);
    });

    it("Should allow same-day equal mileage entries (non-monotonic)", async function () {
      const { passport } = await deployFixture();
      await passport.addServiceRecordByVin(VIN, 1500, "Part A");
      await passport.addServiceRecordByVin(VIN, 1500, "Part B");
      expect(await passport.getRecordCount(VIN)).to.equal(2n);
    });

    it("Should revert on odometer rollbacks (OdometerRollback)", async function () {
      const { passport } = await deployFixture();
      await passport.addServiceRecordByVin(VIN, 5000, "Service");
      await expect(passport.addServiceRecordByVin(VIN, 4500, "Fraud"))
        .to.be.revertedWithCustomError(passport, "OdometerRollback")
        .withArgs(4500, 5000);
    });

    it("Should revert on unrealistic mileage jumps (UnrealisticMileageJump)", async function () {
      const { passport } = await deployFixture();
      await passport.addServiceRecordByVin(VIN, 10000, "Service");
      // Jump > 50,000 miles
      await expect(passport.addServiceRecordByVin(VIN, 60001, "Error"))
        .to.be.revertedWithCustomError(passport, "UnrealisticMileageJump")
        .withArgs(60001, 60000);
    });

    it("Should support direct tokenId (uint256) service logging", async function () {
      const { passport } = await deployFixture();
      const tokenId = BigInt(ethers.keccak256(ethers.toUtf8Bytes(ANOTHER_VIN)));
      await passport.addServiceRecord(tokenId, 500, "IPFS_HASH_DATA");
      const history = await passport.getHistory(tokenId);
      expect(history[0].description).to.equal("IPFS_HASH_DATA");
    });

    it("Should correctly increment and store mechanic reputation in service records", async function () {
      const { passport, owner } = await deployFixture();
      await passport.addServiceRecordByVin(VIN, 1000, "First");
      await passport.addServiceRecordByVin(VIN, 2000, "Second");
      const history = await passport.getHistoryByVin(VIN);
      expect(history[0].mechanicReputationAtWrite).to.equal(1n);
      expect(history[1].mechanicReputationAtWrite).to.equal(2n);
      expect(await passport.mechanicEntryCount(owner.address)).to.equal(2n);
    });
  });

  describe("3. Access Control & Role Governance", function () {
    it("Should revert if a non-authorized address attempts to log service", async function () {
      const { passport, stranger } = await deployFixture();
      await expect(passport.connect(stranger).addServiceRecordByVin(VIN, 100, "Illegal"))
        .to.be.revertedWithCustomError(passport, "NotAuthorized");
    });

    it("Should allow the owner to authorize a new mechanic", async function () {
      const { passport, mechanic } = await deployFixture();
      await passport.authorizeMechanic(mechanic.address);
      expect(await passport.authorizedMechanics(mechanic.address)).to.equal(true);
    });

    it("Should allow the owner to revoke a mechanic", async function () {
      const { passport, mechanic } = await deployFixture();
      await passport.authorizeMechanic(mechanic.address);
      await passport.revokeMechanic(mechanic.address);
      expect(await passport.authorizedMechanics(mechanic.address)).to.equal(false);
    });

    it("Should revert if a revoked mechanic attempts to write", async function () {
      const { passport, mechanic } = await deployFixture();
      await passport.authorizeMechanic(mechanic.address);
      await passport.revokeMechanic(mechanic.address);
      await expect(passport.connect(mechanic).addServiceRecordByVin(VIN, 100, "Illegal"))
        .to.be.revertedWithCustomError(passport, "NotAuthorized");
    });

    it("Should revert if a non-owner attempts to authorize a mechanic", async function () {
      const { passport, stranger, buyer } = await deployFixture();
      await expect(passport.connect(stranger).authorizeMechanic(buyer.address))
        .to.be.revertedWithCustomError(passport, "NotOwner");
    });

    it("Should revert if authorizing a ZeroAddress", async function () {
      const { passport } = await deployFixture();
      await expect(passport.authorizeMechanic(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(passport, "ZeroAddress");
    });

    it("Should revert if revoking a ZeroAddress", async function () {
      const { passport } = await deployFixture();
      await expect(passport.revokeMechanic(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(passport, "ZeroAddress");
    });
  });

  describe("4. Ownership Lifecycle & Public Inspection", function () {
    it("Should allow ownership transfer by the current owner", async function () {
      const { passport, stranger } = await deployFixture();
      await passport.transferOwnership(stranger.address);
      expect(await passport.owner()).to.equal(stranger.address);
    });

    it("Should revert if transferring ownership to ZeroAddress", async function () {
      const { passport } = await deployFixture();
      await expect(passport.transferOwnership(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(passport, "ZeroAddress");
    });

    it("Should emit OwnershipTransferred event", async function () {
      const { passport, owner, stranger } = await deployFixture();
      await expect(passport.transferOwnership(stranger.address))
        .to.emit(passport, "OwnershipTransferred")
        .withArgs(owner.address, stranger.address);
    });

    it("Should revert if a non-owner attempts to transfer ownership", async function () {
      const { passport, stranger, buyer } = await deployFixture();
      await expect(passport.connect(stranger).transferOwnership(buyer.address))
        .to.be.revertedWithCustomError(passport, "NotOwner");
    });

    it("Should allow anyone to query vehicle history (Public Read)", async function () {
      const { passport, buyer } = await deployFixture();
      await passport.addServiceRecordByVin(VIN, 1000, "Public Record");
      const history = await passport.connect(buyer).getHistoryByVin(VIN);
      expect(history.length).to.equal(1);
    });

    it("Should store and retrieve reverse-mapped VIN strings (vinByHash)", async function () {
      const { passport } = await deployFixture();
      await passport.addServiceRecordByVin(VIN, 1000, "Linked");
      const hash = await passport.vinHashOf(VIN);
      expect(await passport.vinByHash(hash)).to.equal(VIN);
    });

    it("Should provide the last recorded odometer value via helper", async function () {
      const { passport } = await deployFixture();
      await passport.addServiceRecordByVin(VIN, 12345, "Check Odo");
      expect(await passport.getLastOdometer(VIN)).to.equal(12345n);
    });

    it("Should allow the NFT owner to transfer the vehicle title", async function () {
      const { passport, owner, buyer } = await deployFixture();
      await passport.addServiceRecordByVin(VIN, 1000, "Initial");
      const tokenId = BigInt(ethers.keccak256(ethers.toUtf8Bytes(VIN)));

      // Transfer title
      await expect(passport.transferVehicle(VIN, buyer.address))
        .to.emit(passport, "VehicleTitleTransferred")
        .withArgs(tokenId, owner.address, buyer.address);

      expect(await passport.ownerOf(tokenId)).to.equal(buyer.address);
    });

    it("Should revert if a non-NFT-owner attempts to transfer the title", async function () {
      const { passport, stranger, buyer } = await deployFixture();
      await passport.addServiceRecordByVin(VIN, 1000, "Initial");

      await expect(passport.connect(stranger).transferVehicle(VIN, buyer.address))
        .to.be.revertedWithCustomError(passport, "NotVehicleOwner");
    });
  });
});
