const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    issueId: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    reporter: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },
    contentHash: {
      type: String,
      required: true,
      index: true
    },
    ipfsCid: {
      type: String,
      default: ""
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true,
      index: true
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    geohash: {
      type: String,
      required: true,
      index: true
    },
    severity: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    status: {
      type: String,
      enum: ["Reported", "WorkStarted", "InProgress", "Resolved", "VerificationWindow", "Closed"],
      default: "Reported",
      index: true
    },
    assignedOfficer: {
      type: String,
      lowercase: true,
      default: null,
      index: true
    },
    proofPhotoHash: {
      type: String,
      default: ""
    },
    upvotes: {
      type: Number,
      default: 0
    },
    downvotes: {
      type: Number,
      default: 0
    },
    satisfiedVotes: {
      type: Number,
      default: 0
    },
    unsatisfiedVotes: {
      type: Number,
      default: 0
    },
    verificationDeadline: {
      type: Date,
      default: null
    },
    creationTxHash: {
      type: String,
      default: ""
    },
    creationBlockNumber: {
      type: Number,
      default: 0
    },
    priorityScore: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

issueSchema.index({ location: "2dsphere" });
issueSchema.index({ geohash: 1, priorityScore: -1 });

module.exports = mongoose.model("Issue", issueSchema);
