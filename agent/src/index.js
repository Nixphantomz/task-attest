import "dotenv/config";
import fs from "node:fs/promises";
import { STATUS } from "./config.js";
import { fetchContent } from "./fetchContent.js";
import { scoreDeliverable } from "./strategy.js";
import { getProviderAndWallet, getContract, submitAttestation } from "./chain.js";
import { pinReasoning } from "./pin.js";

const REQUIRED_ENV = ["XLAYER_TESTNET_RPC", "CONTRACT_ADDRESS", "AGENT_PRIVATE_KEY", "OPENROUTER_API_KEY"];

function assertEnv() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}. Copy .env.example to .env and fill in.`);
  }
}

async function logReasoning(taskId, reasoning, qualityScore) {
  const record = { taskId, timestamp: new Date().toISOString(), qualityScore, reasoning };

  // Try real IPFS pinning first - this is what makes reasoningURI actually
  // publicly verifiable, not just a path on this machine.
  const pinnedURI = await pinReasoning(record);
  if (pinnedURI) {
    console.log(`[agent] reasoning pinned to IPFS: ${pinnedURI}`);
    return pinnedURI;
  }

  // Fallback: PINATA_JWT not set, or the pin request failed. Log locally so
  // the cycle can still complete, but this is NOT publicly verifiable -
  // fine for local testing, not fine to rely on for a real submission claim.
  console.warn("[agent] IPFS pinning unavailable (no PINATA_JWT, or the request failed) - falling back to a local file, which nobody outside this machine can see.");
  await fs.mkdir("./logs", { recursive: true });
  const path = `./logs/attestation-${taskId}.json`;
  await fs.writeFile(path, JSON.stringify(record, null, 2));
  console.log(`[agent] reasoning logged to ${path}`);
  return path;
}

async function runOnce() {
  assertEnv();

  const { wallet } = getProviderAndWallet({
    rpcUrl: process.env.XLAYER_TESTNET_RPC,
    privateKey: process.env.AGENT_PRIVATE_KEY,
  });
  const contract = getContract({ contractAddress: process.env.CONTRACT_ADDRESS, signerOrProvider: wallet });

  const nextTaskId = Number(await contract.nextTaskId());
  console.log(`[agent] scanning tasks 0..${nextTaskId - 1} for pending deliverables...`);

  for (let taskId = 0; taskId < nextTaskId; taskId++) {
    const task = await contract.tasks(taskId);
    if (Number(task.status) !== STATUS.Delivered) continue;

    console.log(`[agent] task ${taskId} awaiting attestation - reviewing...`);

    try {
      const [spec, deliverable] = await Promise.all([
        fetchContent(task.specURI),
        fetchContent(task.deliverableURI),
      ]);

      const { qualityScore, reasoning } = await scoreDeliverable({
        spec,
        deliverable,
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5",
      });

      const reasoningURI = await logReasoning(taskId, reasoning, qualityScore);
      await submitAttestation({ contract, taskId, qualityScore, reasoningURI });
    } catch (err) {
      console.error(`[agent] failed to process task ${taskId}: ${err.message}`);
    }
  }

  console.log("[agent] cycle complete.");
}

async function main() {
  const runOnceFlag = process.argv.includes("--once");

  if (runOnceFlag) {
    await runOnce();
    return;
  }

  const intervalSeconds = Number(process.env.POLL_INTERVAL_SECONDS ?? 60);
  console.log(`[agent] starting loop, interval = ${intervalSeconds}s`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await runOnce();
    } catch (err) {
      console.error("[agent] cycle failed:", err.message);
    }
    await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
  }
}

main().catch((err) => {
  console.error("[agent] fatal:", err);
  process.exit(1);
});