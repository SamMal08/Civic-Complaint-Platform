const Issue = require("../models/Issue");
const Timeline = require("../models/Timeline");
const {
  assignOfficerOnChain,
  startWorkOnChain,
  updateStatusOnChain,
  addEvidenceOnChain,
  markResolvedOnChain,
  getOnChainIssue
} = require("../services/contractService");
const { DEFAULT_KEYS } = require("../config/chain");

/**
 * Assign an officer to an issue
 */
async function assignOfficer(req, res, next) {
  try {
    const { issueId, officerAddress, note, privateKey } = req.body;
    const actorWallet = req.user ? req.user.walletAddress : (req.body.actor || "").toLowerCase();

    if (!issueId || !officerAddress) {
      return res.status(400).json({ success: false, error: "issueId and officerAddress are required" });
    }

    const signerKey = privateKey || DEFAULT_KEYS.officer;
    const chainResult = await assignOfficerOnChain(signerKey, issueId, officerAddress, note);

    await Issue.findOneAndUpdate(
      { issueId },
      { assignedOfficer: officerAddress.toLowerCase() }
    );

    await Timeline.create({
      issueId,
      status: (await Issue.findOne({ issueId }))?.status || "Reported",
      actor: actorWallet,
      note: note || `Assigned to officer ${officerAddress}`,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: "Officer assigned successfully on-chain",
      issueId,
      assignedOfficer: officerAddress,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Officer marks work started
 */
async function startWork(req, res, next) {
  try {
    const { issueId, note, privateKey } = req.body;
    const actorWallet = req.user ? req.user.walletAddress : (req.body.actor || "").toLowerCase();

    if (!issueId) {
      return res.status(400).json({ success: false, error: "issueId is required" });
    }

    const signerKey = privateKey || DEFAULT_KEYS.officer;
    const chainResult = await startWorkOnChain(signerKey, issueId, note);

    await Issue.findOneAndUpdate({ issueId }, { status: "WorkStarted" });

    await Timeline.create({
      issueId,
      status: "WorkStarted",
      actor: actorWallet,
      note: note || "Work started on site by municipal team",
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: "Status updated to WorkStarted on-chain",
      issueId,
      status: "WorkStarted",
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Officer updates status (e.g. to InProgress)
 */
async function updateStatus(req, res, next) {
  try {
    const { issueId, status, note, privateKey } = req.body;
    const actorWallet = req.user ? req.user.walletAddress : (req.body.actor || "").toLowerCase();

    if (!issueId || !status) {
      return res.status(400).json({ success: false, error: "issueId and status are required" });
    }

    const statusMap = {
      workstarted: 1,
      inprogress: 2
    };

    const statusIndex = statusMap[status.toLowerCase()];
    if (statusIndex === undefined) {
      return res.status(400).json({
        success: false,
        error: "Invalid status update. Allowed: WorkStarted, InProgress"
      });
    }

    const signerKey = privateKey || DEFAULT_KEYS.officer;
    const chainResult = await updateStatusOnChain(signerKey, issueId, statusIndex, note);

    const formattedStatus = statusIndex === 1 ? "WorkStarted" : "InProgress";

    await Issue.findOneAndUpdate({ issueId }, { status: formattedStatus });

    await Timeline.create({
      issueId,
      status: formattedStatus,
      actor: actorWallet,
      note: note || `Status updated to ${formattedStatus}`,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `Status updated to ${formattedStatus} on-chain`,
      issueId,
      status: formattedStatus,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Officer adds transparent evidence
 */
async function addEvidence(req, res, next) {
  try {
    const { issueId, evidenceHash, note, privateKey } = req.body;
    const actorWallet = req.user ? req.user.walletAddress : (req.body.actor || "").toLowerCase();

    if (!issueId || !evidenceHash) {
      return res.status(400).json({ success: false, error: "issueId and evidenceHash are required" });
    }

    const signerKey = privateKey || DEFAULT_KEYS.officer;
    const chainResult = await addEvidenceOnChain(signerKey, issueId, evidenceHash, note);

    const issue = await Issue.findOne({ issueId });

    await Timeline.create({
      issueId,
      status: issue?.status || "InProgress",
      actor: actorWallet,
      note: `Evidence: ${evidenceHash} | ${note || ""}`,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: "Evidence recorded on-chain",
      issueId,
      evidenceHash,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Officer marks issue resolved with proof photo hash
 */
async function markResolved(req, res, next) {
  try {
    const { issueId, proofPhotoHash, note, privateKey } = req.body;
    const actorWallet = req.user ? req.user.walletAddress : (req.body.actor || "").toLowerCase();

    if (!issueId || !proofPhotoHash) {
      return res.status(400).json({ success: false, error: "issueId and proofPhotoHash are required" });
    }

    const signerKey = privateKey || DEFAULT_KEYS.officer;
    const chainResult = await markResolvedOnChain(signerKey, issueId, proofPhotoHash, note);

    await Issue.findOneAndUpdate(
      { issueId },
      {
        status: "Resolved",
        proofPhotoHash
      }
    );

    await Timeline.create({
      issueId,
      status: "Resolved",
      actor: actorWallet,
      note: note || `Issue resolved with proof photo: ${proofPhotoHash}`,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: "Issue marked resolved on-chain",
      issueId,
      status: "Resolved",
      proofPhotoHash,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  assignOfficer,
  startWork,
  updateStatus,
  addEvidence,
  markResolved
};
