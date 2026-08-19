import "dotenv/config";
import { ethers } from "ethers";
import { loadTaskAttestArtifact } from "./artifact.js";

/**
 * Grants AI_ORACLE_ROLE to the off-chain agent's wallet so it's allowed to
 * call attest(). Must be run by the admin (the deployer wallet).
 *
 * Usage:
 *   node grantRole.js <agent-wallet-address>
 */

function requireEnv(name) {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var: ${name}. Fill it in your .env.`);
  }
  return v.trim();
}

async function main() {
  const agentAddress = process.argv[2];
  if (!agentAddress) {
    throw new Error("Usage: node grantRole.js <agent-wallet-address>");
  }
  if (!ethers.isAddress(agentAddress)) {
    throw new Error(`Not a valid address: ${agentAddress}`);
  }

  const rpcUrl = requireEnv("XLAYER_TESTNET_RPC");
  const privateKey = requireEnv("DEPLOYER_PRIVATE_KEY");
  const contractAddress = requireEnv("CONTRACT_ADDRESS");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const { abi } = loadTaskAttestArtifact();
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  console.log("[grant] admin (caller):", wallet.address);
  console.log("[grant] contract:      ", contractAddress);
  console.log("[grant] granting AI_ORACLE_ROLE to:", agentAddress);

  const role = await contract.AI_ORACLE_ROLE();
  console.log("[grant] AI_ORACLE_ROLE =", role);

  // Skip if already granted, to avoid a wasted tx.
  const already = await contract.hasRole(role, agentAddress);
  if (already) {
    console.log("[grant] address already has the role. Nothing to do.");
    return;
  }

  let tx;
  try {
    tx = await contract.grantRole(role, agentAddress);
  } catch (err) {
    throw new Error(
      `grantRole was rejected: ${err.shortMessage ?? err.message}\n` +
        `Is the caller (${wallet.address}) the admin that deployed the contract?`
    );
  }

  console.log("[grant] tx sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("[grant] confirmed in block", receipt.blockNumber);
  console.log("[grant] done. The agent wallet can now call attest().");
}

main().catch((err) => {
  console.error("\n[grant] FAILED:", err.message);
  process.exit(1);
});
