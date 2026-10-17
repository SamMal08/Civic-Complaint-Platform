const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { connectDB, disconnectDB } = require("../src/config/db");
const Issue = require("../src/models/Issue");
const User = require("../src/models/User");
const Timeline = require("../src/models/Timeline");
const Vote = require("../src/models/Vote");
const {
  computeContentHash,
  reportIssueOnChain,
  assignOfficerOnChain,
  startWorkOnChain,
  updateStatusOnChain,
  addEvidenceOnChain,
  markResolvedOnChain,
  openVerificationOnChain,
  voteVerificationOnChain,
  finalizeVerificationOnChain,
  voteOnChain
} = require("../src/services/contractService");
const { encodeGeohash, calculatePriorityScore } = require("../src/services/geohashService");
const { DEFAULT_KEYS, contractAdmin } = require("../src/config/chain");

const DEMO_USERS = [
  {
    walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase(),
    role: "ministry",
    name: "Central Ministry Administrator",
    department: "Ministry of Urban Development",
    reputationStars: 10
  },
  {
    walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase(),
    role: "officer",
    name: "Officer Rajesh Sharma",
    department: "Municipal Corporation Ward 10",
    reputationStars: 8
  },
  {
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(),
    role: "ministry",
    name: "Pooja Verma",
    department: "Public Works Department State Lead",
    reputationStars: 9
  },
  {
    walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase(),
    role: "citizen",
    name: "Aarav Patel",
    email: "aarav.patel@example.com",
    phone: "+91 98765 43210",
    reputationStars: 5
  },
  {
    walletAddress: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65".toLowerCase(),
    role: "citizen",
    name: "Diya Sengupta",
    email: "diya.s@example.com",
    phone: "+91 98765 43211",
    reputationStars: 4
  },
  {
    walletAddress: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc".toLowerCase(),
    role: "citizen",
    name: "Rohan Nair",
    email: "rohan.nair@example.com",
    phone: "+91 98765 43212",
    reputationStars: 3
  }
];

const SAMPLE_ISSUES = [
  {
    title: "Deep Hazardous Pothole on 100 Feet Road",
    description: "A 1.5-meter wide, 8-inch deep crater in the central lane opposite Indiranagar Metro Station. Severe two-wheeler accident risk during monsoon.",
    category: "Roads",
    latitude: 12.971598,
    longitude: 77.594562,
    severity: 4,
    ipfsCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    targetStatus: "Reported"
  },
  {
    title: "Damaged High-Mast Street Light Array",
    description: "Four illumination fixtures non-functional causing complete blackout on primary junction near MG Road. Safety hazard for pedestrians at night.",
    category: "Electricity",
    latitude: 12.975612,
    longitude: 77.606411,
    severity: 3,
    ipfsCid: "bafybeifk4vffyqwdcx7p7xug7uuvzfsdm3e4qfg7v5v5v5v5v5v5v5v5va",
    targetStatus: "WorkStarted",
    officerNote: "Inspection dispatched; electrical replacement parts requisitioned"
  },
  {
    title: "High-Pressure Water Main Burst Flooding Street",
    description: "Severe municipal pipeline leak gushing treated drinking water and flooding traffic lane on Bandra Linking Road.",
    category: "Water",
    latitude: 19.0596,
    longitude: 72.8295,
    severity: 5,
    ipfsCid: "bafybeih6yvffyqwdcx7p7xug7uuvzfsdm3e4qfg7v5v5v5v5v5v5v5v5vb",
    targetStatus: "InProgress",
    officerNote: "Excavation completed, replacement sleeve valve being installed on site",
    evidenceHash: "bafyevidence_valve_replacement_photo"
  },
  {
    title: "Illegal Solid Waste Dumping Ground Cleared",
    description: "Large unauthorized garbage accumulation on public pedestrian pavement opposite Anna Salai government school.",
    category: "Sanitation",
    latitude: 13.0604,
    longitude: 80.2496,
    severity: 4,
    ipfsCid: "bafybeigcyvffyqwdcx7p7xug7uuvzfsdm3e4qfg7v5v5v5v5v5v5v5v5vc",
    targetStatus: "Resolved",
    proofPhotoHash: "bafyresolved_cleared_pavement_photo_hash",
    officerNote: "Sanitation trucks cleared 4 tons of waste; disinfectant sprayed"
  },
  {
    title: "Stormwater Concrete Drain Slab Reconstruction",
    description: "Collapsed concrete slab over main stormwater drain creating dangerous pitfall for children and vehicles near IT park.",
    category: "Infrastructure",
    latitude: 22.5804,
    longitude: 88.4378,
    severity: 4,
    ipfsCid: "bafybeicdyvffyqwdcx7p7xug7uuvzfsdm3e4qfg7v5v5v5v5v5v5v5v5vd",
    targetStatus: "VerificationWindow",
    proofPhotoHash: "bafyresolved_slab_concrete_photo_hash",
    officerNote: "Heavy-duty reinforced pre-cast slab installed. Citizen inspection window open."
  },
  {
    title: "Malfunctioning Traffic Signals at Sony World Junction",
    description: "Stuck green/red signals causing gridlock traffic and multiple close collisions on inner ring road intersection.",
    category: "Traffic",
    latitude: 12.9352,
    longitude: 77.6245,
    severity: 5,
    ipfsCid: "bafybeidfyvffyqwdcx7p7xug7uuvzfsdm3e4qfg7v5v5v5v5v5v5v5v5ve",
    targetStatus: "Closed",
    proofPhotoHash: "bafyresolved_traffic_signal_sensor_photo",
    officerNote: "Microcontroller board replaced, timer recalibrated, 100% verified satisfied"
  }
];

async function seed() {
  console.log("==================================================");
  console.log(" Seeding Darpan Civic Platform Data");
  console.log("==================================================");

  await connectDB();

  // Reset database collections
  console.log("[Seed] Clearing old database records...");
  await Issue.deleteMany({});
  await User.deleteMany({});
  await Timeline.deleteMany({});
  await Vote.deleteMany({});

  // Seed demo users
  console.log("[Seed] Populating demo user profiles...");
  for (const u of DEMO_USERS) {
    await User.create(u);
  }
  console.log(`[Seed] Seeded ${DEMO_USERS.length} demo users.`);

  // Lower on-chain rate limit cooldown to 1s for seeding
  try {
    const txCooldown = await contractAdmin.setMinReportCooldown(0);
    await txCooldown.wait();
    const txDur = await contractAdmin.setVerificationDuration(10);
    await txDur.wait();
  } catch (err) {
    console.warn("[Seed] Note: Could not adjust contract admin params:", err.message);
  }

  const officerWallet = DEMO_USERS[1].walletAddress;
  const citizenSignerKey = DEFAULT_KEYS.citizen;
  const officerSignerKey = DEFAULT_KEYS.officer;

  console.log("\n[Seed] Generating sample issues in EVERY lifecycle status...\n");

  for (let i = 0; i < SAMPLE_ISSUES.length; i++) {
    const item = SAMPLE_ISSUES[i];
    const geohash = encodeGeohash(item.latitude, item.longitude, 7);
    const contentHash = computeContentHash(item);

    console.log(`-> Creating Issue #${i + 1} [Target: ${item.targetStatus}]: "${item.title}"`);

    // 1. Report on-chain
    const chainReport = await reportIssueOnChain(citizenSignerKey, {
      contentHash,
      ipfsCid: item.ipfsCid,
      category: item.category,
      latitude: item.latitude,
      longitude: item.longitude,
      geohash,
      severity: item.severity
    });

    const issueId = chainReport.issueId;

    // Upvote from citizen
    try {
      await voteOnChain(citizenSignerKey, issueId, "upvote");
    } catch {
      // ignore
    }

    let currentStatus = "Reported";
    let proofPhotoHash = "";

    // Record timeline: Reported
    await Timeline.create({
      issueId,
      status: "Reported",
      actor: DEMO_USERS[3].walletAddress,
      note: "Civic issue reported by citizen",
      txHash: chainReport.txHash,
      blockNumber: chainReport.blockNumber,
      timestamp: new Date()
    });

    // 2. Lifecycle transitions based on targetStatus
    if (["WorkStarted", "InProgress", "Resolved", "VerificationWindow", "Closed"].includes(item.targetStatus)) {
      const assignTx = await assignOfficerOnChain(officerSignerKey, issueId, officerWallet, "Assigned to Ward 10 municipal squad");
      const startTx = await startWorkOnChain(officerSignerKey, issueId, item.officerNote || "Squad dispatched to location");
      currentStatus = "WorkStarted";

      await Timeline.create({
        issueId,
        status: "WorkStarted",
        actor: officerWallet,
        note: item.officerNote || "Squad dispatched to location",
        txHash: startTx.txHash,
        blockNumber: startTx.blockNumber,
        timestamp: new Date()
      });
    }

    if (["InProgress", "Resolved", "VerificationWindow", "Closed"].includes(item.targetStatus)) {
      const progTx = await updateStatusOnChain(officerSignerKey, issueId, 2, "Heavy machinery and repair crew deployed");
      currentStatus = "InProgress";

      if (item.evidenceHash) {
        await addEvidenceOnChain(officerSignerKey, issueId, item.evidenceHash, "Work progression photo captured");
      }

      await Timeline.create({
        issueId,
        status: "InProgress",
        actor: officerWallet,
        note: "Heavy machinery and repair crew deployed",
        txHash: progTx.txHash,
        blockNumber: progTx.blockNumber,
        timestamp: new Date()
      });
    }

    if (["Resolved", "VerificationWindow", "Closed"].includes(item.targetStatus)) {
      proofPhotoHash = item.proofPhotoHash || "bafyresolved_photo_proof_hash";
      const resTx = await markResolvedOnChain(officerSignerKey, issueId, proofPhotoHash, item.officerNote || "Repairs finished");
      currentStatus = "Resolved";

      await Timeline.create({
        issueId,
        status: "Resolved",
        actor: officerWallet,
        note: item.officerNote || "Repairs finished",
        txHash: resTx.txHash,
        blockNumber: resTx.blockNumber,
        timestamp: new Date()
      });
    }

    let satisfiedVotes = 0;
    let unsatisfiedVotes = 0;

    if (["VerificationWindow", "Closed"].includes(item.targetStatus)) {
      const verTx = await openVerificationOnChain(officerSignerKey, issueId, "Citizens please inspect and vote on resolution quality");
      currentStatus = "VerificationWindow";

      await Timeline.create({
        issueId,
        status: "VerificationWindow",
        actor: officerWallet,
        note: "Citizens please inspect and vote on resolution quality",
        txHash: verTx.txHash,
        blockNumber: verTx.blockNumber,
        timestamp: new Date()
      });

      // Citizen verification votes
      await voteVerificationOnChain(DEFAULT_KEYS.citizen, issueId, true);
      satisfiedVotes = 1;

      await Vote.create({
        issueId,
        voterWallet: DEMO_USERS[3].walletAddress,
        voteType: "verification",
        satisfied: true,
        isVerification: true
      });
    }

    if (item.targetStatus === "Closed") {
      // Finalize verification
      // Wait 12 seconds for the verification duration to pass
      console.log(`   Waiting for verification duration to expire on issue #${issueId}...`);
      await new Promise((r) => setTimeout(r, 12000));

      const finTx = await finalizeVerificationOnChain(citizenSignerKey, issueId);
      currentStatus = "Closed";

      await Timeline.create({
        issueId,
        status: "Closed",
        actor: "system/verifier",
        note: "Verification passed with 100% citizen satisfaction. Issue officially Closed.",
        txHash: finTx.txHash,
        blockNumber: finTx.blockNumber,
        timestamp: new Date()
      });
    }

    const priorityScore = calculatePriorityScore({
      severity: item.severity,
      upvotes: 1,
      downvotes: 0,
      reporterStars: 5,
      createdAt: new Date()
    });

    // Create MongoDB Issue record
    await Issue.create({
      issueId,
      reporter: DEMO_USERS[3].walletAddress,
      contentHash,
      ipfsCid: item.ipfsCid,
      title: item.title,
      description: item.description,
      category: item.category,
      location: {
        type: "Point",
        coordinates: [item.longitude, item.latitude]
      },
      latitude: item.latitude,
      longitude: item.longitude,
      geohash,
      severity: item.severity,
      status: currentStatus,
      assignedOfficer: ["Reported"].includes(currentStatus) ? null : officerWallet,
      proofPhotoHash,
      upvotes: 1,
      downvotes: 0,
      satisfiedVotes,
      unsatisfiedVotes,
      verificationDeadline: currentStatus === "VerificationWindow" ? new Date(Date.now() + 3 * 86400 * 1000) : null,
      creationTxHash: chainReport.txHash,
      creationBlockNumber: chainReport.blockNumber,
      priorityScore
    });

    console.log(`   √ Issue #${issueId} seeded with status '${currentStatus}'\n`);
  }

  console.log("==================================================");
  console.log(" SEEDING COMPLETE: SAMPLE ISSUES IN EVERY STATUS");
  console.log("==================================================");
  console.log("Issue 1: Reported           - Indiranagar Pothole");
  console.log("Issue 2: WorkStarted        - MG Road High-Mast Streetlight");
  console.log("Issue 3: InProgress         - Bandra Burst Water Main Pipeline");
  console.log("Issue 4: Resolved           - Anna Salai Waste Dump Cleared");
  console.log("Issue 5: VerificationWindow - Salt Lake Drain Slab Reconstructed");
  console.log("Issue 6: Closed             - Koramangala Traffic Signals Fixed");
  console.log("==================================================\n");

  await disconnectDB();
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Seed] Error seeding data:", err);
      process.exit(1);
    });
}

module.exports = seed;
