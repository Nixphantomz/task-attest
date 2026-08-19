import "dotenv/config";
import { ethers } from "ethers";
import { loadTaskAttestArtifact } from "./artifact.js";

/**
 * Submits a deliverable for an existing task - moves it from Open to
 * Delivered, which is what makes the AI agent pick it up and score it.
 *
 * For a hackathon demo it's completely fine to use the SAME wallet as both
 * poster (createTask.js) and worker (this script) - the contract doesn't
 * prevent it. Just don't reuse the AI oracle's wallet for this one - that
 * wallet should stay dedicated to calling attest().
 *
 * Usage:
 *   node submitDeliverable.js <taskId> <deliverableURI>
 * Example:
 *   node submitDeliverable.js 0 https://gist.githubusercontent.com/you/abc/raw/work.txt
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
  const deliverableURI = process.argv[3];
  if (taskId === undefined || !deliverableURI) {
    throw new Error("Usage: node submitDeliverable.js <taskId> <deliverableURI>");
  }
  if (Number.isNaN(Number(taskId))) {
    throw new Error(`Not a valid task id: ${taskId}`);
  }

  const rpcUrl = requireEnv("XLAYER_TESTNET_RPC");
  const privateKey = requireEnv("DEPLOYER_PRIVATE_KEY");
  const contractAddress = requireEnv("CONTRACT_ADDRESS");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const { abi } = loadTaskAttestArtifact();
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  // Sanity-check the task actually exists and is still Open before submitting,
  // so a typo'd taskId or a double-submit fails with a clear message instead
  // of a cryptic revert.
  const task = await contract.tasks(BigInt(taskId));
  const currentStatus = STATUS_NAMES[Number(task.status)] ?? String(task.status);
  console.log(`[deliver] task ${taskId} current status: ${currentStatus}`);
  if (Number(task.status) !== 0) {
    throw new Error(`Task ${taskId} is not Open (it's ${currentStatus}) - can't submit a deliverable for it.`);
  }

  console.log(`[deliver] worker (this wallet): ${wallet.address}`);
  console.log(`[deliver] deliverableURI: ${deliverableURI}`);

  let tx;
  try {
    tx = await contract.submitDeliverable(BigInt(taskId), deliverableURI);
  } catch (err) {
    throw new Error(`submitDeliverable was rejected: ${err.shortMessage ?? err.message}`);
  }

  console.log("[deliver] tx sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("[deliver] confirmed in block", receipt.blockNumber);
  console.log(`\nTask ${taskId} is now Delivered.`);
  console.log(`Next: cd ../agent && npm run once  -  to have the AI agent score it.`);
}

main().catch((err) => {
  console.error("\n[deliver] FAILED:", err.message);
  process.exit(1);
});