const express = require("express");
const router = express.Router();
const issueController = require("../controllers/issueController");
const verificationController = require("../controllers/verificationController");
const { authenticate, requireRole } = require("../middlewares/auth");

/**
 * @openapi
 * /api/issues:
 *   post:
 *     summary: Report a new civic complaint (hashes content and records on-chain)
 *     tags: [Issues]
 *     security:
 *       - BearerAuth: []
 *       - WalletHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, category, latitude, longitude]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Hazardous pothole near Indiranagar 100ft road"
 *               description:
 *                 type: string
 *                 example: "Deep crater in right lane causing severe two-wheeler traffic hazards"
 *               category:
 *                 type: string
 *                 example: "Roads"
 *               latitude:
 *                 type: number
 *                 example: 12.971598
 *               longitude:
 *                 type: number
 *                 example: 77.594562
 *               severity:
 *                 type: integer
 *                 enum: [1, 2, 3, 4, 5]
 *                 example: 4
 *               ipfsCid:
 *                 type: string
 *                 example: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
 *     responses:
 *       201:
 *         description: Issue successfully recorded on-chain and cached off-chain
 */
router.post("/", authenticate, issueController.createIssue);

/**
 * @openapi
 * /api/issues/ai-validate:
 *   post:
 *     summary: AI assessment (complaint validation, image verification, severity, duplicates, categorization)
 *     tags: [AI Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Hazardous crater on main transit road"
 *               description:
 *                 type: string
 *                 example: "Deep pothole causing serious risk to vehicles"
 *               category:
 *                 type: string
 *                 example: "Roads"
 *     responses:
 *       200:
 *         description: AI validation and assessment report
 */
router.post("/ai-validate", issueController.validateWithAi);

/**
 * @openapi
 * /api/issues:
 *   get:
 *     summary: Get all issues with optional filtering (category, status, severity)
 *     tags: [Issues]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of issues
 */
router.get("/", issueController.getIssues);

/**
 * @openapi
 * /api/issues/nearby:
 *   get:
 *     summary: Nearby civic feed ranked by priority score (geohash, severity, net votes, reporter reputation)
 *     tags: [Issues]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           example: 12.971598
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *           example: 77.594562
 *       - in: query
 *         name: radiusKm
 *         schema:
 *           type: number
 *           default: 10
 *           example: 5
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Nearby issues ranked by priority score
 */
router.get("/nearby", issueController.getNearbyFeed);

/**
 * @openapi
 * /api/issues/{id}:
 *   get:
 *     summary: Get single issue details by issueId
 *     tags: [Issues]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detailed issue information
 */
router.get("/:id", issueController.getIssueById);

/**
 * @openapi
 * /api/issues/{id}/vote:
 *   post:
 *     summary: Upvote or downvote an issue (one vote per wallet, changeable)
 *     tags: [Community Voting]
 *     security:
 *       - BearerAuth: []
 *       - WalletHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [voteType]
 *             properties:
 *               voteType:
 *                 type: string
 *                 enum: [upvote, downvote]
 *                 example: "upvote"
 *     responses:
 *       200:
 *         description: Vote recorded on-chain
 */
router.post("/:id/vote", authenticate, issueController.voteIssue);

/**
 * @openapi
 * /api/issues/{id}/open-verification:
 *   post:
 *     summary: Officer opens citizen verification window for resolved issue
 *     tags: [Verification]
 *     security:
 *       - BearerAuth: []
 *       - WalletHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 example: "Citizens please inspect the road resurfacing"
 *     responses:
 *       200:
 *         description: Verification window opened on-chain
 */
router.post("/:id/open-verification", authenticate, requireRole("officer", "ministry"), verificationController.openVerification);

/**
 * @openapi
 * /api/issues/{id}/verify:
 *   post:
 *     summary: Citizen verification vote (Satisfied/Unsatisfied). Awards +1 star reputation!
 *     tags: [Verification]
 *     security:
 *       - BearerAuth: []
 *       - WalletHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [satisfied]
 *             properties:
 *               satisfied:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Verification vote recorded on-chain, reputation awarded
 */
router.post("/:id/verify", authenticate, verificationController.voteVerification);

/**
 * @openapi
 * /api/issues/{id}/finalize:
 *   post:
 *     summary: Publicly finalize verification once deadline has passed
 *     tags: [Verification]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Verification finalized on-chain
 */
router.post("/:id/finalize", verificationController.finalizeVerification);

/**
 * @openapi
 * /api/issues/{id}/public-verification:
 *   get:
 *     summary: Public verification endpoint returning full on-chain history, tx hashes, and explorer links
 *     tags: [Verification]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Complete blockchain audit trail and verification report
 */
router.get("/:id/public-verification", verificationController.getPublicVerification);

module.exports = router;
