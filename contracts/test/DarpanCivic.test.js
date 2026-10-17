const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DarpanCivic Smart Contract", function () {
  let darpanCivic;
  let admin, officer, ministry, citizen1, citizen2, citizen3;
  let OFFICER_ROLE, MINISTRY_ROLE;

  const sampleContentHash = ethers.keccak256(ethers.toUtf8Bytes("Indiranagar 100ft road pothole near junction"));
  const sampleCid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
  const sampleProofHash = "bafybeihdwdcefgh4dqkjv67ua4qqbdncc6x5fdafdgfsdgsdfgsdgsdfg";
  const sampleLat = 12971598; // 12.971598 scaled by 1e6
  const sampleLong = 77594562; // 77.594562 scaled by 1e6
  const sampleGeohash = "tdr1v7m";

  beforeEach(async function () {
    [admin, officer, ministry, citizen1, citizen2, citizen3] = await ethers.getSigners();

    const DarpanCivic = await ethers.getContractFactory("DarpanCivic");
    darpanCivic = await DarpanCivic.deploy();
    await darpanCivic.waitForDeployment();

    OFFICER_ROLE = await darpanCivic.OFFICER_ROLE();
    MINISTRY_ROLE = await darpanCivic.MINISTRY_ROLE();

    // Grant roles to officer and ministry
    await darpanCivic.grantRole(OFFICER_ROLE, officer.address);
    await darpanCivic.grantRole(MINISTRY_ROLE, ministry.address);

    // Set cooldown to 1 second for test speed
    await darpanCivic.setMinReportCooldown(1);
    // Set verification duration to 60 seconds for test speed
    await darpanCivic.setVerificationDuration(60);
  });

  describe("Deployment & AccessControl", function () {
    it("should deploy with correct roles assigned to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = await darpanCivic.DEFAULT_ADMIN_ROLE();
      expect(await darpanCivic.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await darpanCivic.hasRole(OFFICER_ROLE, officer.address)).to.be.true;
      expect(await darpanCivic.hasRole(MINISTRY_ROLE, ministry.address)).to.be.true;
      expect(await darpanCivic.hasRole(OFFICER_ROLE, citizen1.address)).to.be.false;
    });
  });

  describe("Issue Reporting", function () {
    it("should successfully report an issue and emit events", async function () {
      const tx = await darpanCivic.connect(citizen1).reportIssue(
        sampleContentHash,
        sampleCid,
        "Roads",
        sampleLat,
        sampleLong,
        sampleGeohash,
        4
      );

      await expect(tx)
        .to.emit(darpanCivic, "IssueReported")
        .withArgs(1, citizen1.address, sampleContentHash, sampleCid, "Roads", sampleLat, sampleLong, sampleGeohash, 4, (val) => val > 0);

      const issue = await darpanCivic.getIssue(1);
      expect(issue.id).to.equal(1);
      expect(issue.reporter).to.equal(citizen1.address);
      expect(issue.category).to.equal("Roads");
      expect(issue.status).to.equal(0); // Status.Reported
      expect(issue.severity).to.equal(4);
      expect(issue.geohash).to.equal(sampleGeohash);

      const timeline = await darpanCivic.getTimeline(1);
      expect(timeline.length).to.equal(1);
      expect(timeline[0].status).to.equal(0);
      expect(timeline[0].actor).to.equal(citizen1.address);
    });

    it("should enforce per-wallet rate limit", async function () {
      await darpanCivic.setMinReportCooldown(300); // 5 minutes

      await darpanCivic.connect(citizen1).reportIssue(
        sampleContentHash,
        sampleCid,
        "Roads",
        sampleLat,
        sampleLong,
        sampleGeohash,
        3
      );

      await expect(
        darpanCivic.connect(citizen1).reportIssue(
          sampleContentHash,
          sampleCid,
          "Water",
          sampleLat,
          sampleLong,
          sampleGeohash,
          2
        )
      ).to.be.revertedWith("Rate limit: please wait before reporting another issue");

      // Another citizen can report without rate limit interference
      await expect(
        darpanCivic.connect(citizen2).reportIssue(
          sampleContentHash,
          sampleCid,
          "Sanitation",
          sampleLat,
          sampleLong,
          sampleGeohash,
          2
        )
      ).to.not.be.reverted;
    });

    it("should validate input constraints", async function () {
      await expect(
        darpanCivic.connect(citizen1).reportIssue(sampleContentHash, sampleCid, "", sampleLat, sampleLong, sampleGeohash, 3)
      ).to.be.revertedWith("Category cannot be empty");

      await expect(
        darpanCivic.connect(citizen1).reportIssue(sampleContentHash, sampleCid, "Roads", sampleLat, sampleLong, sampleGeohash, 6)
      ).to.be.revertedWith("Severity must be between 1 and 5");
    });
  });

  describe("Voting (Upvote / Downvote)", function () {
    beforeEach(async function () {
      await darpanCivic.connect(citizen1).reportIssue(
        sampleContentHash,
        sampleCid,
        "Roads",
        sampleLat,
        sampleLong,
        sampleGeohash,
        3
      );
    });

    it("should allow a citizen to upvote and prevent duplicate voting", async function () {
      await expect(darpanCivic.connect(citizen2).vote(1, 1)) // 1 = Upvote
        .to.emit(darpanCivic, "IssueVoted")
        .withArgs(1, citizen2.address, 0, 1, 1, 0);

      let issue = await darpanCivic.getIssue(1);
      expect(issue.upvotes).to.equal(1);
      expect(issue.downvotes).to.equal(0);

      // Attempt duplicate vote
      await expect(darpanCivic.connect(citizen2).vote(1, 1)).to.be.revertedWith("Already cast this vote");
    });

    it("should allow changing vote from upvote to downvote and vice versa", async function () {
      await darpanCivic.connect(citizen2).vote(1, 1); // Upvote

      // Change to Downvote (2)
      await expect(darpanCivic.connect(citizen2).vote(1, 2))
        .to.emit(darpanCivic, "IssueVoted")
        .withArgs(1, citizen2.address, 1, 2, 0, 1);

      let issue = await darpanCivic.getIssue(1);
      expect(issue.upvotes).to.equal(0);
      expect(issue.downvotes).to.equal(1);

      // Change back to Upvote (1)
      await darpanCivic.connect(citizen2).vote(1, 1);
      issue = await darpanCivic.getIssue(1);
      expect(issue.upvotes).to.equal(1);
      expect(issue.downvotes).to.equal(0);
    });
  });

  describe("Officer Workflow & Lifecycle", function () {
    beforeEach(async function () {
      await darpanCivic.connect(citizen1).reportIssue(
        sampleContentHash,
        sampleCid,
        "Sanitation",
        sampleLat,
        sampleLong,
        sampleGeohash,
        4
      );
    });

    it("should reject non-officer from officer operations", async function () {
      await expect(
        darpanCivic.connect(citizen1).startWork(1, "Starting work")
      ).to.be.reverted;

      await expect(
        darpanCivic.connect(citizen1).markResolved(1, sampleProofHash, "Done")
      ).to.be.reverted;
    });

    it("should execute full officer lifecycle: Reported -> Work Started -> In Progress -> Resolved", async function () {
      // 1. Assign officer
      await expect(darpanCivic.connect(officer).assignOfficer(1, officer.address, "Assigned to Ward 10 team"))
        .to.emit(darpanCivic, "OfficerAssigned")
        .withArgs(1, officer.address, officer.address, (val) => val > 0);

      // 2. Start Work
      await expect(darpanCivic.connect(officer).startWork(1, "Inspection team dispatched"))
        .to.emit(darpanCivic, "IssueStatusUpdated")
        .withArgs(1, 0, 1, officer.address, "Inspection team dispatched", (val) => val > 0);

      let issue = await darpanCivic.getIssue(1);
      expect(issue.status).to.equal(1); // WorkStarted

      // 3. Update Status to In Progress
      await darpanCivic.connect(officer).updateStatus(1, 2, "Repair machinery deployed on site");
      issue = await darpanCivic.getIssue(1);
      expect(issue.status).to.equal(2); // InProgress

      // 4. Add evidence
      await expect(darpanCivic.connect(officer).addEvidence(1, "bafyevidence123", "Pothole filled with bitumen layer"))
        .to.emit(darpanCivic, "EvidenceAdded")
        .withArgs(1, officer.address, "bafyevidence123", "Pothole filled with bitumen layer", (val) => val > 0);

      // 5. Mark Resolved
      await expect(darpanCivic.connect(officer).markResolved(1, sampleProofHash, "Road resurfacing completed"))
        .to.emit(darpanCivic, "IssueStatusUpdated")
        .withArgs(1, 2, 3, officer.address, "Road resurfacing completed", (val) => val > 0);

      issue = await darpanCivic.getIssue(1);
      expect(issue.status).to.equal(3); // Resolved
      expect(issue.proofPhotoHash).to.equal(sampleProofHash);

      // Verify timeline integrity
      const timeline = await darpanCivic.getTimeline(1);
      expect(timeline.length).to.be.greaterThanOrEqual(5);
    });

    it("should support convenience method markResolvedAndOpenVerification", async function () {
      await darpanCivic.connect(officer).startWork(1, "Work started");
      await darpanCivic.connect(officer).updateStatus(1, 2, "In progress");

      await darpanCivic.connect(officer).markResolvedAndOpenVerification(
        1,
        sampleProofHash,
        "Completed and opening citizen verification window"
      );

      const issue = await darpanCivic.getIssue(1);
      expect(issue.status).to.equal(4); // VerificationWindow
      expect(issue.proofPhotoHash).to.equal(sampleProofHash);
      expect(issue.verificationDeadline).to.be.greaterThan(0);
    });
  });

  describe("Verification Window & Star Reputation", function () {
    beforeEach(async function () {
      await darpanCivic.connect(citizen1).reportIssue(
        sampleContentHash,
        sampleCid,
        "Water",
        sampleLat,
        sampleLong,
        sampleGeohash,
        4
      );

      await darpanCivic.connect(officer).startWork(1, "Repair team on site");
      await darpanCivic.connect(officer).updateStatus(1, 2, "Fixing pipeline valve");
      await darpanCivic.connect(officer).markResolved(1, sampleProofHash, "Valve replaced");
      await darpanCivic.connect(officer).openVerification(1, "Please verify tap water pressure");
    });

    it("should allow citizen verification vote and award star reputation", async function () {
      expect(await darpanCivic.getReputation(citizen2.address)).to.equal(0);

      // Citizen 2 votes Satisfied
      await expect(darpanCivic.connect(citizen2).voteVerification(1, true))
        .to.emit(darpanCivic, "VerificationVoteCast")
        .withArgs(1, citizen2.address, true, 1, 0)
        .and.to.emit(darpanCivic, "ReputationUpdated")
        .withArgs(citizen2.address, 1);

      expect(await darpanCivic.getReputation(citizen2.address)).to.equal(1);

      // Attempt duplicate verification vote
      await expect(
        darpanCivic.connect(citizen2).voteVerification(1, true)
      ).to.be.revertedWith("Wallet already voted in verification window");

      // Citizen 3 votes Unsatisfied
      await expect(darpanCivic.connect(citizen3).voteVerification(1, false))
        .to.emit(darpanCivic, "VerificationVoteCast")
        .withArgs(1, citizen3.address, false, 1, 1)
        .and.to.emit(darpanCivic, "ReputationUpdated")
        .withArgs(citizen3.address, 1);

      expect(await darpanCivic.getReputation(citizen3.address)).to.equal(1);

      const issue = await darpanCivic.getIssue(1);
      expect(issue.satisfiedVotes).to.equal(1);
      expect(issue.unsatisfiedVotes).to.equal(1);
    });

    it("should prevent finalizeVerification while window is still active", async function () {
      await expect(
        darpanCivic.finalizeVerification(1)
      ).to.be.revertedWith("Verification window is still active");
    });

    it("should finalize to Closed when Satisfied >= 60%", async function () {
      // 2 satisfied votes, 0 unsatisfied votes = 100% satisfied
      await darpanCivic.connect(citizen2).voteVerification(1, true);
      await darpanCivic.connect(citizen3).voteVerification(1, true);

      // Fast forward past verification window
      await time.increase(70);

      await expect(darpanCivic.finalizeVerification(1))
        .to.emit(darpanCivic, "VerificationFinalized")
        .withArgs(1, 5, 2, 0, "Closed: Citizen verification passed"); // 5 = Closed

      const issue = await darpanCivic.getIssue(1);
      expect(issue.status).to.equal(5); // Closed
    });

    it("should finalize to InProgress (re-queued) when Unsatisfied >= 60%", async function () {
      // 1 satisfied vote, 2 unsatisfied votes = 66.6% unsatisfied
      await darpanCivic.connect(citizen1).voteVerification(1, false);
      await darpanCivic.connect(citizen2).voteVerification(1, false);
      await darpanCivic.connect(citizen3).voteVerification(1, true);

      // Fast forward past verification window
      await time.increase(70);

      await expect(darpanCivic.finalizeVerification(1))
        .to.emit(darpanCivic, "VerificationFinalized")
        .withArgs(1, 2, 1, 2, "Re-queued to In Progress: Unsatisfied threshold reached"); // 2 = InProgress

      const issue = await darpanCivic.getIssue(1);
      expect(issue.status).to.equal(2); // InProgress (re-queued)

      const timeline = await darpanCivic.getTimeline(1);
      const lastEntry = timeline[timeline.length - 1];
      expect(lastEntry.status).to.equal(2);
      expect(lastEntry.note).to.include("Re-queued");
    });

    it("should auto-close when no citizen feedback is received in verification window", async function () {
      // No votes cast
      // Fast forward past verification window
      await time.increase(70);

      await expect(darpanCivic.finalizeVerification(1))
        .to.emit(darpanCivic, "VerificationFinalized")
        .withArgs(1, 5, 0, 0, "Auto-closed: No citizen verification feedback received during window");

      const issue = await darpanCivic.getIssue(1);
      expect(issue.status).to.equal(5); // Closed
    });
  });
});
