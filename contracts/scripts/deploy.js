const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, officerAccount, ministryAccount] = await hre.ethers.getSigners();
  const networkName = hre.network.name;
  const chainId = hre.network.config.chainId || 31337;

  console.log("=========================================");
  console.log(" Deploying DarpanCivic Contract");
  console.log("=========================================");
  console.log(`Network:          ${networkName} (Chain ID: ${chainId})`);
  console.log(`Deployer Address: ${deployer.address}`);
  console.log(`Deployer Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);

  const DarpanCivic = await hre.ethers.getContractFactory("DarpanCivic");
  const darpanCivic = await DarpanCivic.deploy();
  await darpanCivic.waitForDeployment();

  const contractAddress = await darpanCivic.getAddress();
  console.log(`\nDarpanCivic deployed to: ${contractAddress}`);

  // Assign demo roles on local network
  const OFFICER_ROLE = await darpanCivic.OFFICER_ROLE();
  const MINISTRY_ROLE = await darpanCivic.MINISTRY_ROLE();

  if (officerAccount) {
    const tx1 = await darpanCivic.grantRole(OFFICER_ROLE, officerAccount.address);
    await tx1.wait();
    console.log(`Granted OFFICER_ROLE to:  ${officerAccount.address}`);
  }

  if (ministryAccount) {
    const tx2 = await darpanCivic.grantRole(MINISTRY_ROLE, ministryAccount.address);
    await tx2.wait();
    console.log(`Granted MINISTRY_ROLE to: ${ministryAccount.address}`);
  }

  // Read full compiled artifact to get ABI
  const artifactPath = path.join(__dirname, "../artifacts/contracts/DarpanCivic.sol/DarpanCivic.json");
  let artifact = {};
  if (fs.existsSync(artifactPath)) {
    artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  }

  const deploymentData = {
    contractName: "DarpanCivic",
    address: contractAddress,
    chainId: chainId,
    network: networkName,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    roles: {
      admin: deployer.address,
      officer: officerAccount ? officerAccount.address : deployer.address,
      ministry: ministryAccount ? ministryAccount.address : deployer.address
    },
    abi: artifact.abi || []
  };

  // Export to contracts/deployments/
  const contractsDeployDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(contractsDeployDir)) {
    fs.mkdirSync(contractsDeployDir, { recursive: true });
  }
  const deploymentFilePath = path.join(contractsDeployDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFilePath, JSON.stringify(deploymentData, null, 2));
  console.log(`Saved deployment info to: ${deploymentFilePath}`);

  // Export to shared backend/src/contracts/DarpanCivic.json
  const backendContractsDir = path.join(__dirname, "../../backend/src/contracts");
  if (!fs.existsSync(backendContractsDir)) {
    fs.mkdirSync(backendContractsDir, { recursive: true });
  }
  const backendFilePath = path.join(backendContractsDir, "DarpanCivic.json");
  fs.writeFileSync(backendFilePath, JSON.stringify(deploymentData, null, 2));
  console.log(`Exported shared ABI & address to: ${backendFilePath}`);
  console.log("=========================================\n");

  return contractAddress;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = main;
