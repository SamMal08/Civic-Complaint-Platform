const { computePriority } = require("../services/priorityService");
const Issue = require("../models/Issue");
const User = require("../models/User");
const Timeline = require("../models/Timeline");
const Vote = require("../models/Vote");
const { detectDuplicates } = require("../services/duplicateService");
const {
  computeContentHash,
  reportIssueOnChain,
  voteOnChain,
  getOnChainIssue
} = require("../services/contractService");
const {
  encodeGeohash,
  getNeighbors,
  calculateDistanceKm,
  calculatePriorityScore
} = require("../services/geohashService");
const { DEFAULT_KEYS } = require("../config/chain");

/**
 * Report a new civic issue: hashes content, publishes on-chain, stores off-chain details
 */
async function createIssue(req, res, next) {
  try {
    const { title, description, category, latitude, longitude, severity, ipfsCid, privateKey } = req.body;
    const reporterWallet = req.user ? req.user.walletAddress : (req.body.reporter || "").toLowerCase();

    if (!title || !description || !category || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: title, description, category, latitude, longitude"
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const sev = parseInt(severity || 3, 10);
    const geohash = encodeGeohash(lat, lon, 7);

    // Cryptographic hash of complaint content
    const contentHash = computeContentHash({
      title,
      description,
      category,
      latitude: lat,
      longitude: lon
    });

    const cid = ipfsCid || "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

    // Use citizen's private key if provided or default citizen key
    const signerKey = privateKey || DEFAULT_KEYS.citizen;

    // Submit transaction on-chain
    const chainResult = await reportIssueOnChain(signerKey, {
      contentHash,
      ipfsCid: cid,
      category,
      latitude: lat,
      longitude: lon,
      geohash,
      severity: sev
    });

    const issueId = chainResult.issueId;

    // Fetch reporter's reputation stars
    const reporter = await User.findOne({ walletAddress: reporterWallet });
    const reporterStars = reporter ? reporter.reputationStars : 0;

    const priorityScore = calculatePriorityScore({
      severity: sev,
      upvotes: 0,
      downvotes: 0,
      reporterStars,
      createdAt: new Date()
    });

    // Save off-chain metadata in MongoDB
    const issue = await Issue.create({
      issueId,
      reporter: reporterWallet,
      contentHash,
      ipfsCid: cid,
      title,
      description,
      category,
      location: {
        type: "Point",
        coordinates: [lon, lat]
      },
      latitude: lat,
      longitude: lon,
      geohash,
      severity: sev,
      status: "Reported",
      creationTxHash: chainResult.txHash,
      creationBlockNumber: chainResult.blockNumber,
      priorityScore
    });

    // Record initial timeline entry
    await Timeline.create({
      issueId,
      status: "Reported",
      actor: reporterWallet,
      note: "Civic complaint reported by citizen",
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: "Issue reported successfully on-chain and saved off-chain",
      issue,
      onChain: {
        issueId,
        contentHash,
        txHash: chainResult.txHash,
        blockNumber: chainResult.blockNumber
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all issues with optional filtering & pagination
 */
async function getIssues(req, res, next) {
  try {
    const { category, status, severity, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (severity) filter.severity = parseInt(severity, 10);

    const scored = (await Issue.find(filter)).map((i) => {
      const o = i.toObject();
      o.priorityScore = computePriority(i); // fresh, because age changes
      return o;
    });
    scored.sort((a, b) => b.priorityScore - a.priorityScore || new Date(b.createdAt) - new Date(a.createdAt));

    const lim = parseInt(limit, 10);
    const pg = parseInt(page, 10);
    res.json({
      success: true,
      total: scored.length,
      page: pg,
      count: scored.slice((pg - 1) * lim, pg * lim).length,
      issues: scored.slice((pg - 1) * lim, pg * lim)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get nearby feed: geohash distance filtering, ranked by priority score
 */
async function getNearbyFeed(req, res, next) {
  try {
    const { lat, lon, radiusKm = 10, category } = req.query;

    if (lat === undefined || lon === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required query parameters: lat and lon"
      });
    }

    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);
    const maxRadius = parseFloat(radiusKm);

    // Find nearby geohash prefix
    const centerGeohash = encodeGeohash(userLat, userLon, 5); // ~5km prefix
    const neighborGeohashes = getNeighbors(centerGeohash);
    const filter = {
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [userLon, userLat]
          },
          $maxDistance: maxRadius * 1000 // meters
        }
      }
    };

    if (category) {
      filter.category = category;
    }

    const rawIssues = await Issue.find(filter);

    // Compute exact distance and filter within radiusKm
    const enrichedIssues = [];
    for (const issue of rawIssues) {
      const distance = calculateDistanceKm(userLat, userLon, issue.latitude, issue.longitude);
      if (distance <= maxRadius) {
        enrichedIssues.push({
          ...issue.toObject(),
          distanceKm: parseFloat(distance.toFixed(2))
        });
      }
    }

    // Sort by priorityScore descending, then distance ascending
    enrichedIssues.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return a.distanceKm - b.distanceKm;
    });

    res.json({
      success: true,
      searchCenter: { lat: userLat, lon: userLon, radiusKm: maxRadius },
      totalFound: enrichedIssues.length,
      issues: enrichedIssues
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single issue details by issueId
 */
async function getIssueById(req, res, next) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const issue = await Issue.findOne({ issueId });

    if (!issue) {
      return res.status(404).json({ success: false, error: `Issue #${issueId} not found` });
    }

    const timeline = await Timeline.find({ issueId }).sort({ timestamp: 1 });
    const votes = await Vote.find({ issueId });

    res.json({
      success: true,
      issue,
      timeline,
      communityVotes: {
        upvotes: issue.upvotes,
        downvotes: issue.downvotes,
        totalVotes: votes.filter((v) => !v.isVerification).length
      },
      verification: {
        status: issue.status,
        satisfiedVotes: issue.satisfiedVotes,
        unsatisfiedVotes: issue.unsatisfiedVotes,
        deadline: issue.verificationDeadline
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upvote or downvote an issue
 */
async function voteIssue(req, res, next) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const { voteType, privateKey } = req.body; // 'upvote' or 'downvote'
    const voterWallet = req.user ? req.user.walletAddress : (req.body.voter || "").toLowerCase();

    if (!voteType || !["upvote", "downvote"].includes(voteType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: "Invalid voteType. Must be 'upvote' or 'downvote'"
      });
    }

    const signerKey = privateKey || DEFAULT_KEYS.citizen;
    const chainResult = await voteOnChain(signerKey, issueId, voteType);

    // Read updated on-chain state to guarantee truth
    const onChain = await getOnChainIssue(issueId);

    // Update MongoDB
    const issue = await Issue.findOneAndUpdate(
      { issueId },
      {
        upvotes: onChain.upvotes,
        downvotes: onChain.downvotes
      },
      { new: true }
    );

    await Vote.findOneAndUpdate(
      { issueId, voterWallet, isVerification: false },
      {
        voteType: voteType.toLowerCase(),
        txHash: chainResult.txHash,
        timestamp: new Date()
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: `Vote (${voteType}) recorded on-chain`,
      issueId,
      upvotes: issue.upvotes,
      downvotes: issue.downvotes,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber
    });
  } catch (error) {
    next(error);
  }
}

/**
 * AI Provider Adapter: validates complaint, checks duplicates, assesses severity & categorizes
 */
async function validateWithAi(req, res, next) {
  try {
    const { aiService, providerName } = require("../services/aiService");
    const { title, description, category, latitude, longitude, imageCid } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, error: "title and description are required" });
    }

    const validation = await aiService.validateComplaint({ title, description, category });
    const severityAssessment = await aiService.assessSeverity({ title, description, category });
    const categorySuggestion = await aiService.suggestCategory({ title, description });
    const imageAnalysis = await aiService.analyzeImage({ imageCidOrUrl: imageCid, description, category });

    let duplicateCheck = { isDuplicate: false, matches: [] };
    if (latitude !== undefined && longitude !== undefined) {
      duplicateCheck = await detectDuplicates({
        title,
        description,
        category,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      });
    }

    res.json({
      success: true,
      provider: providerName,
      validation,
      severityAssessment,
      categorySuggestion,
      imageAnalysis,
      duplicateCheck
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createIssue,
  getIssues,
  getNearbyFeed,
  getIssueById,
  voteIssue,
  validateWithAi
};
