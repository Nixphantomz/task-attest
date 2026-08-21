"use client";

import { useState } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { TASK_ATTEST_ABI, CONTRACT_ADDRESS } from "@/lib/contract";

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

export function SubmitDeliverable({ onDone }: { onDone: () => void }) {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [taskId, setTaskId] = useState("");
  const [mode, setMode] = useState<"write" | "url">("write");
  const [deliverableText, setDeliverableText] = useState("");
  const [deliverableURL, setDeliverableURL] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit() {
    setMsg(null);
    if (!isConnected) return setMsg({ kind: "err", text: "Connect your wallet first." });
    if (!CONTRACT_ADDRESS) return setMsg({ kind: "err", text: "Contract address not configured." });
    if (taskId === "" || Number.isNaN(Number(taskId))) return setMsg({ kind: "err", text: "Enter a valid task id." });

    try {
      setBusy(true);

      let deliverableURI: string;
      if (mode === "write") {
        if (!deliverableText.trim()) {
          setBusy(false);
          return setMsg({ kind: "err", text: "Write the deliverable first." });
        }
        setMsg({ kind: "ok", text: "Pinning deliverable to IPFS…" });
        deliverableURI = await pinText(deliverableText.trim(), "deliverable.txt");
      } else {
        if (!deliverableURL.trim()) {
          setBusy(false);
          return setMsg({ kind: "err", text: "Deliverable URL is required." });
        }
        deliverableURI = deliverableURL.trim();
      }

      setMsg({ kind: "ok", text: "Submitting deliverable…" });
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: TASK_ATTEST_ABI,
        functionName: "submitDeliverable",
        args: [BigInt(taskId), deliverableURI],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      setMsg({ kind: "ok", text: "Deliverable submitted! The AI agent will review it shortly." });
      setTaskId("");
      setDeliverableText("");
      setDeliverableURL("");
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
          <label>The completed work</label>
          <textarea
            placeholder="Write or paste the completed deliverable here..."
            value={deliverableText}
            onChange={(e) => setDeliverableText(e.target.value)}
            rows={4}
          />
        </>
      ) : (
        <>
          <label>Deliverable URI (hosted text/JSON with your completed work)</label>
          <input
            placeholder="https://gist.githubusercontent.com/.../raw/work.txt"
            value={deliverableURL}
            onChange={(e) => setDeliverableURL(e.target.value)}
          />
        </>
      )}

      <button onClick={submit} disabled={busy || !isConnected}>
        {busy ? "Working…" : "Submit deliverable"}
      </button>
      {msg && <div className={`status-msg ${msg.kind}`}>{msg.text}</div>}
    </div>
  );
}