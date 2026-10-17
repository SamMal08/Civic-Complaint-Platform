const { contractReadOnly, provider } = require("../config/chain");
const Issue = require("../models/Issue");
const Timeline = require("../models/Timeline");
const Vote = require("../models/Vote");
const User = require("../models/User");
const { STATUS_MAP } = require("./contractService");
const { calculatePriorityScore } = require("./geohashService");

let isIndexing = false;
let lastProcessedBlock = 0;

/**
 * Sync an issue's priority score in MongoDB based on current upvotes, severity, and reporter stars
 */
async function syncPriorityScore(issueId) {
  const issue = await Issue.findOne({ issueId });
  if (!issue) return;

  const reporter = await User.findOne({ walletAddress: issue.reporter });
  const reporterStars = reporter ? reporter.reputationStars : 0;

  issue.priorityScore = calculatePriorityScore({
    severity: issue.severity,
    upvotes: issue.upvotes,
    downvotes: issue.downvotes,
    reporterStars: reporterStars,
    createdAt: issue.createdAt
  });

  await issue.save();
}

/**
 * Handle on-chain IssueReported event
 */
async function handleIssueReported(id, reporter, contentHash, ipfsCid, category, latitude, longitude, geohash, severity, timestamp, event) {
  const issueId = Number(id);
  const txHash = event.log.transactionHash;
  const blockNumber = event.log.blockNumber;

  let issue = await Issue.findOne({ issueId });
  if (!issue) {
    issue = new Issue({
      issueId,
      reporter: reporter.toLowerCase(),
      contentHash,
      ipfsCid,
      title: `Civic Complaint #${issueId} (${category})`,
      description: "Reported civic complaint recorded transparently on-chain.",
      category,
      location: {
        type: "Point",
        coordinates: [Number(longitude) / 1e6, Number(latitude) / 1e6]
      },
      latitude: Number(latitude) / 1e6,
      longitude: Number(longitude) / 1e6,
      geohash,
      severity: Number(severity),
      status: "Reported",
      creationTxHash: txHash,
      creationBlockNumber: blockNumber
    });
    await issue.save();
  }

  // Ensure reporter user exists in MongoDB
  let user = await User.findOne({ walletAddress: reporter.toLowerCase() });
  if (!user) {
    user = await User.create({
      walletAddress: reporter.toLowerCase(),
      role: "citizen"
    });
  }

  await syncPriorityScore(issueId);
}

/**
 * Handle on-chain IssueStatusUpdated event
 */
async function handleIssueStatusUpdated(id, previousStatus, newStatus, actor, note, timestamp, event) {
  const issueId = Number(id);
  const statusStr = STATUS_MAP[Number(newStatus)] || "Reported";
  const txHash = event.log.transactionHash;
  const blockNumber = event.log.blockNumber;

  await Issue.findOneAndUpdate(
    { issueId },
    { status: statusStr }
  );

  // Add timeline entry
  await Timeline.create({
    issueId,
    status: statusStr,
    actor: actor.toLowerCase(),
    note: note || `Status updated to ${statusStr}`,
    txHash,
    blockNumber,
    timestamp: new Date(Number(timestamp) * 1000)
  });
}

/**
 * Handle on-chain IssueVoted event
 */
async function handleIssueVoted(id, voter, previousVote, newVote, upvotes, downvotes, event) {
  const issueId = Number(id);
  const txHash = event.log.transactionHash;
  const voteType = Number(newVote) === 1 ? "upvote" : "downvote";

  await Issue.findOneAndUpdate(
    { issueId },
    {
      upvotes: Number(upvotes),
      downvotes: Number(downvotes)
    }
  );

  await Vote.findOneAndUpdate(
    { issueId, voterWallet: voter.toLowerCase(), isVerification: false },
    {
      voteType,
      txHash,
      timestamp: new Date()
    },
    { upsert: true, new: true }
  );

  await syncPriorityScore(issueId);
}

/**
 * Handle on-chain VerificationVoteCast event
 */
async function handleVerificationVoteCast(id, citizen, satisfied, satisfiedVotes, unsatisfiedVotes, event) {
  const issueId = Number(id);
  const txHash = event.log.transactionHash;

  await Issue.findOneAndUpdate(
    { issueId },
    {
      satisfiedVotes: Number(satisfiedVotes),
      unsatisfiedVotes: Number(unsatisfiedVotes)
    }
  );

  await Vote.create({
    issueId,
    voterWallet: citizen.toLowerCase(),
    voteType: "verification",
    satisfied,
    isVerification: true,
    txHash
  });

  // Award star reputation locally in DB as well
  await User.findOneAndUpdate(
    { walletAddress: citizen.toLowerCase() },
    { $inc: { reputationStars: 1 } },
    { upsert: true }
  );
}

/**
 * Handle on-chain VerificationFinalized event
 */
async function handleVerificationFinalized(id, finalStatus, satisfiedVotes, unsatisfiedVotes, note, event) {
  const issueId = Number(id);
  const statusStr = STATUS_MAP[Number(finalStatus)] || "Closed";
  const txHash = event.log.transactionHash;
  const blockNumber = event.log.blockNumber;

  await Issue.findOneAndUpdate(
    { issueId },
    {
      status: statusStr,
      satisfiedVotes: Number(satisfiedVotes),
      unsatisfiedVotes: Number(unsatisfiedVotes)
    }
  );

  await Timeline.create({
    issueId,
    status: statusStr,
    actor: "system/verifier",
    note: note || `Verification finalized with outcome: ${statusStr}`,
    txHash,
    blockNumber,
    timestamp: new Date()
  });
}

/**
 * Handle OfficerAssigned event
 */
async function handleOfficerAssigned(id, officer, assignedBy, timestamp, event) {
  const issueId = Number(id);
  await Issue.findOneAndUpdate(
    { issueId },
    { assignedOfficer: officer.toLowerCase() }
  );
}

/**
 * Handle EvidenceAdded event
 */
async function handleEvidenceAdded(id, officer, evidenceHash, note, timestamp, event) {
  const issueId = Number(id);
  const txHash = event.log.transactionHash;
  const blockNumber = event.log.blockNumber;

  const issue = await Issue.findOne({ issueId });
  const statusStr = issue ? issue.status : "InProgress";

  await Timeline.create({
    issueId,
    status: statusStr,
    actor: officer.toLowerCase(),
    note: `Evidence: ${evidenceHash} | ${note}`,
    txHash,
    blockNumber,
    timestamp: new Date(Number(timestamp) * 1000)
  });
}

/**
 * Handle ReputationUpdated event
 */
async function handleReputationUpdated(citizen, newReputation, event) {
  await User.findOneAndUpdate(
    { walletAddress: citizen.toLowerCase() },
    { reputationStars: Number(newReputation) },
    { upsert: true }
  );
}

/**
 * Backfills past events and starts live listener
 */
async function startIndexer() {
  if (isIndexing) return;
  isIndexing = true;

  try {
    const currentBlock = await provider.getBlockNumber();
    console.log(`[Event Indexer] Starting indexer at block ${currentBlock}`);

    // Backfill historical events
    const fromBlock = 0;
    const toBlock = currentBlock;

    const reportedFilter = contractReadOnly.filters.IssueReported();
    const reportedEvents = await contractReadOnly.queryFilter(reportedFilter, fromBlock, toBlock);
    for (const e of reportedEvents) {
      await handleIssueReported(...e.args, e);
    }

    const statusFilter = contractReadOnly.filters.IssueStatusUpdated();
    const statusEvents = await contractReadOnly.queryFilter(statusFilter, fromBlock, toBlock);
    for (const e of statusEvents) {
      await handleIssueStatusUpdated(...e.args, e);
    }

    const voteFilter = contractReadOnly.filters.IssueVoted();
    const voteEvents = await contractReadOnly.queryFilter(voteFilter, fromBlock, toBlock);
    for (const e of voteEvents) {
      await handleIssueVoted(...e.args, e);
    }

    const verVoteFilter = contractReadOnly.filters.VerificationVoteCast();
    const verVoteEvents = await contractReadOnly.queryFilter(verVoteFilter, fromBlock, toBlock);
    for (const e of verVoteEvents) {
      await handleVerificationVoteCast(...e.args, e);
    }

    const verFinalFilter = contractReadOnly.filters.VerificationFinalized();
    const verFinalEvents = await contractReadOnly.queryFilter(verFinalFilter, fromBlock, toBlock);
    for (const e of verFinalEvents) {
      await handleVerificationFinalized(...e.args, e);
    }

    const officerFilter = contractReadOnly.filters.OfficerAssigned();
    const officerEvents = await contractReadOnly.queryFilter(officerFilter, fromBlock, toBlock);
    for (const e of officerEvents) {
      await handleOfficerAssigned(...e.args, e);
    }

    const evidenceFilter = contractReadOnly.filters.EvidenceAdded();
    const evidenceEvents = await contractReadOnly.queryFilter(evidenceFilter, fromBlock, toBlock);
    for (const e of evidenceEvents) {
      await handleEvidenceAdded(...e.args, e);
    }

    const repFilter = contractReadOnly.filters.ReputationUpdated();
    const repEvents = await contractReadOnly.queryFilter(repFilter, fromBlock, toBlock);
    for (const e of repEvents) {
      await handleReputationUpdated(...e.args, e);
    }

    console.log(`[Event Indexer] Backfilled past events up to block ${currentBlock}`);
    lastProcessedBlock = currentBlock;

    // Attach real-time event listeners
    contractReadOnly.on("IssueReported", handleIssueReported);
    contractReadOnly.on("IssueStatusUpdated", handleIssueStatusUpdated);
    contractReadOnly.on("IssueVoted", handleIssueVoted);
    contractReadOnly.on("VerificationVoteCast", handleVerificationVoteCast);
    contractReadOnly.on("VerificationFinalized", handleVerificationFinalized);
    contractReadOnly.on("OfficerAssigned", handleOfficerAssigned);
    contractReadOnly.on("EvidenceAdded", handleEvidenceAdded);
    contractReadOnly.on("ReputationUpdated", handleReputationUpdated);

    console.log("[Event Indexer] Live blockchain event listeners attached successfully");
  } catch (error) {
    console.error("[Event Indexer] Error initializing event indexer:", error.message);
  }
}

module.exports = {
  startIndexer,
  syncPriorityScore
};
