const PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/**
 * Pins a JSON object to IPFS via Pinata and returns a public gateway URL.
 * This is what makes reasoningURI actually verifiable by anyone, instead of
 * pointing at a file that only exists on this machine.
 *
 * Requires PINATA_JWT in the environment. If it's not set, or the pin
 * request fails for any reason, this returns null so the caller can fall
 * back to local logging rather than crashing the whole attestation cycle
 * over a pinning hiccup.
 */
export async function pinReasoning(record) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) return null;

  try {
    const res = await fetch(PINATA_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: record,
        pinataMetadata: { name: `taskattest-attestation-${record.taskId}.json` },
      }),
    });

    if (!res.ok) {
      console.warn(`[pin] Pinata request failed: ${res.status} ${await res.text()}`);
      return null;
    }

    const data = await res.json();
    return `${PINATA_GATEWAY}/${data.IpfsHash}`;
  } catch (err) {
    console.warn(`[pin] Pinata request error: ${err.message}`);
    return null;
  }
}