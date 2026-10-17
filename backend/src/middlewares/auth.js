const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "darpan_civic_platform_jwt_secret_demo_2026";

/**
 * Authenticates request using JWT Bearer token or fallback developer headers
 */
async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    }

    // Demo/developer convenience: allow X-Wallet-Address header for direct testing
    const devWallet = req.headers["x-wallet-address"];
    if (devWallet) {
      const devRole = req.headers["x-role"] || "citizen";
      let user = await User.findOne({ walletAddress: devWallet.toLowerCase() });
      if (!user) {
        user = await User.create({
          walletAddress: devWallet.toLowerCase(),
          role: devRole
        });
      }
      req.user = {
        walletAddress: user.walletAddress,
        role: user.role,
        id: user._id
      };
      return next();
    }

    return res.status(401).json({
      success: false,
      error: "Authentication required. Provide Bearer token or X-Wallet-Address."
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token",
      details: error.message
    });
  }
}

/**
 * Role-based access control middleware
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: [${allowedRoles.join(", ")}], but user is '${req.user.role}'`
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  JWT_SECRET
};
