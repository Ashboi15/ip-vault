const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying IPRegistry contract...");

  // Deploy the contract
  const IPRegistry = await hre.ethers.getContractFactory("IPRegistry");
  const ipRegistry = await IPRegistry.deploy();

  await ipRegistry.waitForDeployment();
  const address = await ipRegistry.getAddress();

  console.log(`IPRegistry deployed to: ${address}`);

  // Save contract address to a file for frontend/backend use
  const contractsDir = path.join(__dirname, "..", "..", "client", "src", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ IPRegistry: address }, null, 2)
  );

  // Save contract ABI
  const contractArtifact = await hre.artifacts.readArtifact("IPRegistry");
  fs.writeFileSync(
    path.join(contractsDir, "IPRegistry.json"),
    JSON.stringify(contractArtifact, null, 2)
  );

  return ipRegistry.address;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
