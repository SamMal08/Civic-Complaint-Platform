const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
const chainId = parseInt(process.env.CHAIN_ID || "31337", 10);
const blockExplorerUrl = process.env.BLOCK_EXPLORER_URL || "http://127.0.0.1:8545";

// Default Hardhat pre-funded private keys
const DEFAULT_KEYS = {
  admin: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",    // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  officer: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",  // 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  ministry: "0x5de4111afa1a4b94908f83103eb2f954b04a47057d802c4e65f874b38cf303a2", // 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  citizen: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"   // 0x90F79bf6EB2c4f870365E785982E1f101E93b906
};

const adminKey = process.env.ADMIN_PRIVATE_KEY || DEFAULT_KEYS.admin;
const officerKey = process.env.OFFICER_PRIVATE_KEY || DEFAULT_KEYS.officer;
const ministryKey = process.env.MINISTRY_PRIVATE_KEY || DEFAULT_KEYS.ministry;
const citizenKey = process.env.CITIZEN_PRIVATE_KEY || DEFAULT_KEYS.citizen;

const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
  cacheTimeout: -1
});

const adminSigner = new ethers.Wallet(adminKey, provider);
const officerSigner = new ethers.Wallet(officerKey, provider);
const ministrySigner = new ethers.Wallet(ministryKey, provider);
const citizenSigner = new ethers.Wallet(citizenKey, provider);

function loadContractArtifact() {
  const artifactPath = path.join(__dirname, "../contracts/DarpanCivic.json");
  if (!fs.existsSync(artifactPath)) {
    console.warn(`[Web3] Contract artifact not found at ${artifactPath}. Please run deploy script first.`);
    return { address: ethers.ZeroAddress, abi: [] };
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

const contractArtifact = loadContractArtifact();
const contractAddress = contractArtifact.address || ethers.ZeroAddress;
const contractAbi = contractArtifact.abi || [];

const contractReadOnly = new ethers.Contract(contractAddress, contractAbi, provider);
const contractAdmin = new ethers.Contract(contractAddress, contractAbi, adminSigner);
const contractOfficer = new ethers.Contract(contractAddress, contractAbi, officerSigner);
const contractCitizen = new ethers.Contract(contractAddress, contractAbi, citizenSigner);

const walletCache = new Map();

function getContractWithSigner(privateKey) {
  let signer = walletCache.get(privateKey);
  if (!signer) {
    signer = new ethers.Wallet(privateKey, provider);
    walletCache.set(privateKey, signer);
  }
  return new ethers.Contract(contractAddress, contractAbi, signer);
}

module.exports = {
  provider,
  rpcUrl,
  chainId,
  blockExplorerUrl,
  contractAddress,
  contractAbi,
  contractReadOnly,
  contractAdmin,
  contractOfficer,
  contractCitizen,
  adminSigner,
  officerSigner,
  ministrySigner,
  citizenSigner,
  getContractWithSigner,
  loadContractArtifact,
  DEFAULT_KEYS
};
