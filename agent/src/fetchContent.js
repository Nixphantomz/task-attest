/**
 * specURI / deliverableURI can be plain HTTP(S) URLs or IPFS URIs
 * (ipfs://<cid>) — this normalizes IPFS to a public gateway URL and fetches
 * the text content either way. For the hackathon build, hosted JSON/text
 * (even a GitHub Gist raw URL) works fine — the AI just needs to be able to
 * read what the task asked for and what was delivered.
 */
export async function fetchContent(uri) {
  const url = uri.startsWith("ipfs://")
    ? `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`
    : uri;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to fetch ${url}: ${res.status}`);
  return res.text();
}
