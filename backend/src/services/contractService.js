const { ethers } = require("ethers");
const {
  contractReadOnly,
  contractAdmin,
  contractOfficer,
  contractCitizen,
  getContractWithSigner,
  provider,
  blockExplorerUrl
} = require("../config/chain");

const STATUS_MAP = ["Reported", "WorkStarted", "InProgress", "Resolved", "VerificationWindow", "Closed"];
const VOTE_TYPE_MAP = { none: 0, upvote: 1, downvote: 2 };

/**
 * Computes deterministic content hash (keccak256) of issue metadata
 */
function computeContentHash(data) {
  const contentString = JSON.stringify({
    title: data.title,
    description: data.description,
    category: data.category,
    latitude: data.latitude,
    longitude: data.longitude
  });
  return ethers.keccak256(ethers.toUtf8Bytes(contentString));
}

function getContract(signerWallet, defaultContract) {
  return signerWallet ? getContractWithSigner(signerWallet) : defaultContract;
}

/**
 * Reports a new civic issue on-chain
 */
async function reportIssueOnChain(signerWallet, { contentHash, ipfsCid, category, latitude, longitude, geohash, severity }) {
  const contract = getContract(signerWallet, contractCitizen);

  const scaledLat = BigInt(Math.round(latitude * 1e6));
  const scaledLong = BigInt(Math.round(longitude * 1e6));

  const tx = await contract.reportIssue(
    contentHash,
    ipfsCid || "bafyplaceholder_cid_darpan",
    category,
    scaledLat,
    scaledLong,
    geohash,
    severity
  );
  const receipt = await tx.wait();

  // Parse IssueReported event from logs
  let issueId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === "IssueReported") {
        issueId = Number(parsed.args.id);
        break;
      }
    } catch {
      // ignore other events
    }
  }

  return {
    issueId,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Casts community vote (upvote or downvote) on-chain
 */
async function voteOnChain(signerWallet, issueId, voteTypeStr) {
  const contract = getContract(signerWallet, contractCitizen);
  const voteTypeNum = VOTE_TYPE_MAP[voteTypeStr.toLowerCase()];
  if (!voteTypeNum) {
    throw new Error("Invalid vote type. Must be 'upvote' or 'downvote'");
  }

  const tx = await contract.vote(issueId, voteTypeNum);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Officer assigns officer wallet on-chain
 */
async function assignOfficerOnChain(signerWallet, issueId, officerAddress, note) {
  const contract = getContract(signerWallet, contractOfficer);
  const tx = await contract.assignOfficer(issueId, officerAddress, note || "Officer assigned");
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Officer marks work started on-chain
 */
async function startWorkOnChain(signerWallet, issueId, note) {
  const contract = getContract(signerWallet, contractOfficer);
  const tx = await contract.startWork(issueId, note || "Work started on site");
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Officer updates status on-chain
 */
async function updateStatusOnChain(signerWallet, issueId, statusIndex, note) {
  const contract = getContract(signerWallet, contractOfficer);
  const tx = await contract.updateStatus(issueId, statusIndex, note || "Status updated");
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Officer adds transparent evidence on-chain
 */
async function addEvidenceOnChain(signerWallet, issueId, evidenceHash, note) {
  const contract = getContract(signerWallet, contractOfficer);
  const tx = await contract.addEvidence(issueId, evidenceHash, note || "Evidence submitted");
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Officer marks issue resolved with proof photo on-chain
 */
async function markResolvedOnChain(signerWallet, issueId, proofPhotoHash, note) {
  const contract = getContract(signerWallet, contractOfficer);
  const tx = await contract.markResolved(issueId, proofPhotoHash, note || "Work completed and verified by officer");
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Opens citizen verification window on-chain
 */
async function openVerificationOnChain(signerWallet, issueId, note) {
  const contract = getContract(signerWallet, contractOfficer);
  const tx = await contract.openVerification(issueId, note || "Citizen verification window open");
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Citizen verification vote (Satisfied/Unsatisfied) on-chain
 */
async function voteVerificationOnChain(signerWallet, issueId, satisfied) {
  const contract = getContract(signerWallet, contractCitizen);
  const tx = await contract.voteVerification(issueId, satisfied);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Publicly finalizes verification window on-chain
 */
async function finalizeVerificationOnChain(signerWallet, issueId) {
  const contract = getContract(signerWallet, contractCitizen);
  const tx = await contract.finalizeVerification(issueId);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Reads verified issue data directly from blockchain
 */
async function getOnChainIssue(issueId) {
  const issue = await contractReadOnly.getIssue(issueId);
  return {
    id: Number(issue.id),
    reporter: issue.reporter,
    contentHash: issue.contentHash,
    ipfsCid: issue.ipfsCid,
    category: issue.category,
    latitude: Number(issue.latitude) / 1e6,
    longitude: Number(issue.longitude) / 1e6,
    geohash: issue.geohash,
    severity: Number(issue.severity),
    timestamp: new Date(Number(issue.timestamp) * 1000).toISOString(),
    status: STATUS_MAP[Number(issue.status)] || "Unknown",
    statusCode: Number(issue.status),
    assignedOfficer: issue.assignedOfficer === ethers.ZeroAddress ? null : issue.assignedOfficer,
    proofPhotoHash: issue.proofPhotoHash,
    upvotes: Number(issue.upvotes),
    downvotes: Number(issue.downvotes),
    satisfiedVotes: Number(issue.satisfiedVotes),
    unsatisfiedVotes: Number(issue.unsatisfiedVotes),
    verificationDeadline: Number(issue.verificationDeadline) > 0 ? new Date(Number(issue.verificationDeadline) * 1000).toISOString() : null
  };
}

/**
 * Reads verified timeline entries directly from blockchain
 */
async function getOnChainTimeline(issueId) {
  const rawTimeline = await contractReadOnly.getTimeline(issueId);
  return rawTimeline.map((entry) => ({
    status: STATUS_MAP[Number(entry.status)] || "Unknown",
    statusCode: Number(entry.status),
    actor: entry.actor,
    timestamp: new Date(Number(entry.timestamp) * 1000).toISOString(),
    note: entry.note
  }));
}

/**
 * Reads citizen star reputation directly from blockchain
 */
async function getOnChainReputation(walletAddress) {
  const rep = await contractReadOnly.getReputation(walletAddress);
  return Number(rep);
}

module.exports = {
  STATUS_MAP,
  computeContentHash,
  reportIssueOnChain,
  voteOnChain,
  assignOfficerOnChain,
  startWorkOnChain,
  updateStatusOnChain,
  addEvidenceOnChain,
  markResolvedOnChain,
  openVerificationOnChain,
  voteVerificationOnChain,
  finalizeVerificationOnChain,
  getOnChainIssue,
  getOnChainTimeline,
  getOnChainReputation
};
