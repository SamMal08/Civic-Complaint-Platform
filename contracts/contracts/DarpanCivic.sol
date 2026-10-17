// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DarpanCivic
 * @dev Web3 & Blockchain Civic Complaint Platform smart contract.
 * Manages full lifecycle of civic issues with transparent on-chain history,
 * access-controlled officer actions, citizen verification voting, and star reputation.
 */
contract DarpanCivic is AccessControl, ReentrancyGuard {
    bytes32 public constant OFFICER_ROLE = keccak256("OFFICER_ROLE");
    bytes32 public constant MINISTRY_ROLE = keccak256("MINISTRY_ROLE");

    enum Status {
        Reported,
        WorkStarted,
        InProgress,
        Resolved,
        VerificationWindow,
        Closed
    }

    enum VoteType {
        None,
        Upvote,
        Downvote
    }

    struct Issue {
        uint256 id;
        address reporter;
        bytes32 contentHash;
        string ipfsCid;
        string category;
        int64 latitude;       // Scaled by 1e6 (e.g. 28613900 for 28.613900)
        int64 longitude;      // Scaled by 1e6 (e.g. 77209000 for 77.209000)
        string geohash;
        uint8 severity;       // 1 to 5
        uint256 timestamp;
        Status status;
        address assignedOfficer;
        string proofPhotoHash;
        uint256 upvotes;
        uint256 downvotes;
        uint256 satisfiedVotes;
        uint256 unsatisfiedVotes;
        uint256 verificationDeadline;
    }

    struct TimelineEntry {
        Status status;
        address actor;
        uint256 timestamp;
        string note;
    }

    uint256 private _issueIdCounter;
    mapping(uint256 => Issue) public issues;
    mapping(uint256 => TimelineEntry[]) private _issueTimelines;

    // Issue ID => Voter Address => VoteType
    mapping(uint256 => mapping(address => VoteType)) public issueVotes;

    // Issue ID => Voter Address => hasVerified
    mapping(uint256 => mapping(address => bool)) public hasVerified;

    // Citizen wallet => Star reputation points
    mapping(address => uint256) public citizenReputation;

    // Rate limiting: wallet => timestamp of last reported issue
    mapping(address => uint256) public lastReportTime;

    // Configurable parameters
    uint256 public minReportCooldown = 30 seconds;
    uint256 public verificationDuration = 3 days;
    uint256 public minVerificationVotes = 1;
    uint256 public satisfiedThresholdPercent = 60;
    uint256 public unsatisfiedThresholdPercent = 60;

    // Events
    event IssueReported(
        uint256 indexed id,
        address indexed reporter,
        bytes32 contentHash,
        string ipfsCid,
        string category,
        int64 latitude,
        int64 longitude,
        string geohash,
        uint8 severity,
        uint256 timestamp
    );

    event IssueStatusUpdated(
        uint256 indexed id,
        Status previousStatus,
        Status newStatus,
        address indexed actor,
        string note,
        uint256 timestamp
    );

    event IssueVoted(
        uint256 indexed id,
        address indexed voter,
        VoteType previousVote,
        VoteType newVote,
        uint256 upvotes,
        uint256 downvotes
    );

    event VerificationVoteCast(
        uint256 indexed id,
        address indexed citizen,
        bool satisfied,
        uint256 satisfiedVotes,
        uint256 unsatisfiedVotes
    );

    event VerificationFinalized(
        uint256 indexed id,
        Status finalStatus,
        uint256 satisfiedVotes,
        uint256 unsatisfiedVotes,
        string note
    );

    event EvidenceAdded(
        uint256 indexed id,
        address indexed officer,
        string evidenceHash,
        string note,
        uint256 timestamp
    );

    event OfficerAssigned(
        uint256 indexed id,
        address indexed officer,
        address indexed assignedBy,
        uint256 timestamp
    );

    event ReputationUpdated(
        address indexed citizen,
        uint256 newReputation
    );

    event ConfigUpdated(string parameter, uint256 newValue);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINISTRY_ROLE, msg.sender);
        _grantRole(OFFICER_ROLE, msg.sender);
    }

    // --- ISSUE CREATION & CITIZEN REPORTING ---

    /**
     * @notice Report a new civic issue
     */
    function reportIssue(
        bytes32 contentHash,
        string calldata ipfsCid,
        string calldata category,
        int64 latitude,
        int64 longitude,
        string calldata geohash,
        uint8 severity
    ) external nonReentrant returns (uint256) {
        require(
            block.timestamp >= lastReportTime[msg.sender] + minReportCooldown,
            "Rate limit: please wait before reporting another issue"
        );
        require(bytes(category).length > 0, "Category cannot be empty");
        require(severity >= 1 && severity <= 5, "Severity must be between 1 and 5");
        require(bytes(geohash).length > 0, "Geohash cannot be empty");

        lastReportTime[msg.sender] = block.timestamp;
        _issueIdCounter++;
        uint256 newId = _issueIdCounter;

        Issue storage newIssue = issues[newId];
        newIssue.id = newId;
        newIssue.reporter = msg.sender;
        newIssue.contentHash = contentHash;
        newIssue.ipfsCid = ipfsCid;
        newIssue.category = category;
        newIssue.latitude = latitude;
        newIssue.longitude = longitude;
        newIssue.geohash = geohash;
        newIssue.severity = severity;
        newIssue.timestamp = block.timestamp;
        newIssue.status = Status.Reported;

        _addTimeline(newId, Status.Reported, msg.sender, "Civic complaint reported");

        emit IssueReported(
            newId,
            msg.sender,
            contentHash,
            ipfsCid,
            category,
            latitude,
            longitude,
            geohash,
            severity,
            block.timestamp
        );

        emit IssueStatusUpdated(
            newId,
            Status.Reported,
            Status.Reported,
            msg.sender,
            "Civic complaint reported",
            block.timestamp
        );

        return newId;
    }

    // --- COMMUNITY VOTING (UPVOTE / DOWNVOTE) ---

    /**
     * @notice Upvote or downvote an issue.
     * One vote per wallet per issue; changeable, not duplicable.
     */
    function vote(uint256 id, VoteType voteType) external nonReentrant {
        require(id > 0 && id <= _issueIdCounter, "Issue does not exist");
        require(voteType == VoteType.Upvote || voteType == VoteType.Downvote, "Invalid vote type");

        Issue storage issue = issues[id];
        VoteType currentVote = issueVotes[id][msg.sender];
        require(currentVote != voteType, "Already cast this vote");

        if (currentVote == VoteType.Upvote) {
            issue.upvotes--;
        } else if (currentVote == VoteType.Downvote) {
            issue.downvotes--;
        }

        if (voteType == VoteType.Upvote) {
            issue.upvotes++;
        } else if (voteType == VoteType.Downvote) {
            issue.downvotes++;
        }

        issueVotes[id][msg.sender] = voteType;

        emit IssueVoted(id, msg.sender, currentVote, voteType, issue.upvotes, issue.downvotes);
    }

    // --- OFFICER ACTIONS & LIFECYCLE ---

    /**
     * @notice Assign an officer to an issue. Only callable by officers or admin.
     */
    function assignOfficer(
        uint256 id,
        address officer,
        string calldata note
    ) external onlyRole(OFFICER_ROLE) {
        require(id > 0 && id <= _issueIdCounter, "Issue does not exist");
        require(officer != address(0), "Invalid officer address");

        issues[id].assignedOfficer = officer;
        _addTimeline(id, issues[id].status, msg.sender, note);

        emit OfficerAssigned(id, officer, msg.sender, block.timestamp);
    }

    /**
     * @notice Officer marks work started on an issue.
     */
    function startWork(uint256 id, string calldata note) external onlyRole(OFFICER_ROLE) {
        require(id > 0 && id <= _issueIdCounter, "Issue does not exist");
        Issue storage issue = issues[id];
        require(issue.status == Status.Reported, "Can only start work on Reported issue");

        Status prevStatus = issue.status;
        issue.status = Status.WorkStarted;
        _addTimeline(id, Status.WorkStarted, msg.sender, note);

        emit IssueStatusUpdated(id, prevStatus, Status.WorkStarted, msg.sender, note, block.timestamp);
    }

    /**
     * @notice Officer updates issue status (e.g. to InProgress).
     */
    function updateStatus(
        uint256 id,
        Status newStatus,
        string calldata note
    ) external onlyRole(OFFICER_ROLE) {
        require(id > 0 && id <= _issueIdCounter, "Issue does not exist");
        Issue storage issue = issues[id];
        require(
            newStatus == Status.InProgress || newStatus == Status.WorkStarted,
            "Invalid status update target"
        );

        Status prevStatus = issue.status;
        issue.status = newStatus;
        _addTimeline(id, newStatus, msg.sender, note);

        emit IssueStatusUpdated(id, prevStatus, newStatus, msg.sender, note, block.timestamp);
    }

    /**
     * @notice Officer adds transparent work evidence or progress note.
     */
    function addEvidence(
        uint256 id,
        string calldata evidenceHash,
        string calldata note
    ) external onlyRole(OFFICER_ROLE) {
        require(id > 0 && id <= _issueIdCounter, "Issue does not exist");
        require(bytes(evidenceHash).length > 0, "Evidence hash cannot be empty");

        string memory combinedNote = string.concat("Evidence: ", evidenceHash, " | ", note);
        _addTimeline(id, issues[id].status, msg.sender, combinedNote);

        emit EvidenceAdded(id, msg.sender, evidenceHash, note, block.timestamp);
    }

    /**
     * @notice Officer marks issue resolved with proof photo hash.
     */
    function markResolved(
        uint256 id,
        string calldata proofPhotoHash,
        string calldata note
    ) external onlyRole(OFFICER_ROLE) {
        require(id > 0 && id <= _issueIdCounter, "Issue does not exist");
        Issue storage issue = issues[id];
        require(
            issue.status == Status.WorkStarted || issue.status == Status.InProgress,
            "Issue must be WorkStarted or InProgress to resolve"
        );

        Status prevStatus = issue.status;
        issue.status = Status.Resolved;
        issue.proofPhotoHash = proofPhotoHash;
        _addTimeline(id, Status.Resolved, msg.sender, note);

        emit IssueStatusUpdated(id, prevStatus, Status.Resolved, msg.sender, note, block.timestamp);
    }

    /**
     * @notice Opens citizen verification window for resolved issue.
     */
    function openVerification(uint256 id, string calldata note) external onlyRole(OFFICER_ROLE) {
        require(id > 0 && id <= _issueIdCounter, "Issue does not exist");
        Issue storage issue = issues[id];
        require(issue.status == Status.Resolved, "Issue must be Resolved to open verification");

        Status prevStatus = issue.status;
        issue.status = Status.VerificationWindow;
        issue.verificationDeadline = block.timestamp + verificationDuration;
        _addTimeline(id, Status.VerificationWindow, msg.sender, note);

        emit IssueStatusUpdated(id, prevStatus, Status.VerificationWindow, msg.sender, note, block.timestamp);
    }

    /**
     * @notice Convenience function to mark resolved and open verification window in one transaction.
     */
    function markResolvedAndOpenVerification(
        uint256 id,
        string calldata proofPhotoHash,
        string calldata note
    ) external onlyRole(OFFICER_ROLE) {
        require(id > 0 && id <= _issueIdCounter, "Issue does not exist");
        Issue storage issue = issues[id];
        require(
            issue.status == Status.WorkStarted || issue.status == Status.InProgress,
            "Issue must be WorkStarted or InProgress to resolve"
        );

        issue.proofPhotoHash = proofPhotoHash;
        issue.status = Status.VerificationWindow;
        issue.verificationDeadline = block.timestamp + verificationDuration;

        _addTimeline(id, Status.Resolved, msg.sender, "Issue marked resolved by officer");
        _addTimeline(id, Status.VerificationWindow, msg.sender, note);

        emit IssueStatusUpdated(id, Status.InProgress, Status.VerificationWindow, msg.sender, note, block.timestamp);
    }

    // --- CITIZEN VERIFICATION VOTING & REPUTATION ---

    /**
     * @notice Citizen votes Satisfied or Unsatisfied during verification window.
     * One vote per wallet; awards star reputation points to participating citizens.
     */
    function voteVerification(uint256 id, bool satisfied) external nonReentrant {
        require(id > 0 && id <= _issueIdCounter, "Issue does not exist");
        Issue storage issue = issues[id];

        require(issue.status == Status.VerificationWindow, "Not in verification window");
        require(block.timestamp <= issue.verificationDeadline, "Verification window has ended");
        require(!hasVerified[id][msg.sender], "Wallet already voted in verification window");

        hasVerified[id][msg.sender] = true;

        if (satisfied) {
            issue.satisfiedVotes++;
        } else {
            issue.unsatisfiedVotes++;
        }

        // Post-resolution star reputation increment
        citizenReputation[msg.sender] += 1;
        emit ReputationUpdated(msg.sender, citizenReputation[msg.sender]);

        emit VerificationVoteCast(id, msg.sender, satisfied, issue.satisfiedVotes, issue.unsatisfiedVotes);
    }

    /**
     * @notice Publicly finalize verification once deadline has passed.
     * Anyone can call this.
     * - 0 votes: auto-closed.
     * - 60% or more Unsatisfied: Re-queued to In Progress.
     * - 60% or more Satisfied: Closed.
     */
    function finalizeVerification(uint256 id) external nonReentrant {
        require(id > 0 && id <= _issueIdCounter, "Issue does not exist");
        Issue storage issue = issues[id];

        require(issue.status == Status.VerificationWindow, "Not in verification window");
        require(block.timestamp >= issue.verificationDeadline, "Verification window is still active");

        uint256 totalVotes = issue.satisfiedVotes + issue.unsatisfiedVotes;
        Status nextStatus;
        string memory note;

        if (totalVotes == 0) {
            // No feedback = auto-closed
            nextStatus = Status.Closed;
            note = "Auto-closed: No citizen verification feedback received during window";
        } else {
            uint256 unsatisfiedPercent = (issue.unsatisfiedVotes * 100) / totalVotes;

            if (totalVotes >= minVerificationVotes && unsatisfiedPercent >= unsatisfiedThresholdPercent) {
                // 60% or more Unsatisfied = Re-queued to In Progress
                nextStatus = Status.InProgress;
                note = "Re-queued to In Progress: Unsatisfied threshold reached";
            } else {
                // 60% or more Satisfied (or below unsatisfied threshold) = Closed
                nextStatus = Status.Closed;
                note = "Closed: Citizen verification passed";
            }
        }

        Status prevStatus = issue.status;
        issue.status = nextStatus;
        _addTimeline(id, nextStatus, msg.sender, note);

        emit VerificationFinalized(id, nextStatus, issue.satisfiedVotes, issue.unsatisfiedVotes, note);
        emit IssueStatusUpdated(id, prevStatus, nextStatus, msg.sender, note, block.timestamp);
    }

    // --- TIMELINE & HELPERS ---

    function _addTimeline(
        uint256 id,
        Status status,
        address actor,
        string memory note
    ) internal {
        _issueTimelines[id].push(
            TimelineEntry({
                status: status,
                actor: actor,
                timestamp: block.timestamp,
                note: note
            })
        );
    }

    // --- VIEW FUNCTIONS ---

    function getIssue(uint256 id) external view returns (Issue memory) {
        require(id > 0 && id <= _issueIdCounter, "Issue does not exist");
        return issues[id];
    }

    function getTimeline(uint256 id) external view returns (TimelineEntry[] memory) {
        require(id > 0 && id <= _issueIdCounter, "Issue does not exist");
        return _issueTimelines[id];
    }

    function getReputation(address citizen) external view returns (uint256) {
        return citizenReputation[citizen];
    }

    function getTotalIssues() external view returns (uint256) {
        return _issueIdCounter;
    }

    // --- ADMIN CONFIGURATION ---

    function setMinReportCooldown(uint256 newCooldown) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minReportCooldown = newCooldown;
        emit ConfigUpdated("minReportCooldown", newCooldown);
    }

    function setVerificationDuration(uint256 newDuration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        verificationDuration = newDuration;
        emit ConfigUpdated("verificationDuration", newDuration);
    }

    function setMinVerificationVotes(uint256 newMinVotes) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minVerificationVotes = newMinVotes;
        emit ConfigUpdated("minVerificationVotes", newMinVotes);
    }

    function setThresholds(
        uint256 satisfiedPercent,
        uint256 unsatisfiedPercent
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(satisfiedPercent <= 100 && unsatisfiedPercent <= 100, "Invalid percentage");
        satisfiedThresholdPercent = satisfiedPercent;
        unsatisfiedThresholdPercent = unsatisfiedPercent;
        emit ConfigUpdated("satisfiedThresholdPercent", satisfiedPercent);
        emit ConfigUpdated("unsatisfiedThresholdPercent", unsatisfiedPercent);
    }
}
