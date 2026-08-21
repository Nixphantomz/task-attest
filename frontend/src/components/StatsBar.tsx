"use client";

import { formatUnits } from "viem";
import { useTasks } from "@/lib/useTasks";
import { USDC_DECIMALS } from "@/lib/chains";

// Status numbers must match the Status enum order in TaskAttest.sol.
const RELEASED = 2;
const FLAGGED = 3;
const RECLAIMED = 4;

export function StatsBar() {
  const { tasks, enabled } = useTasks();

  if (!enabled || tasks.length === 0) return null;

  const judged = tasks.filter((t) => t.status === RELEASED || t.status === FLAGGED || t.status === RECLAIMED);
  const released = tasks.filter((t) => t.status === RELEASED);

  const avgScore =
    judged.length > 0 ? Math.round(judged.reduce((sum, t) => sum + t.qualityScore, 0) / judged.length) : null;

  const autoReleaseRate = judged.length > 0 ? Math.round((released.length / judged.length) * 100) : null;

  const totalSettled = released.reduce((sum, t) => sum + t.reward, 0n);

  return (
    <div className="stats-bar">
      <div className="stat">
        <div className="stat-value">{tasks.length}</div>
        <div className="stat-label">Tasks judged</div>
      </div>
      <div className="stat">
        <div className="stat-value">{autoReleaseRate === null ? "—" : `${autoReleaseRate}%`}</div>
        <div className="stat-label">Auto-release rate</div>
      </div>
      <div className="stat">
        <div className="stat-value">{avgScore === null ? "—" : avgScore}</div>
        <div className="stat-label">Avg AI score</div>
      </div>
      <div className="stat">
        <div className="stat-value">{formatUnits(totalSettled, USDC_DECIMALS)}</div>
        <div className="stat-label">USDC settled</div>
      </div>
    </div>
  );
}