import "dotenv/config";
import { ethers } from "ethers";
import { loadTaskAttestArtifact } from "./artifact.js";

/**
 * Prints a task's full on-chain state. Useful for a quick sanity check
 * after any step, instead of navigating the block explorer's UI each time.
 *
 * Usage:
 *   node checkTask.js <taskId>
 */

const STATUS_NAMES = ["Open", "Delivered", "Released", "Flagged", "Reclaimed"];

function requireEnv(name) {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var: ${name}. Fill it in your .env.`);
  }
  return v.trim();
}

async function main() {
  const taskId = process.argv[2];
  if (taskId === undefined || Number.isNaN(Number(taskId))) {
    throw new Error("Usage: node checkTask.js <taskId>");
  }

  const rpcUrl = requireEnv("XLAYER_TESTNET_RPC");
  const contractAddress = requireEnv("CONTRACT_ADDRESS");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const { abi } = loadTaskAttestArtifact();
  const contract = new ethers.Contract(contractAddress, abi, provider);

  const t = await contract.tasks(BigInt(taskId));

  console.log(`\nTask ${taskId}`);
  console.log("  poster:         ", t.poster);
  console.log("  worker:         ", t.worker);
  console.log("  reward:         ", ethers.formatUnits(t.reward, 6), "USDC");
  console.log("  status:         ", STATUS_NAMES[Number(t.status)] ?? t.status);
  console.log("  qualityScore:   ", t.qualityScore.toString());
  console.log("  specURI:        ", t.specURI);
  console.log("  deliverableURI: ", t.deliverableURI);
  console.log("  reasoningURI:   ", t.reasoningURI);
  console.log("  deliveredAt:    ", t.deliveredAt > 0n ? new Date(Number(t.deliveredAt) * 1000).toISOString() : "-");
}

main().catch((err) => {
  console.error("\n[check] FAILED:", err.message);
  process.exit(1);
});