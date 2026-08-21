"use client";

import { useState } from "react";
import { useAccount, useChainId, useWriteContract, usePublicClient } from "wagmi";
import { parseUnits } from "viem";
import { TASK_ATTEST_ABI, ERC20_ABI, CONTRACT_ADDRESS } from "@/lib/contract";
import { USDC_ADDRESS, USDC_DECIMALS } from "@/lib/chains";

async function pinText(text: string, filename: string): Promise<string> {
  const res = await fetch("/api/pin-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, filename }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Pinning failed: ${res.status}`);
  return data.uri as string;
}

export function CreateTask({ onDone }: { onDone: () => void }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [mode, setMode] = useState<"write" | "url">("write");
  const [specText, setSpecText] = useState("");
  const [specURL, setSpecURL] = useState("");
  const [reward, setReward] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const usdc = USDC_ADDRESS[chainId];

  async function submit() {
    setMsg(null);
    if (!isConnected || !address) return setMsg({ kind: "err", text: "Connect your wallet first." });
    if (!CONTRACT_ADDRESS) return setMsg({ kind: "err", text: "Contract address not configured." });
    if (!usdc) return setMsg({ kind: "err", text: `No USDC address known for chain ${chainId}.` });
    if (!reward || Number(reward) <= 0) return setMsg({ kind: "err", text: "Reward must be > 0." });

    const amount = parseUnits(reward, USDC_DECIMALS);

    try {
      setBusy(true);

      let specURI: string;
      if (mode === "write") {
        if (!specText.trim()) {
          setBusy(false);
          return setMsg({ kind: "err", text: "Write the task spec first." });
        }
        setMsg({ kind: "ok", text: "Pinning spec to IPFS…" });
        specURI = await pinText(specText.trim(), "spec.txt");
      } else {
        if (!specURL.trim()) {
          setBusy(false);
          return setMsg({ kind: "err", text: "Spec URL is required." });
        }
        specURI = specURL.trim();
      }

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

      setMsg({ kind: "ok", text: "Creating task…" });
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: TASK_ATTEST_ABI,
        functionName: "createTask",
        args: [specURI, amount],
      });
      await publicClient!.waitForTransactionReceipt({ hash });

      setMsg({ kind: "ok", text: "Task created!" });
      setSpecText("");
      setSpecURL("");
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

      <div className="mode-toggle">
        <button type="button" className={mode === "write" ? "mode-active" : "mode-inactive"} onClick={() => setMode("write")}>
          Write it
        </button>
        <button type="button" className={mode === "url" ? "mode-active" : "mode-inactive"} onClick={() => setMode("url")}>
          Paste a URL
        </button>
      </div>

      {mode === "write" ? (
        <>
          <label>Describe the task</label>
          <textarea
            placeholder="e.g. Write a 2-3 sentence product description for an insulated water bottle..."
            value={specText}
            onChange={(e) => setSpecText(e.target.value)}
            rows={4}
          />
        </>
      ) : (
        <>
          <label>Spec URI (hosted text/JSON describing the work)</label>
          <input
            placeholder="https://gist.githubusercontent.com/.../raw/spec.txt"
            value={specURL}
            onChange={(e) => setSpecURL(e.target.value)}
          />
        </>
      )}

      <label>Reward (USDC)</label>
      <input placeholder="5" value={reward} onChange={(e) => setReward(e.target.value)} inputMode="decimal" />
      <button onClick={submit} disabled={busy || !isConnected}>
        {busy ? "Working…" : "Approve + Create task"}
      </button>
      {msg && <div className={`status-msg ${msg.kind}`}>{msg.text}</div>}
    </div>
  );
}