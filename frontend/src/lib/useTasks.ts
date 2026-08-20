"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { TASK_ATTEST_ABI, CONTRACT_ADDRESS } from "./contract";

export interface TaskView {
  id: number;
  poster: `0x${string}`;
  worker: `0x${string}`;
  reward: bigint;
  specURI: string;
  deliverableURI: string;
  qualityScore: number;
  reasoningURI: string;
  status: number;
  deliveredAt: bigint;
}

/**
 * Reads nextTaskId, then batch-reads every task via multicall.
 * Auto-refreshes so the dashboard reflects new attestations without a reload.
 */
export function useTasks() {
  const enabled = Boolean(CONTRACT_ADDRESS);

  const { data: nextTaskId, refetch: refetchCount } = useReadContract({
    address: CONTRACT_ADDRESS || undefined,
    abi: TASK_ATTEST_ABI,
    functionName: "nextTaskId",
    query: { enabled, refetchInterval: 15_000 },
  });

  const count = nextTaskId ? Number(nextTaskId) : 0;

  const {
    data: rawTasks,
    isLoading,
    refetch: refetchTasks,
  } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: CONTRACT_ADDRESS || undefined,
      abi: TASK_ATTEST_ABI,
      functionName: "tasks" as const,
      args: [BigInt(i)],
    })),
    query: { enabled: enabled && count > 0, refetchInterval: 15_000 },
  });

  const tasks: TaskView[] = (rawTasks ?? [])
    .map((r, i) => {
      if (r.status !== "success" || !r.result) return null;
      const t = r.result as unknown as readonly [
        `0x${string}`,
        `0x${string}`,
        bigint,
        string,
        string,
        number,
        string,
        number,
        bigint,
      ];
      return {
        id: i,
        poster: t[0],
        worker: t[1],
        reward: t[2],
        specURI: t[3],
        deliverableURI: t[4],
        qualityScore: t[5],
        reasoningURI: t[6],
        status: t[7],
        deliveredAt: t[8],
      } satisfies TaskView;
    })
    .filter((t): t is TaskView => t !== null)
    .reverse(); // newest first

  const refetch = () => {
    refetchCount();
    refetchTasks();
  };

  return { tasks, count, isLoading, refetch, enabled };
}
