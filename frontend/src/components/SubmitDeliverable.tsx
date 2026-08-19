"use client";

import { useState } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { TASK_ATTEST_ABI, CONTRACT_ADDRESS } from "@/lib/contract";

export function SubmitDeliverable({ onDone }: { onDone: () => void }) {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [taskId, setTaskId] = useState("");
  const [deliverableURI, setDeliverableURI] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit() {
    setMsg(null);
    if (!isConnected) return setMsg({ kind: "err", text: "Connect your wallet first." });
    if (!CONTRACT_ADDRESS) return setMsg({ kind: "err", text: "Contract address not configured." });
    if (taskId === "" || Number.isNaN(Number(taskId))) return setMsg({ kind: "err", text: "Enter a valid task id." });
    if (!deliverableURI.trim()) return setMsg({ kind: "err", text: "Deliverable URI is required." });

    try {
      setBusy(true);
      setMsg({ kind: "ok", text: "Submitting deliverable…" });
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: TASK_ATTEST_ABI,
        functionName: "submitDeliverable",
        args: [BigInt(taskId), deliverableURI.trim()],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      setMsg({ kind: "ok", text: "Deliverable submitted! The AI agent will review it shortly." });
      setTaskId("");
      setDeliverableURI("");
      onDone();
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message.slice(0, 200) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Submit a deliverable</h2>
      <label>Task ID</label>
      <input placeholder="0" value={taskId} onChange={(e) => setTaskId(e.target.value)} inputMode="numeric" />
      <label>Deliverable URI (hosted text/JSON with your completed work)</label>
      <input
        placeholder="https://gist.githubusercontent.com/.../raw/work.txt"
        value={deliverableURI}
        onChange={(e) => setDeliverableURI(e.target.value)}
      />
      <button onClick={submit} disabled={busy || !isConnected}>
        {busy ? "Working…" : "Submit deliverable"}
      </button>
      {msg && <div className={`status-msg ${msg.kind}`}>{msg.text}</div>}
    </div>
  );
}
