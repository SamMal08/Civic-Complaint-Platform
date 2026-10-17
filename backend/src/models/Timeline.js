const mongoose = require("mongoose");

const timelineSchema = new mongoose.Schema(
  {
    issueId: {
      type: Number,
      required: true,
      index: true
    },
    status: {
      type: String,
      required: true
    },
    actor: {
      type: String,
      required: true,
      lowercase: true
    },
    note: {
      type: String,
      default: ""
    },
    txHash: {
      type: String,
      default: ""
    },
    blockNumber: {
      type: Number,
      default: 0
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

timelineSchema.index({ issueId: 1, timestamp: 1 });

module.exports = mongoose.model("Timeline", timelineSchema);
