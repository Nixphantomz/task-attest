# frontend/ — TaskAttest dashboard (Next.js + wagmi + RainbowKit)

A single-page dashboard for the TaskAttest demo:

- Connect wallet (OKX Wallet first, plus MetaMask / injected / WalletConnect).
- **Post a task** — approves USDC + calls `createTask`.
- **Submit a deliverable** — calls `submitDeliverable`.
- **Live task list** — status pill, AI quality score, and links to the spec,
  deliverable, and AI reasoning. Poster gets **Approve anyway** / **Reclaim**
  buttons on flagged tasks.
- `/api/pin` — server-side IPFS pinning endpoint (see below), so the AI agent's
  reasoning can be pinned to a real public `reasoningURI` instead of a local file.

## Local dev

```bash
cd frontend
npm install
copy env.example.txt .env.local    # (Windows) — or: cp env.example.txt .env.local
# set NEXT_PUBLIC_CONTRACT_ADDRESS (from deploy/deploy.js)
npm run dev
```

Open http://localhost:3000. Add X Layer Testnet in your wallet when prompted
(RainbowKit surfaces the custom chain automatically).

## Deploy on Vercel

1. Push the repo to GitHub.
2. In Vercel: **New Project** → import the repo → set **Root Directory** to
   `frontend`. Framework preset auto-detects Next.js.
3. Add environment variables in the Vercel project settings:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` (required)
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (optional)
   - `PINATA_JWT` (optional, for `/api/pin`)
4. Deploy. The `/api/pin` route runs as a Vercel serverless function.

## IPFS pinning (the `reasoningURI` fix)

`/api/pin` accepts a JSON body and pins it to IPFS, returning
`{ cid, uri }`. Configure a provider via env (`PINATA_JWT`, or
`PIN_ENDPOINT` + `PIN_TOKEN`). If none is set it returns HTTP 501 and callers
should fall back to their previous behaviour.

The AI agent can POST its reasoning here and store the returned `uri` on-chain
as `reasoningURI` — publicly verifiable, unlike the current local-file path.
See the agent's `PIN_ENDPOINT` wiring.

## Keep the ABI in sync

`src/lib/contract.ts` holds the TaskAttest ABI (human-readable, parsed via
viem's `parseAbi`). It must match `contracts/TaskAttest.sol` and
`agent/src/config.js`. If the contract changes, update all three.
