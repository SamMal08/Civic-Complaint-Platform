#!/usr/bin/env bash
# ========================================================
# Darpan Civic Complaint Platform - cURL Test Suite
# Tests all authentication, civic reporting, officer workflow,
# citizen verification, and public audit endpoints.
# ========================================================

BASE_URL="http://localhost:5000"

echo "=========================================================="
echo " 1. SYSTEM HEALTH CHECK & WEB3 STATUS"
echo "=========================================================="
curl -s -X GET "${BASE_URL}/api/health" | jq .
echo -e "\n"

echo "=========================================================="
echo " 2. AUTHENTICATION & DEMO WALLET LOGINS"
echo "=========================================================="
echo "Logging in as Citizen (Aarav Patel)..."
CITIZEN_LOGIN=$(curl -s -X GET "${BASE_URL}/api/auth/demo/citizen")
CITIZEN_TOKEN=$(echo $CITIZEN_LOGIN | jq -r .token)
echo "Citizen Token received."

echo "Logging in as Government Officer (Rajesh Sharma)..."
OFFICER_LOGIN=$(curl -s -X GET "${BASE_URL}/api/auth/demo/officer")
OFFICER_TOKEN=$(echo $OFFICER_LOGIN | jq -r .token)
echo "Officer Token received."

echo "Logging in as Ministry Admin..."
MINISTRY_LOGIN=$(curl -s -X GET "${BASE_URL}/api/auth/demo/ministry")
MINISTRY_TOKEN=$(echo $MINISTRY_LOGIN | jq -r .token)
echo "Ministry Token received."
echo -e "\n"

echo "=========================================================="
echo " 3. CITIZEN REPORTS A NEW CIVIC COMPLAINT"
echo "=========================================================="
CREATE_ISSUE_RES=$(curl -s -X POST "${BASE_URL}/api/issues" \
  -H "Authorization: Bearer ${CITIZEN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Severe Waterlogging near Silk Board Junction",
    "description": "Rainwater overflow flooding pedestrian walkway and service road, stranding commuters.",
    "category": "Water",
    "latitude": 12.9176,
    "longitude": 77.6238,
    "severity": 4,
    "ipfsCid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
  }')

echo $CREATE_ISSUE_RES | jq .
ISSUE_ID=$(echo $CREATE_ISSUE_RES | jq -r .issue.issueId)
echo "Reported Issue ID: ${ISSUE_ID}"
echo -e "\n"

echo "=========================================================="
echo " 4. NEARBY CIVIC FEED (RANKED BY GEOHASH & PRIORITY SCORE)"
echo "=========================================================="
curl -s -X GET "${BASE_URL}/api/issues/nearby?lat=12.9176&lon=77.6238&radiusKm=10" | jq .
echo -e "\n"

echo "=========================================================="
echo " 5. CITIZEN COMMUNITY UPVOTES"
echo "=========================================================="
curl -s -X POST "${BASE_URL}/api/issues/${ISSUE_ID}/vote" \
  -H "Authorization: Bearer ${CITIZEN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"voteType": "upvote"}' | jq .
echo -e "\n"

echo "=========================================================="
echo " 6. OFFICER LIFECYCLE: ASSIGN -> START WORK -> IN PROGRESS"
echo "=========================================================="
echo "Assigning Officer..."
curl -s -X POST "${BASE_URL}/api/officer/assign" \
  -H "Authorization: Bearer ${OFFICER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"issueId\": ${ISSUE_ID},
    \"officerAddress\": \"0x70997970C51812dc3A010C7d01b50e0d17dc79C8\",
    \"note\": \"Assigned to South Zone rapid response drainage team\"
  }" | jq .

echo "Starting Work..."
curl -s -X POST "${BASE_URL}/api/officer/start-work" \
  -H "Authorization: Bearer ${OFFICER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"issueId\": ${ISSUE_ID},
    \"note\": \"High-capacity dewatering suction pump deployed\"
  }" | jq .

echo "Updating to In Progress..."
curl -s -X PATCH "${BASE_URL}/api/officer/status" \
  -H "Authorization: Bearer ${OFFICER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"issueId\": ${ISSUE_ID},
    \"status\": \"InProgress\",
    \"note\": \"Clearing clogged culverts along service lane\"
  }" | jq .

echo "Adding On-Chain Evidence..."
curl -s -X POST "${BASE_URL}/api/officer/evidence" \
  -H "Authorization: Bearer ${OFFICER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"issueId\": ${ISSUE_ID},
    \"evidenceHash\": \"bafyevidence_drain_clearing_progress_photo\",
    \"note\": \"Debris extracted from main culvert pipe\"
  }" | jq .
echo -e "\n"

echo "=========================================================="
echo " 7. OFFICER RESOLUTION & OPEN VERIFICATION WINDOW"
echo "=========================================================="
echo "Officer marks Resolved..."
curl -s -X POST "${BASE_URL}/api/officer/resolve" \
  -H "Authorization: Bearer ${OFFICER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"issueId\": ${ISSUE_ID},
    \"proofPhotoHash\": \"bafyresolved_water_cleared_photo_hash\",
    \"note\": \"Road fully drained, catchpits desilted, traffic moving freely\"
  }" | jq .

echo "Opening Verification Window..."
curl -s -X POST "${BASE_URL}/api/issues/${ISSUE_ID}/open-verification" \
  -H "Authorization: Bearer ${OFFICER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"note\": \"Commuters and residents please verify water has completely drained\"}" | jq .
echo -e "\n"

echo "=========================================================="
echo " 8. CITIZEN VERIFICATION VOTE (+1 STAR REPUTATION)"
echo "=========================================================="
curl -s -X POST "${BASE_URL}/api/issues/${ISSUE_ID}/verify" \
  -H "Authorization: Bearer ${CITIZEN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"satisfied": true}' | jq .
echo -e "\n"

echo "=========================================================="
echo " 9. PUBLIC VERIFICATION & AUDIT ENDPOINT (EXPLORER LINKS)"
echo "=========================================================="
curl -s -X GET "${BASE_URL}/api/issues/${ISSUE_ID}/public-verification" | jq .
echo -e "\n"

echo "=========================================================="
echo " 10. RIGHT-TO-ERASURE (PRIVACY COMPLIANCE)"
echo "=========================================================="
curl -s -X DELETE "${BASE_URL}/api/users/erasure" \
  -H "Authorization: Bearer ${CITIZEN_TOKEN}" | jq .
echo -e "\n"

echo "=========================================================="
echo " ALL TESTS COMPLETED SUCCESSFULLY"
echo "=========================================================="
