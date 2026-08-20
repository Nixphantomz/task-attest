import { parseAbi } from "viem";

// TaskAttest ABI (human-readable form, kept in sync with contracts/TaskAttest.sol
// and agent/src/config.js). If you change the contract, update all three.
// parseAbi() gives wagmi/viem full type inference from these strings.
export const TASK_ATTEST_ABI = parseAbi([
  "function nextTaskId() view returns (uint256)",
  "function approvalThreshold() view returns (uint8)",
  "function reviewWindow() view returns (uint256)",
  "function tasks(uint256) view returns (address poster, address worker, uint256 reward, string specURI, string deliverableURI, uint8 qualityScore, string reasoningURI, uint8 status, uint256 deliveredAt)",
  "function createTask(string specURI, uint256 reward) returns (uint256 taskId)",
  "function submitDeliverable(uint256 taskId, string deliverableURI)",
  "function posterApprove(uint256 taskId)",
  "function posterReclaim(uint256 taskId)",
  "event TaskCreated(uint256 indexed taskId, address indexed poster, uint256 reward, string specURI)",
  "event DeliverableSubmitted(uint256 indexed taskId, address indexed worker, string deliverableURI)",
  "event Attested(uint256 indexed taskId, uint8 qualityScore, string reasoningURI, bool autoReleased)",
  "event Released(uint256 indexed taskId, address indexed worker, uint256 amount)",
  "event Reclaimed(uint256 indexed taskId, address indexed poster, uint256 amount)",
]);

export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

// Status enum — MUST match the order in TaskAttest.sol.
export const STATUS = ["Open", "Delivered", "Released", "Flagged", "Reclaimed"] as const;
export type StatusName = (typeof STATUS)[number];

export function statusName(status: number): StatusName {
  return STATUS[status] ?? ("Unknown" as StatusName);
}

// Deployed contract address — set NEXT_PUBLIC_CONTRACT_ADDRESS in the env
// after running deploy/deploy.js.
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "") as `0x${string}` | "";
