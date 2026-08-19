"use client";

import { useState } from "react";
import { useAccount, useChainId, useWriteContract, usePublicClient } from "wagmi";
import { parseUnits } from "viem";
import { TASK_ATTEST_ABI, ERC20_ABI, CONTRACT_ADDRESS } from "@/lib/contract";
import { USDC_ADDRESS, USDC_DECIMALS } from "@/lib/chains";

export function CreateTask({ onDone }: { onDone: () => void }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [specURI, setSpecURI] = useState("");
  const [reward, setReward] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const usdc = USDC_ADDRESS[chainId];

  async function submit() {
    setMsg(null);
    if (!isConnected || !address) return setMsg({ kind: "err", text: "Connect your wallet first." });
    if (!CONTRACT_ADDRESS) return setMsg({ kind: "err", text: "Contract address not configured." });
    if (!usdc) return setMsg({ kind: "err", text: `No USDC address known for chain ${chainId}.` });
    if (!specURI.trim()) return setMsg({ kind: "err", text: "Spec URI is required." });
    if (!reward || Number(reward) <= 0) return setMsg({ kind: "err", text: "Reward must be > 0." });

    const amount = parseUnits(reward, USDC_DECIMALS);

    try {
      setBusy(true);

      // 1) approve if needed
      const allowance = (await publicClient!.readContract({
        address: usdc,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CONTRACT_ADDRESS],
      })) as bigint;

      if (allowance < amount) {
        setMsg({ kind: "ok", text: "Approving USDC…" });
        const approveHash = await writeContractAsync({
          address: usdc,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESS, amount],
        });
        await publicClient!.waitForTransactionReceipt({ hash: approveHash });
      }

      // 2) createTask
      setMsg({ kind: "ok", text: "Creating task…" });
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: TASK_ATTEST_ABI,
        functionName: "createTask",
        args: [specURI.trim(), amount],
      });
      await publicClient!.waitForTransactionReceipt({ hash });

      setMsg({ kind: "ok", text: "Task created!" });
      setSpecURI("");
      setReward("");
      onDone();
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message.slice(0, 200) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Post a task</h2>
      <label>Spec URI (hosted text/JSON describing the work — a Gist raw URL works)</label>
      <input
        placeholder="https://gist.githubusercontent.com/.../raw/spec.txt"
        value={specURI}
        onChange={(e) => setSpecURI(e.target.value)}
      />
      <label>Reward (USDC)</label>
      <input placeholder="5" value={reward} onChange={(e) => setReward(e.target.value)} inputMode="decimal" />
      <button onClick={submit} disabled={busy || !isConnected}>
        {busy ? "Working…" : "Approve + Create task"}
      </button>
      {msg && <div className={`status-msg ${msg.kind}`}>{msg.text}</div>}
    </div>
  );
}
