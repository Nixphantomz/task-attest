import { NextRequest, NextResponse } from "next/server";

/**
 * Pins raw plain text to IPFS via Pinata's FILE upload endpoint - not
 * pinJSONToIPFS (that one wraps content as JSON, which would make the
 * agent's fetchContent() see literal JSON instead of plain text). This
 * keeps typed-in specs/deliverables behaving identically to a Gist raw
 * URL: fetch it, get plain text back.
 *
 * Request body: { text: string, filename?: string }
 * Response: { uri, cid } on success, { error } with 501 if PINATA_JWT
 * isn't configured on this deployment (callers should fall back to
 * asking for a URL instead).
 */

const PINATA_FILE_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export async function POST(req: NextRequest) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return NextResponse.json(
      { error: "IPFS pinning isn't configured on this deployment (missing PINATA_JWT) - use a URL instead." },
      { status: 501 }
    );
  }

  let body: { text?: string; filename?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON with a text field." }, { status: 400 });
  }

  if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
    return NextResponse.json({ error: "text field is required and must be non-empty." }, { status: 400 });
  }

  const filename = body.filename || "content.txt";
  const blob = new Blob([body.text], { type: "text/plain" });

  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("pinataMetadata", JSON.stringify({ name: filename }));

  try {
    const res = await fetch(PINATA_FILE_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: formData,
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Pinata pin failed: ${res.status} ${await res.text()}` }, { status: 502 });
    }

    const data = (await res.json()) as { IpfsHash: string };
    return NextResponse.json({ cid: data.IpfsHash, uri: `${PINATA_GATEWAY}/${data.IpfsHash}` });
  } catch (err) {
    return NextResponse.json({ error: `Pinata request error: ${(err as Error).message}` }, { status: 502 });
  }
}