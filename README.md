# TaskAttest — AI-Judged Work Escrow

**An AI agent reviews delivered work against a task spec and publishes a
quality score on-chain. Good work releases payment automatically. Weak work
gets flagged instead of paid.**

Built for X Layer's "Build X Series — AI Season" hackathon.

## Why this exists

OKX.AI's new Task Marketplace lets agents post work and pay through escrow —
but dispute resolution only kicks in _after_ two parties already disagree.
Nothing reviews delivered work _before_ that point. TaskAttest is that
missing layer: a pre-dispute AI quality gate for agent-to-agent (or
human-to-agent) work.

## Live on X Layer Testnet

**Contract:** [`0x6B0A28463E8ff42407CD0004245aA40A56834f7A`](https://www.okx.com/web3/explorer/xlayer-test/address/0x6B0A28463E8ff42407CD0004245aA40A56834f7A)

Two real, independently-verified outcomes prove both halves of the core
mechanism:

| Task | Deliverable quality        | AI score   | Result                         |
| ---- | -------------------------- | ---------- | ------------------------------ |
| 0    | Met every spec requirement | **98/100** | Auto-released to worker        |
| 1    | Generic, ignored the spec  | **35/100** | Flagged — funds held, not paid |

Every attestation's reasoning is pinned to IPFS and publicly verifiable —
for example, task 3's reasoning: https://gateway.pinata.cloud/ipfs/QmZ1XjcXSMy7E2vNTkqzdkkXxv5Eaqj6gNY7ARwTKK6hXj

## How it works

1. **`createTask(specURI, reward)`** — a poster deposits USDC and describes
   the work.
2. **`submitDeliverable(taskId, deliverableURI)`** — a worker submits
   completed work.
3. **The AI agent reviews it** — fetches the spec and deliverable, scores
   the work 0–100 against the spec using an LLM via OpenRouter, and logs its
   reasoning to IPFS.
4. **`attest(taskId, score, reasoningURI)`** — the agent publishes the score
   on-chain. Score ≥ 70 auto-releases payment. Below 70, the task is
   flagged instead.
5. **If flagged, the poster decides** — `posterApprove` to pay anyway, or
   `posterReclaim` (after a review window) to take the funds back.

No price oracles, no token issuance, no basket accounting — every function
maps to a plain real-world action.

## Architecture

```
contracts/
  TaskAttest.sol       Core escrow + AI-oracle-gated attestation logic
test/
  TaskAttest.t.sol      8 tests covering the full state machine, all passing
deploy/                 Plain Node.js + ethers.js deployment scripts (no Remix, no Hardhat)
  deploy.js              Deploys the contract, checks chain ID + gas balance first
  grantRole.js            Authorizes the AI agent's wallet
  createTask.js            Approves USDC + creates a task in one call
  submitDeliverable.js      Submits a deliverable for an open task
  checkTask.js               Reads a task's full on-chain state for verification
agent/                  The AI oracle itself
  src/index.js            Polls for delivered tasks, scores them, submits attestations
  src/strategy.js           OpenRouter call + strict output validation
  src/pin.js                 Pins reasoning to IPFS via Pinata
frontend/               Next.js dashboard (wagmi + viem + RainbowKit)
  Connect a wallet, post tasks, submit deliverables, and watch AI scoring happen live
```

## Running it yourself

**Deploy:**

```bash
cd deploy
npm install
cp env.example.txt .env   # fill in your RPC URL and a funded testnet wallet key
node deploy.js
node grantRole.js <agent-wallet-address>
```

**Run the AI agent:**

```bash
cd agent
npm install
cp .env.example .env      # fill in the contract address, agent wallet key, and an OpenRouter key
npm run once               # single pass, good for testing
npm start                   # continuous polling loop
```

**Run the dashboard:**

```bash
cd frontend
npm install
cp env.example.txt .env.local   # set NEXT_PUBLIC_CONTRACT_ADDRESS to the deployed address
npm run dev
```

Get testnet OKB (gas) from https://web3.okx.com/xlayer/faucet and testnet
USDC from https://faucet.circle.com.

## Tech

X Layer Testnet (chain ID 1952) · Solidity 0.8.24 · Foundry (tests) ·
ethers.js v6 · Circle-issued native USDC · OpenRouter for AI scoring ·
Pinata for IPFS · Next.js + wagmi + RainbowKit for the frontend.
