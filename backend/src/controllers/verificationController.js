const Issue = require("../models/Issue");
const Timeline = require("../models/Timeline");
const Vote = require("../models/Vote");
const User = require("../models/User");
const {
  openVerificationOnChain,
  voteVerificationOnChain,
  finalizeVerificationOnChain,
  getOnChainIssue,
  getOnChainTimeline,
  computeContentHash
} = require("../services/contractService");
const {
  contractAddress,
  chainId,
  blockExplorerUrl,
  DEFAULT_KEYS
} = require("../config/chain");

/**
 * Officer opens citizen verification window for resolved issue
 */
async function openVerification(req, res, next) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const { note, privateKey } = req.body;
    const actorWallet = req.user ? req.user.walletAddress : (req.body.actor || "").toLowerCase();

    const signerKey = privateKey || DEFAULT_KEYS.officer;
    const chainResult = await openVerificationOnChain(signerKey, issueId, note);

    // Read updated deadline from on-chain
    const onChain = await getOnChainIssue(issueId);

    await Issue.findOneAndUpdate(
      { issueId },
      {
        status: "VerificationWindow",
        verificationDeadline: onChain.verificationDeadline
      }
    );

    await Timeline.create({
      issueId,
      status: "VerificationWindow",
      actor: actorWallet,
      note: note || "Citizen verification window opened",
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: "Verification window opened on-chain",
      issueId,
      status: "VerificationWindow",
      verificationDeadline: onChain.verificationDeadline,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Citizen votes Satisfied or Unsatisfied during verification window
 */
async function voteVerification(req, res, next) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const { satisfied, privateKey } = req.body;
    const voterWallet = req.user ? req.user.walletAddress : (req.body.voter || "").toLowerCase();

    if (satisfied === undefined) {
      return res.status(400).json({ success: false, error: "satisfied boolean is required (true/false)" });
    }

    const isSatisfied = Boolean(satisfied);
    const signerKey = privateKey || DEFAULT_KEYS.citizen;

    const chainResult = await voteVerificationOnChain(signerKey, issueId, isSatisfied);

    // Read updated on-chain vote counts
    const onChain = await getOnChainIssue(issueId);

    await Issue.findOneAndUpdate(
      { issueId },
      {
        satisfiedVotes: onChain.satisfiedVotes,
        unsatisfiedVotes: onChain.unsatisfiedVotes
      }
    );

    await Vote.create({
      issueId,
      voterWallet,
      voteType: "verification",
      satisfied: isSatisfied,
      isVerification: true,
      txHash: chainResult.txHash
    });

    // Increment star reputation for the voter
    const user = await User.findOneAndUpdate(
      { walletAddress: voterWallet },
      { $inc: { reputationStars: 1 } },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `Verification vote (${isSatisfied ? "Satisfied" : "Unsatisfied"}) recorded on-chain! +1 Star reputation awarded.`,
      issueId,
      voter: voterWallet,
      satisfied: isSatisfied,
      newReputationStars: user.reputationStars,
      satisfiedVotes: onChain.satisfiedVotes,
      unsatisfiedVotes: onChain.unsatisfiedVotes,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Publicly finalize verification window after deadline has passed
 */
async function finalizeVerification(req, res, next) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const { privateKey } = req.body;

    const signerKey = privateKey || DEFAULT_KEYS.citizen;
    const chainResult = await finalizeVerificationOnChain(signerKey, issueId);

    // Sync final on-chain status
    const onChain = await getOnChainIssue(issueId);

    await Issue.findOneAndUpdate(
      { issueId },
      {
        status: onChain.status,
        satisfiedVotes: onChain.satisfiedVotes,
        unsatisfiedVotes: onChain.unsatisfiedVotes
      }
    );

    res.json({
      success: true,
      message: `Verification finalized on-chain with final status: ${onChain.status}`,
      issueId,
      finalStatus: onChain.status,
      satisfiedVotes: onChain.satisfiedVotes,
      unsatisfiedVotes: onChain.unsatisfiedVotes,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public verification endpoint returning full on-chain history, transaction hashes, and explorer links
 */
async function getPublicVerification(req, res, next) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const issue = await Issue.findOne({ issueId });

    if (!issue) {
      return res.status(404).json({ success: false, error: `Issue #${issueId} not found` });
    }

    // Query on-chain source of truth
    const onChainData = await getOnChainIssue(issueId);
    const onChainTimeline = await getOnChainTimeline(issueId);
    const dbTimeline = await Timeline.find({ issueId }).sort({ timestamp: 1 });

    // Validate cryptographic content hash match
    const recalculatedHash = computeContentHash({
      title: issue.title,
      description: issue.description,
      category: issue.category,
      latitude: issue.latitude,
      longitude: issue.longitude
    });

    const isHashVerified = (recalculatedHash.toLowerCase() === onChainData.contentHash.toLowerCase());

    // Enrich timeline with explorer links
    const enrichedTimeline = dbTimeline.map((item) => ({
      status: item.status,
      actor: item.actor,
      note: item.note,
      timestamp: item.timestamp,
      txHash: item.txHash,
      blockNumber: item.blockNumber,
      explorerLink: item.txHash ? `${blockExplorerUrl}/tx/${item.txHash}` : null
    }));

    res.json({
      success: true,
      auditReport: {
        issueId,
        contractAddress,
        chainId,
        verifiedOnChain: true,
        hashIntegrity: {
          storedContentHash: onChainData.contentHash,
          computedContentHash: recalculatedHash,
          matchesCryptographically: isHashVerified
        },
        currentStatus: onChainData.status,
        reporterWallet: onChainData.reporter,
        ipfsCid: onChainData.ipfsCid,
        proofPhotoHash: onChainData.proofPhotoHash || null,
        assignedOfficer: onChainData.assignedOfficer,
        communityVotes: {
          upvotes: onChainData.upvotes,
          downvotes: onChainData.downvotes,
          netVotes: onChainData.upvotes - onChainData.downvotes
        },
        citizenVerification: {
          status: onChainData.status,
          deadline: onChainData.verificationDeadline,
          satisfiedVotes: onChainData.satisfiedVotes,
          unsatisfiedVotes: onChainData.unsatisfiedVotes,
          satisfactionRatePercent:
            onChainData.satisfiedVotes + onChainData.unsatisfiedVotes > 0
              ? Math.round(
                  (onChainData.satisfiedVotes * 100) /
                    (onChainData.satisfiedVotes + onChainData.unsatisfiedVotes)
                )
              : null
        },
        creationTx: {
          txHash: issue.creationTxHash,
          blockNumber: issue.creationBlockNumber,
          explorerLink: issue.creationTxHash ? `${blockExplorerUrl}/tx/${issue.creationTxHash}` : null
        },
        onChainTimelineEvents: onChainTimeline,
        fullAuditTrail: enrichedTimeline
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  openVerification,
  voteVerification,
  finalizeVerification,
  getPublicVerification
};
