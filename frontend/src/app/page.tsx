"use client";

import { useCallback } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Hero } from "@/components/Hero";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CreateTask } from "@/components/CreateTask";
import { SubmitDeliverable } from "@/components/SubmitDeliverable";
import { TaskList } from "@/components/TaskList";
import { CONTRACT_ADDRESS } from "@/lib/contract";

export default function Home() {
  const refresh = useCallback(() => {
    window.dispatchEvent(new CustomEvent("taskattest:refresh"));
  }, []);

  return (
    <>
      <div className="container">
        <header className="header">
          <div className="brand">
            <h1>TaskAttest</h1>
            <p>AI-judged work escrow · X Layer</p>
          </div>
          <div className="header-right">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </header>
      </div>

      <Hero />

      <div className="container">
        {!CONTRACT_ADDRESS && (
          <div className="banner">
            No contract configured yet. Deploy with <span className="mono">deploy/deploy.js</span>, then set{" "}
            <span className="mono">NEXT_PUBLIC_CONTRACT_ADDRESS</span> in the frontend env and redeploy.
          </div>
        )}

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <CreateTask onDone={refresh} />
          <SubmitDeliverable onDone={refresh} />
        </div>

        <div style={{ marginTop: 20 }}>
          <TaskList />
        </div>
      </div>
    </>
  );
}