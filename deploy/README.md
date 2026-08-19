# deploy/ — TaskAttest deployment (plain ethers.js, no Remix)

This is the **current, correct** way to get TaskAttest live on X Layer.
It deploys from the already-compiled Foundry artifact in `../out` using plain
ethers.js, so you don't need Remix, Hardhat, or a Foundry runtime just to deploy.

## One-time setup

```bash
cd deploy
npm install
copy env.example.txt .env    # (Windows)  — or:  cp env.example.txt .env
```

Then edit `.env` and fill in:

- `DEPLOYER_PRIVATE_KEY` — the wallet that deploys + becomes admin. Never commit this.
- `XLAYER_TESTNET_RPC` — pre-filled; change only if the default RPC is flaky.
- `USDT_ADDRESS` — pre-filled with Circle testnet USDC (`0xDec9…b9B3`). Leave as-is.

> **Decimals note:** Circle USDC uses **6 decimals**, not 18. `createTask.js`
> reads `decimals()` from the token, so amounts you pass are in whole USDC.

## Deploy

Make sure the deployer wallet has some testnet OKB for gas
(faucet: https://web3.okx.com/xlayer/faucet).

```bash
node deploy.js
```

On success it prints `CONTRACT_ADDRESS=…`. Copy that into:
- `deploy/.env` → `CONTRACT_ADDRESS`
- `agent/.env`  → `CONTRACT_ADDRESS`
- the frontend env (see `../frontend`)

## Authorize the agent

Fund the agent wallet with a little OKB first, then:

```bash
node grantRole.js <agent-wallet-address>
```

## (Optional) create a demo task without the explorer UI

Get testnet USDC from https://faucet.circle.com (select X Layer Testnet), then:

```bash
node createTask.js <specURI> <rewardInUsdc>
# e.g.
node createTask.js https://gist.githubusercontent.com/you/abc/raw/spec.txt 5
```

This approves USDC and calls `createTask` in one shot, and prints the new `taskId`.
A worker then calls `submitDeliverable(taskId, deliverableURI)` (from any wallet),
and the agent (`../agent`) will pick it up and attest.
