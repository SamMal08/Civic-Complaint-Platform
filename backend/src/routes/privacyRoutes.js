const express = require("express");
const router = express.Router();
const privacyController = require("../controllers/privacyController");
const { authenticate } = require("../middlewares/auth");

/**
 * @openapi
 * /api/users/erasure:
 *   delete:
 *     summary: Right-to-Erasure - Deletes off-chain personal data and unlinks wallet
 *     tags: [Privacy & Compliance]
 *     security:
 *       - BearerAuth: []
 *       - WalletHeader: []
 *     responses:
 *       200:
 *         description: Off-chain personal data erased successfully
 */
router.delete("/erasure", authenticate, privacyController.rightToErasure);

module.exports = router;
