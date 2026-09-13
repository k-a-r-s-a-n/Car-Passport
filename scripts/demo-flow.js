const hre = require("hardhat");

const VIN = "1HGCM82633A004352";

async function main() {
  const [owner, mechanic, stranger] = await hre.ethers.getSigners();

  let passport;
  if (process.env.CONTRACT) {
    passport = await hre.ethers.getContractAt("CarPassport", process.env.CONTRACT);
  } else {
    // Deploy a self-contained instance for demonstration
    const Factory = await hre.ethers.getContractFactory("CarPassport");
    passport = await Factory.deploy();
    await passport.waitForDeployment();
  }

  const address = await passport.getAddress();
  console.log("Using CarPassport at:", address);

  await (await passport.addServiceRecordByVin(VIN, 15000, "Initial inspection")).wait();
  await (await passport.addServiceRecordByVin(VIN, 18500, "Brake pads")).wait();

  let rollback = false;
  try {
    await (await passport.addServiceRecordByVin(VIN, 16000, "Fraudulent rollback")).wait();
  } catch {
    rollback = true;
  }

  let unauthorized = false;
  try {
    await (
      await passport.connect(stranger).addServiceRecordByVin(VIN, 19000, "Unauthorized")
    ).wait();
  } catch {
    unauthorized = true;
  }

  await (await passport.authorizeMechanic(mechanic.address)).wait();

  const history = await passport.connect(stranger).getHistoryByVin(VIN);
  console.log(
    JSON.stringify(
      {
        contract: address,
        rollbackReverted: rollback,
        unauthorizedReverted: unauthorized,
        recordCount: history.length,
        odometers: history.map((r) => r.odometer.toString()),
        mechanicAuthorized: await passport.authorizedMechanics(mechanic.address),
      },
      null,
      2
    )
  );

  if (!rollback || !unauthorized || history.length !== 2) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
