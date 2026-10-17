const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middlewares/auth");

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login or register wallet address and generate JWT
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [walletAddress]
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 example: "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
 *               role:
 *                 type: string
 *                 enum: [citizen, officer, ministry]
 *                 example: "citizen"
 *               name:
 *                 type: string
 *                 example: "Aarav Patel"
 *     responses:
 *       200:
 *         description: JWT token and user profile
 */
router.post("/login", authController.login);

/**
 * @openapi
 * /api/auth/demo/{role}:
 *   get:
 *     summary: Quick login as pre-configured demo account (admin, officer, ministry, citizen)
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [admin, officer, ministry, citizen]
 *     responses:
 *       200:
 *         description: JWT token, demo wallet address, and private key
 */
router.get("/demo/:role", authController.demoLogin);

/**
 * @openapi
 * /api/auth/profile:
 *   get:
 *     summary: Get currently authenticated user profile
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile details
 */
router.get("/profile", authenticate, authController.getProfile);

module.exports = router;
