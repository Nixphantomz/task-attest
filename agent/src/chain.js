import { ethers } from "ethers";
import { TASK_ATTEST_ABI } from "./config.js";

export function getProviderAndWallet({ rpcUrl, privateKey }) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return { provider, wallet };
}

export function getContract({ contractAddress, signerOrProvider }) {
  return new ethers.Contract(contractAddress, TASK_ATTEST_ABI, signerOrProvider);
}

export async function submitAttestation({ contract, taskId, qualityScore, reasoningURI }) {
  const tx = await contract.attest(taskId, qualityScore, reasoningURI);
  console.log(`[chain] submitted attest(${taskId}, ${qualityScore}) tx: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[chain] confirmed in block ${receipt.blockNumber}`);
  return receipt;
}
