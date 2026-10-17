const express = require("express");
const router = express.Router();
const officerController = require("../controllers/officerController");
const { authenticate, requireRole } = require("../middlewares/auth");

// All officer routes require authenticated officer or ministry role
router.use(authenticate);
router.use(requireRole("officer", "ministry"));

/**
 * @openapi
 * /api/officer/assign:
 *   post:
 *     summary: Assign officer to an issue
 *     tags: [Officer Actions]
 *     security:
 *       - BearerAuth: []
 *       - WalletHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [issueId, officerAddress]
 *             properties:
 *               issueId:
 *                 type: integer
 *                 example: 1
 *               officerAddress:
 *                 type: string
 *                 example: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
 *               note:
 *                 type: string
 *                 example: "Assigned to Ward 10 road repair team"
 *     responses:
 *       200:
 *         description: Officer assigned on-chain
 */
router.post("/assign", officerController.assignOfficer);

/**
 * @openapi
 * /api/officer/start-work:
 *   post:
 *     summary: Mark work started on an issue
 *     tags: [Officer Actions]
 *     security:
 *       - BearerAuth: []
 *       - WalletHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [issueId]
 *             properties:
 *               issueId:
 *                 type: integer
 *                 example: 1
 *               note:
 *                 type: string
 *                 example: "Inspection team dispatched to site"
 *     responses:
 *       200:
 *         description: Status updated to WorkStarted on-chain
 */
router.post("/start-work", officerController.startWork);

/**
 * @openapi
 * /api/officer/status:
 *   patch:
 *     summary: Update issue status (WorkStarted, InProgress)
 *     tags: [Officer Actions]
 *     security:
 *       - BearerAuth: []
 *       - WalletHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [issueId, status]
 *             properties:
 *               issueId:
 *                 type: integer
 *                 example: 1
 *               status:
 *                 type: string
 *                 enum: [WorkStarted, InProgress]
 *                 example: "InProgress"
 *               note:
 *                 type: string
 *                 example: "Excavation and pipe replacement in progress"
 *     responses:
 *       200:
 *         description: Status updated on-chain
 */
router.patch("/status", officerController.updateStatus);

/**
 * @openapi
 * /api/officer/evidence:
 *   post:
 *     summary: Add transparent evidence / progress photos on-chain
 *     tags: [Officer Actions]
 *     security:
 *       - BearerAuth: []
 *       - WalletHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [issueId, evidenceHash]
 *             properties:
 *               issueId:
 *                 type: integer
 *                 example: 1
 *               evidenceHash:
 *                 type: string
 *                 example: "bafybeihdwdcefgh4dqkjv67ua4qqbdncc6x5fdafdgfsdgsdfgsdgsdfg"
 *               note:
 *                 type: string
 *                 example: "Tar layer laid, awaiting road roller"
 *     responses:
 *       200:
 *         description: Evidence recorded on-chain
 */
router.post("/evidence", officerController.addEvidence);

/**
 * @openapi
 * /api/officer/resolve:
 *   post:
 *     summary: Mark issue resolved with proof photo hash
 *     tags: [Officer Actions]
 *     security:
 *       - BearerAuth: []
 *       - WalletHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [issueId, proofPhotoHash]
 *             properties:
 *               issueId:
 *                 type: integer
 *                 example: 1
 *               proofPhotoHash:
 *                 type: string
 *                 example: "bafybeihdwdcefgh4dqkjv67ua4qqbdncc6x5fdafdgfsdgsdfgsdgsdfg"
 *               note:
 *                 type: string
 *                 example: "Pothole filled and sealed; road opened to traffic"
 *     responses:
 *       200:
 *         description: Issue resolved on-chain
 */
router.post("/resolve", officerController.markResolved);

module.exports = router;
