const hre = require("hardhat");

async function main() {
  console.log("Deploying IPRegistry contract...");
  
  // Get the first account as the deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Deploy the contract
  const IPRegistry = await hre.ethers.getContractFactory("IPRegistry");
  const ipRegistry = await IPRegistry.deploy();
  
  await ipRegistry.waitForDeployment();
  
  const address = await ipRegistry.getAddress();
  
  console.log(`IPRegistry deployed to: ${address}`);
  
  // Save contract address to a file for frontend/backend use
  const fs = require('fs');
  const path = require('path');
  
  const contractsDir = path.join(__dirname, "..", "client", "src", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ IPRegistry: address }, null, 2)
  );
  
  console.log("Contract address saved to:", path.join(contractsDir, "contract-address.json"));
  
  return ipRegistry.address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
