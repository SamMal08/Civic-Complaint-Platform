const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../middlewares/auth");
const { DEFAULT_KEYS } = require("../config/chain");

// Pre-defined demo accounts
const DEMO_ACCOUNTS = {
  admin: {
    walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase(),
    role: "ministry",
    name: "Central Ministry Administrator",
    department: "Ministry of Urban Development",
    privateKey: DEFAULT_KEYS.admin
  },
  officer: {
    walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase(),
    role: "officer",
    name: "Officer Rajesh Sharma",
    department: "Municipal Corporation Ward 10",
    privateKey: DEFAULT_KEYS.officer
  },
  ministry: {
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(),
    role: "ministry",
    name: "State Civic Director",
    department: "Public Works Department",
    privateKey: DEFAULT_KEYS.ministry
  },
  citizen: {
    walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase(),
    role: "citizen",
    name: "Aarav Patel",
    department: "",
    privateKey: DEFAULT_KEYS.citizen
  }
};

/**
 * Login or register wallet address and generate JWT
 */
async function login(req, res, next) {
  try {
    let { walletAddress, role, name, email, phone, department } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ success: false, error: "walletAddress is required" });
    }

    walletAddress = walletAddress.toLowerCase();

    let user = await User.findOne({ walletAddress });
    if (!user) {
      user = await User.create({
        walletAddress,
        role: role || "citizen",
        name: name || "Anonymous Citizen",
        email: email || "",
        phone: phone || "",
        department: department || ""
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
        name: user.name,
        department: user.department,
        reputationStars: user.reputationStars
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Helper to quickly switch / login as pre-defined demo accounts
 */
async function demoLogin(req, res, next) {
  try {
    const roleType = (req.params.role || "citizen").toLowerCase();
    const demoProfile = DEMO_ACCOUNTS[roleType];

    if (!demoProfile) {
      return res.status(400).json({
        success: false,
        error: `Unknown demo role '${roleType}'. Valid roles: admin, officer, ministry, citizen`
      });
    }

    let user = await User.findOne({ walletAddress: demoProfile.walletAddress });
    if (!user) {
      user = await User.create(demoProfile);
    }

    const token = jwt.sign(
      {
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      role: user.role,
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
        name: user.name,
        department: user.department,
        reputationStars: user.reputationStars
      },
      privateKey: demoProfile.privateKey
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current authenticated user profile
 */
async function getProfile(req, res, next) {
  try {
    const user = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        walletAddress: user.walletAddress,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        department: user.department,
        reputationStars: user.reputationStars,
        isAnonymized: user.isAnonymized
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  demoLogin,
  getProfile,
  DEMO_ACCOUNTS
};
