const User = require("../models/User");
const Issue = require("../models/Issue");

/**
 * Right-to-Erasure (GDPR / Privacy compliance):
 * Scrubs all personal identifying data (name, email, phone, department) from off-chain MongoDB,
 * unlinks personal identity from the wallet address, while preserving on-chain cryptographic integrity
 * (the blockchain stores only pseudonymous wallet address and cryptographic content hashes).
 */
async function rightToErasure(req, res, next) {
  try {
    const walletAddress = req.user.walletAddress.toLowerCase();

    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // 1. Scrub personal data from User profile
    user.name = "Anonymized Citizen";
    user.email = "";
    user.phone = "";
    user.department = "";
    user.isAnonymized = true;
    await user.save();

    // 2. Anonymize any personal mentions in reported issues
    await Issue.updateMany(
      { reporter: walletAddress },
      { $set: { "reporterName": "Anonymized Citizen" } }
    );

    res.json({
      success: true,
      message: "Right-to-erasure executed successfully. All off-chain personal data has been erased and wallet unlinked from personal identity.",
      erasureDetails: {
        walletAddress: user.walletAddress,
        isAnonymized: true,
        blockchainIntegrityPreserved: "On-chain state retains only pseudonymous wallet address and cryptographic hashes."
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  rightToErasure
};
