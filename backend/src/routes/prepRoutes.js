const express = require("express");
const router = express.Router();
const Issue = require("../models/Issue");
const { authenticate, requireRole } = require("../middlewares/auth");
const { getPrepInfo } = require("../services/priorityService");

/**
 * @openapi
 * /api/officer/prep-queue:
 *   get:
 *     summary: Issues the government should start preparing for now (long jobs first)
 *     tags: [Officer Actions]
 *     security:
 *       - BearerAuth: []
 *       - WalletHeader: []
 *     responses:
 *       200:
 *         description: Prep queue sorted by start-by date
 */
router.get("/prep-queue", authenticate, requireRole("officer", "ministry"), async (req, res, next) => {
  try {
    const open = await Issue.find({ status: "Reported" });
    const queue = open
      .map((i) => ({ i, p: getPrepInfo(i) }))
      .filter((x) => x.p.inPrepQueue)
      .sort((a, b) => a.p.startBy - b.p.startBy)
      .map(({ i, p }) => ({
        issueId: i.issueId,
        title: i.title,
        category: i.category,
        severity: i.severity,
        effortClass: p.effortClass,
        prepDays: p.prepDays,
        startBy: p.startBy,
        daysUntilStart: p.daysUntilStart
      }));
    res.json({ success: true, count: queue.length, queue });
  } catch (error) {
    next(error);
  }
});

module.exports = router;