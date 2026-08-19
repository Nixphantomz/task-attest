import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side IPFS pinning endpoint.
 *
 * The AI agent (or the UI) POSTs attestation reasoning here as JSON; we pin it
 * to IPFS and return a public gateway URL that can be used as `reasoningURI`
 * on-chain. This runs server-side because the pinning provider needs a SECRET
 * token that must never reach the browser.
 *
 * Configure ONE of these providers via env:
 *   - Pinata:  PINATA_JWT=<jwt>
 *   - web3.storage / any pinning-by-JSON API compatible endpoint:
 *       PIN_ENDPOINT=<url>  PIN_TOKEN=<bearer token>
 *
 * If nothing is configured, this returns 501 so the caller can fall back to
 * its previous behaviour (the agent currently writes a local file).
 *
 * Request body: any JSON object (e.g. { taskId, qualityScore, reasoning, ... }).
 * Response: { uri: "https://<gateway>/ipfs/<cid>", cid: "<cid>" }
 */

const PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON." }, { status: 400 });
  }

  // --- Provider 1: Pinata ---
  const pinataJwt = process.env.PINATA_JWT;
  if (pinataJwt) {
    try {
      const res = await fetch(PINATA_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pinataJwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pinataContent: body }),
      });
      if (!res.ok) {
        return NextResponse.json({ error: `Pinata pin failed: ${res.status} ${await res.text()}` }, { status: 502 });
      }
      const data = (await res.json()) as { IpfsHash: string };
      const cid = data.IpfsHash;
      return NextResponse.json({ cid, uri: `${PINATA_GATEWAY}/${cid}` });
    } catch (err) {
      return NextResponse.json({ error: `Pinata request error: ${(err as Error).message}` }, { status: 502 });
    }
  }

  // --- Provider 2: generic bearer-token JSON pin endpoint ---
  const endpoint = process.env.PIN_ENDPOINT;
  const token = process.env.PIN_TOKEN;
  if (endpoint && token) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        return NextResponse.json({ error: `Pin failed: ${res.status} ${await res.text()}` }, { status: 502 });
      }
      const data = (await res.json()) as { cid?: string; Hash?: string; IpfsHash?: string; gateway?: string };
      const cid = data.cid ?? data.Hash ?? data.IpfsHash;
      if (!cid) {
        return NextResponse.json({ error: "Pin endpoint returned no CID." }, { status: 502 });
      }
      const gateway = data.gateway ?? "https://ipfs.io/ipfs";
      return NextResponse.json({ cid, uri: `${gateway}/${cid}` });
    } catch (err) {
      return NextResponse.json({ error: `Pin request error: ${(err as Error).message}` }, { status: 502 });
    }
  }

  return NextResponse.json(
    {
      error:
        "No IPFS pinning provider configured. Set PINATA_JWT, or PIN_ENDPOINT + PIN_TOKEN, in the frontend env.",
    },
    { status: 501 }
  );
}
