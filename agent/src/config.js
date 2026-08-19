export const TASK_ATTEST_ABI = [
  "function nextTaskId() view returns (uint256)",
  "function tasks(uint256) view returns (address poster, address worker, uint256 reward, string specURI, string deliverableURI, uint8 qualityScore, string reasoningURI, uint8 status, uint256 deliveredAt)",
  "function attest(uint256 taskId, uint8 qualityScore, string reasoningURI) external",
  "event DeliverableSubmitted(uint256 indexed taskId, address indexed worker, string deliverableURI)",
  "event Attested(uint256 indexed taskId, uint8 qualityScore, string reasoningURI, bool autoReleased)",
];

// Must match the Status enum order in TaskAttest.sol exactly.
export const STATUS = {
  Open: 0,
  Delivered: 1,
  Released: 2,
  Flagged: 3,
  Reclaimed: 4,
};
