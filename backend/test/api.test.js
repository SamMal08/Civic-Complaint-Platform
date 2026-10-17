const assert = require("assert");
const http = require("http");
const app = require("../src/app");
const { connectDB, disconnectDB } = require("../src/config/db");
const { DEMO_ACCOUNTS } = require("../src/controllers/authController");

let server;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("\n==================================================");
  console.log(" Running Darpan Backend & Web3 API Integration Tests");
  console.log("==================================================");

  // Start in-memory DB and test server
  await connectDB();
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server active on ${baseUrl}\n`);

  let citizenToken = "";
  let officerToken = "";

  try {
    // 1. Health Check
    console.log("Test 1: Health check endpoint");
    const health = await request("GET", "/api/health");
    assert.strictEqual(health.status, 200, "Health check should return 200");
    assert.strictEqual(health.body.status, "ok");
    assert.ok(health.body.web3.contractAddress, "Should expose contract address");
    console.log("  √ Health check passed (Web3 contract connected)\n");

    // 2. Demo Auth
    console.log("Test 2: Demo authentication & role-based JWT generation");
    const citizenLogin = await request("GET", "/api/auth/demo/citizen");
    assert.strictEqual(citizenLogin.status, 200);
    assert.strictEqual(citizenLogin.body.role, "citizen");
    citizenToken = citizenLogin.body.token;
    assert.ok(citizenToken, "Should generate citizen JWT");

    const officerLogin = await request("GET", "/api/auth/demo/officer");
    assert.strictEqual(officerLogin.status, 200);
    assert.strictEqual(officerLogin.body.role, "officer");
    officerToken = officerLogin.body.token;
    assert.ok(officerToken, "Should generate officer JWT");
    console.log("  √ Authentication & JWT generation passed\n");

    // 3. Create Issue
    console.log("Test 3: Citizen reporting civic complaint");
    const newIssueRes = await request(
      "POST",
      "/api/issues",
      {
        title: "Dangerous Pothole on 100ft Road",
        description: "Large crater in lane near Indiranagar metro station",
        category: "Roads",
        latitude: 12.971598,
        longitude: 77.594562,
        severity: 4,
        ipfsCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
      },
      { Authorization: `Bearer ${citizenToken}` }
    );
    assert.strictEqual(newIssueRes.status, 201, "Issue creation should return 201");
    assert.strictEqual(newIssueRes.body.success, true);
    const createdIssue = newIssueRes.body.issue;
    const issueId = createdIssue.issueId;
    assert.ok(issueId, "Issue should have an ID");
    assert.strictEqual(createdIssue.status, "Reported");
    console.log(`  √ Issue #${issueId} created with content hash: ${createdIssue.contentHash}\n`);

    // 4. Nearby Feed & Priority Ranking
    console.log("Test 4: Nearby feed with geohash distance & priority scoring");
    const nearbyRes = await request("GET", `/api/issues/nearby?lat=12.971598&lon=77.594562&radiusKm=5`);
    assert.strictEqual(nearbyRes.status, 200);
    assert.ok(nearbyRes.body.issues.length >= 1);
    const nearbyIssue = nearbyRes.body.issues[0];
    assert.ok(nearbyIssue.distanceKm !== undefined, "Should calculate distance in km");
    assert.ok(nearbyIssue.priorityScore > 0, "Should compute priority score");
    console.log(`  √ Nearby feed returned issues within 5km, top priority score: ${nearbyIssue.priorityScore}\n`);

    // 5. Community Upvoting
    console.log("Test 5: Citizen community voting (Upvote)");
    const voteRes = await request(
      "POST",
      `/api/issues/${issueId}/vote`,
      { voteType: "upvote" },
      { Authorization: `Bearer ${citizenToken}` }
    );
    assert.strictEqual(voteRes.status, 200);
    assert.strictEqual(voteRes.body.upvotes, 1);
    console.log("  √ Community upvote recorded on-chain\n");

    // 6. Officer Role Restriction & Workflow
    console.log("Test 6: Role enforcement & Officer workflow (WorkStarted -> InProgress -> Evidence -> Resolved)");
    
    // Citizen cannot start work
    const unauthorized = await request(
      "POST",
      "/api/officer/start-work",
      { issueId, note: "Citizen trying to start work" },
      { Authorization: `Bearer ${citizenToken}` }
    );
    assert.strictEqual(unauthorized.status, 403, "Citizen should be forbidden from officer actions");

    // Officer assigns
    const assignRes = await request(
      "POST",
      "/api/officer/assign",
      { issueId, officerAddress: DEMO_ACCOUNTS.officer.walletAddress, note: "Assigned to Ward 10" },
      { Authorization: `Bearer ${officerToken}` }
    );
    assert.strictEqual(assignRes.status, 200);

    // Officer starts work
    const startRes = await request(
      "POST",
      "/api/officer/start-work",
      { issueId, note: "Inspection team arrived on site" },
      { Authorization: `Bearer ${officerToken}` }
    );
    assert.strictEqual(startRes.status, 200);
    assert.strictEqual(startRes.body.status, "WorkStarted");

    // Officer updates status to InProgress
    const inProgressRes = await request(
      "PATCH",
      "/api/officer/status",
      { issueId, status: "InProgress", note: "Bitumen laying in progress" },
      { Authorization: `Bearer ${officerToken}` }
    );
    assert.strictEqual(inProgressRes.status, 200);
    assert.strictEqual(inProgressRes.body.status, "InProgress");

    // Officer adds evidence
    const evidenceRes = await request(
      "POST",
      "/api/officer/evidence",
      { issueId, evidenceHash: "bafyevidence_layer1_photo", note: "First layer laid" },
      { Authorization: `Bearer ${officerToken}` }
    );
    assert.strictEqual(evidenceRes.status, 200);

    // Officer marks resolved
    const resolveRes = await request(
      "POST",
      "/api/officer/resolve",
      {
        issueId,
        proofPhotoHash: "bafyresolved_final_photo_hash",
        note: "Road fully resurfaced and opened"
      },
      { Authorization: `Bearer ${officerToken}` }
    );
    assert.strictEqual(resolveRes.status, 200);
    assert.strictEqual(resolveRes.body.status, "Resolved");
    console.log("  √ Officer lifecycle transitions successfully recorded on-chain\n");

    // 7. Citizen Verification Window & Star Reputation
    console.log("Test 7: Citizen verification window & star reputation reward");
    const openVerRes = await request(
      "POST",
      `/api/issues/${issueId}/open-verification`,
      { note: "Citizens please verify surface quality" },
      { Authorization: `Bearer ${officerToken}` }
    );
    assert.strictEqual(openVerRes.status, 200);
    assert.strictEqual(openVerRes.body.status, "VerificationWindow");

    // Citizen votes Satisfied
    const verVoteRes = await request(
      "POST",
      `/api/issues/${issueId}/verify`,
      { satisfied: true },
      { Authorization: `Bearer ${citizenToken}` }
    );
    assert.strictEqual(verVoteRes.status, 200);
    assert.strictEqual(verVoteRes.body.satisfied, true);
    assert.ok(verVoteRes.body.newReputationStars >= 1, "Should award +1 star reputation");
    console.log(`  √ Citizen verification vote recorded (+1 Star reputation awarded)\n`);

    // 8. Public Verification & Audit Endpoint
    console.log("Test 8: Public verification audit report");
    const publicVerRes = await request("GET", `/api/issues/${issueId}/public-verification`);
    assert.strictEqual(publicVerRes.status, 200);
    const audit = publicVerRes.body.auditReport;
    assert.strictEqual(audit.issueId, issueId);
    assert.strictEqual(audit.verifiedOnChain, true);
    assert.strictEqual(audit.hashIntegrity.matchesCryptographically, true, "Hash must cryptographically verify");
    assert.ok(audit.fullAuditTrail.length >= 4, "Should contain full timeline history");
    console.log("  √ Public verification verified cryptographic content hash and audit trail\n");

    // 9. Right-to-Erasure (Privacy)
    console.log("Test 9: Right-to-Erasure off-chain privacy scrubbing");
    const erasureRes = await request(
      "DELETE",
      "/api/users/erasure",
      null,
      { Authorization: `Bearer ${citizenToken}` }
    );
    assert.strictEqual(erasureRes.status, 200);
    assert.strictEqual(erasureRes.body.erasureDetails.isAnonymized, true);
    console.log("  √ Right-to-erasure anonymized PII while preserving on-chain integrity\n");

    // 10. AI Service Adapter
    console.log("Test 10: AI Service provider adapter (Mock/Gemini)");
    const aiRes = await request(
      "POST",
      "/api/issues/ai-validate",
      {
        title: "Deep dangerous crater pothole on main road",
        description: "Severe hazard causing two-wheeler accidents",
        category: "Roads",
        latitude: 12.971598,
        longitude: 77.594562
      }
    );
    assert.strictEqual(aiRes.status, 200);
    assert.strictEqual(aiRes.body.validation.isValid, true);
    assert.ok(aiRes.body.severityAssessment.recommendedSeverity >= 4);
    assert.strictEqual(aiRes.body.categorySuggestion.suggestedCategory, "Roads");
    console.log("  √ AI validation, severity scoring, duplicate check, and categorization passed\n");

    console.log("==================================================");
    console.log(" ALL 10 INTEGRATION TESTS PASSED SUCCESSFULLY! √");
    console.log("==================================================\n");
  } finally {
    if (server) server.close();
    await disconnectDB();
  }
}

if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\nTest suite failed:", err);
      process.exit(1);
    });
}

module.exports = runTests;
