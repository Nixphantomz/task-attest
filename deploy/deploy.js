import "dotenv/config";
import { ethers } from "ethers";
import { loadTaskAttestArtifact } from "./artifact.js";

/**
 * Deploys TaskAttest to X Layer using plain ethers.js.
 *
 * Why this exists instead of Remix: Remix's Deploy button failed silently
 * (no popup, no error). This script surfaces real, specific error messages
 * at every step so a failure is actually diagnosable.
 *
 * Constructor signature (from TaskAttest.sol):
 *   constructor(address _usdt, address admin)
 * We pass the Circle USDC address as _usdt and the deployer as admin.
 */

function requireEnv(name) {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var: ${name}. Copy env.example.txt to .env and fill it in.`);
  }
  return v.trim();
}

async function main() {
  const rpcUrl = requireEnv("XLAYER_TESTNET_RPC");
  const privateKey = requireEnv("DEPLOYER_PRIVATE_KEY");
  const usdtAddress = requireEnv("USDT_ADDRESS");
  const expectedChainId = BigInt(process.env.EXPECTED_CHAIN_ID ?? "1952");

  if (!ethers.isAddress(usdtAddress)) {
    throw new Error(`USDT_ADDRESS is not a valid address: ${usdtAddress}`);
  }

  console.log("[deploy] connecting to RPC:", rpcUrl);
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // --- chain id sanity check ---
  let network;
  try {
    network = await provider.getNetwork();
  } catch (err) {
    throw new Error(`Could not reach the RPC at ${rpcUrl}. Is the URL correct and the node up?\n  ${err.message}`);
  }
  console.log("[deploy] connected. chainId =", network.chainId.toString());
  if (network.chainId !== expectedChainId) {
    console.warn(
      `[deploy] WARNING: connected chainId ${network.chainId} != expected ${expectedChainId}. ` +
        `Make sure your RPC points at X Layer Testnet (Terigon, 1952).`
    );
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("[deploy] deployer address:", wallet.address);

  // --- gas balance check (X Layer gas token is OKB) ---
  const balance = await provider.getBalance(wallet.address);
  console.log("[deploy] deployer OKB balance:", ethers.formatEther(balance), "OKB");
  if (balance === 0n) {
    throw new Error(
      `Deployer has 0 OKB and cannot pay gas. Get testnet OKB from https://web3.okx.com/xlayer/faucet ` +
        `for address ${wallet.address}, then re-run.`
    );
  }

  // --- deploy ---
  const { abi, bytecode } = loadTaskAttestArtifact();
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  console.log("[deploy] deploying TaskAttest with:");
  console.log("           _usdt (Circle USDC):", usdtAddress);
  console.log("           admin (deployer):    ", wallet.address);

  let contract;
  try {
    contract = await factory.deploy(usdtAddress, wallet.address);
  } catch (err) {
    throw new Error(`Deployment transaction was rejected: ${err.shortMessage ?? err.message}`);
  }

  console.log("[deploy] tx sent, waiting for confirmation… tx hash:", contract.deploymentTransaction()?.hash);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n========================================");
  console.log(" TaskAttest deployed!");
  console.log(" CONTRACT_ADDRESS =", address);
  console.log("========================================\n");
  console.log("Next steps:");
  console.log("  1. Put this into your .env as CONTRACT_ADDRESS (in deploy/ and agent/).");
  console.log("  2. Fund your agent wallet with a little OKB for gas.");
  console.log("  3. Run: node grantRole.js <agent-wallet-address>");
  console.log(`  4. View it: https://www.okx.com/web3/explorer/xlayer-test/address/${address}`);
}

main().catch((err) => {
  console.error("\n[deploy] FAILED:", err.message);
  process.exit(1);
});
