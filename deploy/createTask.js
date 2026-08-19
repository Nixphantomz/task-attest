import "dotenv/config";
import { ethers } from "ethers";
import { loadTaskAttestArtifact } from "./artifact.js";

/**
 * Convenience helper for the demo: approves USDC and creates a task in one go,
 * so you don't have to drive the block explorer's "Write Contract" UI by hand.
 *
 * NOTE: Circle USDC uses 6 decimals (NOT 18). So a reward of "10" here means
 * 10 USDC = 10_000000 base units. We read decimals() from the token to be safe.
 *
 * Usage:
 *   node createTask.js <specURI> <rewardInUsdc>
 * Example:
 *   node createTask.js https://gist.githubusercontent.com/.../spec.txt 5
 */

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

function requireEnv(name) {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var: ${name}. Fill it in your .env.`);
  }
  return v.trim();
}

async function main() {
  const specURI = process.argv[2];
  const rewardHuman = process.argv[3];
  if (!specURI || !rewardHuman) {
    throw new Error("Usage: node createTask.js <specURI> <rewardInUsdc>");
  }

  const rpcUrl = requireEnv("XLAYER_TESTNET_RPC");
  const privateKey = requireEnv("DEPLOYER_PRIVATE_KEY");
  const contractAddress = requireEnv("CONTRACT_ADDRESS");
  const usdtAddress = requireEnv("USDT_ADDRESS");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const { abi } = loadTaskAttestArtifact();

  const contract = new ethers.Contract(contractAddress, abi, wallet);
  const usdc = new ethers.Contract(usdtAddress, ERC20_ABI, wallet);

  const decimals = Number(await usdc.decimals());
  const reward = ethers.parseUnits(rewardHuman, decimals);
  console.log(`[task] poster: ${wallet.address}`);
  console.log(`[task] reward: ${rewardHuman} USDC (${reward} base units, ${decimals} decimals)`);

  const bal = await usdc.balanceOf(wallet.address);
  if (bal < reward) {
    throw new Error(
      `Not enough USDC. Have ${ethers.formatUnits(bal, decimals)}, need ${rewardHuman}. ` +
        `Get testnet USDC from https://faucet.circle.com (select X Layer Testnet).`
    );
  }

  const currentAllowance = await usdc.allowance(wallet.address, contractAddress);
  if (currentAllowance < reward) {
    console.log("[task] approving USDC spend…");
    const approveTx = await usdc.approve(contractAddress, reward);
    console.log("[task] approve tx:", approveTx.hash);
    await approveTx.wait();
    console.log("[task] approved.");
  } else {
    console.log("[task] existing allowance is sufficient, skipping approve.");
  }

  console.log("[task] creating task…");
  const tx = await contract.createTask(specURI, reward);
  console.log("[task] createTask tx:", tx.hash);
  const receipt = await tx.wait();

  // Pull the taskId out of the TaskCreated event.
  let taskId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "TaskCreated") {
        taskId = parsed.args.taskId.toString();
        break;
      }
    } catch {
      /* not our event, ignore */
    }
  }

  console.log("\n========================================");
  console.log(" Task created!");
  console.log(" taskId =", taskId ?? "(check the explorer / nextTaskId)");
  console.log(" specURI =", specURI);
  console.log("========================================");
  console.log("Next: from a worker wallet, call submitDeliverable(taskId, deliverableURI).");
}

main().catch((err) => {
  console.error("\n[task] FAILED:", err.message);
  process.exit(1);
});
