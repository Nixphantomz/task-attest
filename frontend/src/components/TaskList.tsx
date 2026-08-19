"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { TASK_ATTEST_ABI, CONTRACT_ADDRESS, statusName } from "@/lib/contract";
import { USDC_DECIMALS } from "@/lib/chains";
import { useTasks, type TaskView } from "@/lib/useTasks";

function short(addr: string) {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function TaskCard({ task, onAction }: { task: TaskView; onAction: () => void }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const status = statusName(task.status);
  const isPoster = address && address.toLowerCase() === task.poster.toLowerCase();
  const isFlagged = status === "Flagged";
  const attested = task.status >= 2 || task.status === 3;

  async function act(fn: "posterApprove" | "posterReclaim") {
    setMsg(null);
    try {
      setBusy(fn);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: TASK_ATTEST_ABI,
        functionName: fn,
        args: [BigInt(task.id)],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      setMsg({ kind: "ok", text: fn === "posterApprove" ? "Released to worker." : "Funds reclaimed." });
      onAction();
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message.slice(0, 160) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="task">
      <div className="task-head">
        <strong>Task #{task.id}</strong>
        <span className={`pill ${status}`}>{status}</span>
      </div>

      <div className="row" style={{ marginTop: 10, justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="muted">Reward</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{formatUnits(task.reward, USDC_DECIMALS)} USDC</div>
        </div>
        {(task.status === 2 || task.status === 3 || task.status === 4) && task.qualityScore > 0 && (
          <div style={{ textAlign: "right" }}>
            <div className="muted">AI score</div>
            <div className="score">{task.qualityScore}</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="muted">Poster {short(task.poster)} · Worker {short(task.worker)}</div>
        <div className="muted" style={{ marginTop: 4 }}>
          Spec:{" "}
          <a href={task.specURI} target="_blank" rel="noreferrer">
            {task.specURI || "—"}
          </a>
        </div>
        {task.deliverableURI && (
          <div className="muted">
            Deliverable:{" "}
            <a href={task.deliverableURI} target="_blank" rel="noreferrer">
              {task.deliverableURI}
            </a>
          </div>
        )}
        {task.reasoningURI && (
          <div className="muted">
            AI reasoning:{" "}
            <a href={task.reasoningURI} target="_blank" rel="noreferrer">
              {task.reasoningURI}
            </a>
          </div>
        )}
      </div>

      {isFlagged && isPoster && (
        <div className="row">
          <button onClick={() => act("posterApprove")} disabled={busy !== null}>
            {busy === "posterApprove" ? "…" : "Approve anyway"}
          </button>
          <button className="secondary" onClick={() => act("posterReclaim")} disabled={busy !== null}>
            {busy === "posterReclaim" ? "…" : "Reclaim (after review window)"}
          </button>
        </div>
      )}
      {isFlagged && !isPoster && (
        <div className="status-msg err" style={{ marginTop: 12 }}>
          Flagged by the AI (score below threshold). The poster decides whether to release or reclaim.
        </div>
      )}
      {msg && <div className={`status-msg ${msg.kind}`}>{msg.text}</div>}
    </div>
  );
}

export function TaskList() {
  const { tasks, isLoading, refetch, enabled } = useTasks();

  // Refetch when a write elsewhere in the app finishes.
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("taskattest:refresh", handler);
    return () => window.removeEventListener("taskattest:refresh", handler);
  }, [refetch]);

  if (!enabled) {
    return (
      <div className="card">
        <h2>Tasks</h2>
        <div className="muted">Set NEXT_PUBLIC_CONTRACT_ADDRESS to load tasks.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Tasks</h2>
        <button className="secondary" style={{ marginTop: 0 }} onClick={refetch}>
          Refresh
        </button>
      </div>
      <div style={{ marginTop: 14 }}>
        {isLoading && <div className="muted">Loading…</div>}
        {!isLoading && tasks.length === 0 && <div className="muted">No tasks yet. Post one above.</div>}
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onAction={refetch} />
        ))}
      </div>
    </div>
  );
}
