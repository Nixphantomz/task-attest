// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TaskAttest — AI-judged work escrow
/// @notice A poster deposits USDT for a task and describes the spec. A worker
/// submits a deliverable. An AI oracle reviews the deliverable against the
/// spec and publishes a quality score on-chain:
///   - score >= approvalThreshold  -> funds auto-release to the worker
///   - score <  approvalThreshold  -> task is flagged; the poster decides
///     (approve anyway, or reclaim funds after a review window)
///
/// This is intentionally simple: no price oracles, no share accounting, no
/// basket math. Every function maps to a plain-English real-world action,
/// which is the point — it's meant to be genuinely learnable, not just
/// functional.
contract TaskAttest is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant AI_ORACLE_ROLE = keccak256("AI_ORACLE_ROLE");

    enum Status {
        Open,       // created, awaiting a deliverable
        Delivered,  // deliverable submitted, awaiting AI attestation
        Released,   // funds paid to worker (auto or poster-approved)
        Flagged,    // AI score was below threshold, awaiting poster decision
        Reclaimed   // poster reclaimed funds after review window
    }

    struct Task {
        address poster;
        address worker;
        uint256 reward;
        string specURI;         // where the task spec/brief lives (IPFS/HTTP)
        string deliverableURI;  // where the submitted work lives
        uint8 qualityScore;     // 0-100, set by the AI oracle
        string reasoningURI;    // AI's logged reasoning for the score
        Status status;
        uint256 deliveredAt;
    }

    IERC20 public immutable usdt;

    /// @notice AI score at/above this auto-releases funds. 0-100 scale.
    uint8 public approvalThreshold = 70;

    /// @notice How long a poster has to reclaim funds on a flagged task
    /// before... nothing forces resolution — this just prevents a poster
    /// from reclaiming instantly out of impatience before the worker/AI
    /// process has had a fair window.
    uint256 public reviewWindow = 2 days;

    uint256 public nextTaskId;
    mapping(uint256 => Task) public tasks;

    event TaskCreated(uint256 indexed taskId, address indexed poster, uint256 reward, string specURI);
    event DeliverableSubmitted(uint256 indexed taskId, address indexed worker, string deliverableURI);
    event Attested(uint256 indexed taskId, uint8 qualityScore, string reasoningURI, bool autoReleased);
    event Released(uint256 indexed taskId, address indexed worker, uint256 amount);
    event Reclaimed(uint256 indexed taskId, address indexed poster, uint256 amount);
    event ApprovalThresholdUpdated(uint8 newThreshold);

    constructor(address _usdt, address admin) {
        usdt = IERC20(_usdt);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function createTask(string calldata specURI, uint256 reward) external nonReentrant returns (uint256 taskId) {
        require(reward > 0, "zero reward");
        usdt.safeTransferFrom(msg.sender, address(this), reward);

        taskId = nextTaskId++;
        Task storage t = tasks[taskId];
        t.poster = msg.sender;
        t.reward = reward;
        t.specURI = specURI;
        t.status = Status.Open;

        emit TaskCreated(taskId, msg.sender, reward, specURI);
    }

    function submitDeliverable(uint256 taskId, string calldata deliverableURI) external {
        Task storage t = tasks[taskId];
        require(t.poster != address(0), "task does not exist");
        require(t.status == Status.Open, "not open");

        t.worker = msg.sender;
        t.deliverableURI = deliverableURI;
        t.deliveredAt = block.timestamp;
        t.status = Status.Delivered;

        emit DeliverableSubmitted(taskId, msg.sender, deliverableURI);
    }

    /// @notice Called by the off-chain AI agent after it reviews the
    /// deliverable against the spec.
    function attest(uint256 taskId, uint8 qualityScore, string calldata reasoningURI) external onlyRole(AI_ORACLE_ROLE) nonReentrant {
        Task storage t = tasks[taskId];
        require(t.status == Status.Delivered, "not awaiting attestation");
        require(qualityScore <= 100, "score out of range");

        t.qualityScore = qualityScore;
        t.reasoningURI = reasoningURI;

        bool autoReleased = qualityScore >= approvalThreshold;
        if (autoReleased) {
            t.status = Status.Released;
            usdt.safeTransfer(t.worker, t.reward);
            emit Released(taskId, t.worker, t.reward);
        } else {
            t.status = Status.Flagged;
        }

        emit Attested(taskId, qualityScore, reasoningURI, autoReleased);
    }

    /// @notice Poster can release a flagged task manually if they disagree
    /// with the AI's caution — the AI recommends, it doesn't have final say.
    function posterApprove(uint256 taskId) external nonReentrant {
        Task storage t = tasks[taskId];
        require(msg.sender == t.poster, "not poster");
        require(t.status == Status.Flagged, "not flagged");

        t.status = Status.Released;
        usdt.safeTransfer(t.worker, t.reward);
        emit Released(taskId, t.worker, t.reward);
    }

    /// @notice Poster can reclaim funds on a flagged task once the review
    /// window has passed, if they conclude the work isn't acceptable.
    function posterReclaim(uint256 taskId) external nonReentrant {
        Task storage t = tasks[taskId];
        require(msg.sender == t.poster, "not poster");
        require(t.status == Status.Flagged, "not flagged");
        require(block.timestamp >= t.deliveredAt + reviewWindow, "review window not elapsed");

        t.status = Status.Reclaimed;
        usdt.safeTransfer(t.poster, t.reward);
        emit Reclaimed(taskId, t.poster, t.reward);
    }

    function setApprovalThreshold(uint8 newThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newThreshold <= 100, "out of range");
        approvalThreshold = newThreshold;
        emit ApprovalThresholdUpdated(newThreshold);
    }

    function setReviewWindow(uint256 newWindow) external onlyRole(DEFAULT_ADMIN_ROLE) {
        reviewWindow = newWindow;
    }
}
