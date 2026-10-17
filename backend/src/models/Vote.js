const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
  {
    issueId: {
      type: Number,
      required: true,
      index: true
    },
    voterWallet: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },
    voteType: {
      type: String,
      enum: ["upvote", "downvote", "verification"],
      required: true
    },
    satisfied: {
      type: Boolean,
      default: null
    },
    isVerification: {
      type: Boolean,
      default: false
    },
    txHash: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

voteSchema.index({ issueId: 1, voterWallet: 1, voteType: 1 });

module.exports = mongoose.model("Vote", voteSchema);
