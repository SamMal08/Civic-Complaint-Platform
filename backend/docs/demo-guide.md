# Darpan: Local Demo & Presentation Guide
*"Web3 for Transparent & Accountable Cities"*

---

## 1. Quick Start (One Command)

Everything in Darpan runs locally with **zero external software installations** required (local Hardhat chain ID 31337 and embedded in-memory MongoDB).

In the `backend/` directory, run:

```powershell
npm run start:all
```

This single command automatically:
1. Spawns the local Hardhat blockchain node (`http://127.0.0.1:8545`).
2. Deploys the [`DarpanCivic`](file:///c:/Users/SAKSHAM%20SAMAIRA/Desktop/darpan-civic-complaint/Civic-Complaint-Platform/contracts/contracts/DarpanCivic.sol) smart contract and exports the shared ABI & address.
3. Initializes the in-memory MongoDB instance.
4. Seeds sample civic complaints covering **every lifecycle status**.
5. Starts the Express backend API and blockchain real-time event indexer.

---

## 2. Interactive Interfaces & URLs

- **API Documentation & Swagger UI:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Health Check & Web3 Status:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Local Blockchain RPC:** `http://127.0.0.1:8545` (Chain ID: `31337`)

---

## 3. Demo Roles & Pre-Funded Wallets

| Role | Name | Wallet Address | Description |
| :--- | :--- | :--- | :--- |
| **Citizen** | Aarav Patel | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | Reports issues, upvotes/downvotes, earns star reputation |
| **Officer** | Rajesh Sharma | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Ward 10 municipal engineer assigned to civic complaints |
| **Ministry Admin** | Central Admin | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Contract deployer, sets governance thresholds |

---

## 4. Live Demo Walkthrough (Step-by-Step)

### Step 1: Show Seeded Complaints Across All Statuses
Open your browser or terminal:
```bash
curl http://localhost:5000/api/issues | jq .
```
**Talking Point:** Point out that Darpan tracks the complete lifecycle:
- Issue #1: `Reported` (Indiranagar Pothole)
- Issue #2: `WorkStarted` (MG Road High-Mast Streetlight)
- Issue #3: `InProgress` (Bandra Burst Water Pipeline with evidence photo)
- Issue #4: `Resolved` (Anna Salai Garbage Cleared with proof photo)
- Issue #5: `VerificationWindow` (Salt Lake Drain Reconstruction - active citizen voting)
- Issue #6: `Closed` (Koramangala Traffic Signal - verified 100% satisfied)

---

### Step 2: Citizen Reports a New Complaint
```bash
curl -X POST "http://localhost:5000/api/issues" \
  -H "X-Wallet-Address: 0x90F79bf6EB2c4f870365E785982E1f101E93b906" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Severe Waterlogging near Silk Board Junction",
    "description": "Flooding pedestrian walkway and service road, stranding commuters.",
    "category": "Water",
    "latitude": 12.9176,
    "longitude": 77.6238,
    "severity": 4,
    "ipfsCid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
  }' | jq .
```
**Talking Point:**
Notice how the backend generates a cryptographic `contentHash` (`keccak256`) of the complaint metadata and records the issue **on-chain in a single transaction**. The full text description and personal data stay off-chain for privacy, while the cryptographic hash guarantees tamper-proof integrity.

---

### Step 3: Nearby Feed & Dynamic Priority Scoring
```bash
curl "http://localhost:5000/api/issues/nearby?lat=12.9176&lon=77.6238&radiusKm=10" | jq .
```
**Talking Point:**
Darpan's nearby engine uses geohash spatial indexing and dynamic priority ranking:
$$\text{Priority Score} = (\text{severity} \times 25) + (\text{netUpvotes} \times 10) + (\text{reporterStars} \times 5) + \text{recencyScore}$$
High-severity emergencies reported by high-reputation citizens automatically float to the top of municipal feeds.

---

### Step 4: Community Voting (Upvote / Downvote)
```bash
curl -X POST "http://localhost:5000/api/issues/1/vote" \
  -H "X-Wallet-Address: 0x90F79bf6EB2c4f870365E785982E1f101E93b906" \
  -H "Content-Type: application/json" \
  -d '{"voteType": "upvote"}' | jq .
```
**Talking Point:**
Every citizen wallet gets exactly **one vote per issue**. Votes are changeable (switching from upvote to downvote seamlessly decrements upvotes and increments downvotes), but non-duplicable.

---

### Step 5: Officer Workflow & AccessControl
Show that unauthorized citizen wallets are rejected:
```bash
# This will return 403 Forbidden because caller is not an officer
curl -X POST "http://localhost:5000/api/officer/start-work" \
  -H "X-Wallet-Address: 0x90F79bf6EB2c4f870365E785982E1f101E93b906" \
  -H "X-Role: citizen" \
  -H "Content-Type: application/json" \
  -d '{"issueId": 1, "note": "Hacker trying to start work"}' | jq .
```

Now execute legitimate officer actions:
```bash
# 1. Start Work
curl -X POST "http://localhost:5000/api/officer/start-work" \
  -H "X-Wallet-Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8" \
  -H "X-Role: officer" \
  -H "Content-Type: application/json" \
  -d '{"issueId": 1, "note": "Inspection team arrived on site"}' | jq .

# 2. Add Progress Evidence
curl -X POST "http://localhost:5000/api/officer/evidence" \
  -H "X-Wallet-Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8" \
  -H "X-Role: officer" \
  -H "Content-Type: application/json" \
  -d '{"issueId": 1, "evidenceHash": "bafyevidence_bitumen_layer_photo", "note": "Bitumen laid"}' | jq .

# 3. Mark Resolved with Proof Photo
curl -X POST "http://localhost:5000/api/officer/resolve" \
  -H "X-Wallet-Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8" \
  -H "X-Role: officer" \
  -H "Content-Type: application/json" \
  -d '{"issueId": 1, "proofPhotoHash": "bafyresolved_surface_smooth_photo", "note": "Pothole filled and sealed"}' | jq .

# 4. Open Citizen Verification Window
curl -X POST "http://localhost:5000/api/issues/1/open-verification" \
  -H "X-Wallet-Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8" \
  -H "X-Role: officer" \
  -H "Content-Type: application/json" \
  -d '{"note": "Citizens please inspect the road resurfacing"}' | jq .
```

---

### Step 6: Citizen Verification & Star Reputation Reward
```bash
curl -X POST "http://localhost:5000/api/issues/1/verify" \
  -H "X-Wallet-Address: 0x90F79bf6EB2c4f870365E785982E1f101E93b906" \
  -H "Content-Type: application/json" \
  -d '{"satisfied": true}' | jq .
```
**Talking Point:**
Highlight that when citizens vote in the verification window, they are awarded **+1 Star Reputation Point** on-chain! This incentivizes citizen participation and builds verifiable civic trust.

---

### Step 7: Public Blockchain Audit Trail
```bash
curl "http://localhost:5000/api/issues/1/public-verification" | jq .
```
**Talking Point:**
Show the public audit report:
- `matchesCryptographically: true`: verifies that the off-chain complaint content matches the immutable on-chain hash.
- Complete timeline history with all timestamps, actor wallets, status transitions, and transaction hashes.
- Explorer links for every transaction.

---

### Step 8: Privacy & Right-to-Erasure (GDPR Compliance)
```bash
curl -X DELETE "http://localhost:5000/api/users/erasure" \
  -H "X-Wallet-Address: 0x90F79bf6EB2c4f870365E785982E1f101E93b906" | jq .
```
**Talking Point:**
Explain how Darpan solves the classic blockchain privacy dilemma:
- Personally identifiable data (name, email, phone) is permanently erased from off-chain storage.
- The blockchain state machine remains 100% valid because it only ever stored pseudonymous wallet addresses and content hashes!

---

## 5. Automated Test Suite Execution

To demonstrate that all automated integration tests pass in your demo:

```powershell
# Run contracts test suite (14 passing tests)
cd contracts
npm test

# Run backend Web3 API integration suite (8 passing tests)
cd ../backend
npm test
```
