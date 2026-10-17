const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    role: {
      type: String,
      enum: ["citizen", "officer", "ministry"],
      default: "citizen"
    },
    name: {
      type: String,
      default: "Anonymous Citizen"
    },
    email: {
      type: String,
      default: ""
    },
    phone: {
      type: String,
      default: ""
    },
    department: {
      type: String,
      default: ""
    },
    reputationStars: {
      type: Number,
      default: 0
    },
    isAnonymized: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
