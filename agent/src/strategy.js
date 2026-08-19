const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Asks the configured OpenRouter model to review a submitted deliverable
 * against the original task spec and return a quality score + reasoning.
 * Returns { qualityScore: 0-100 int, reasoning: string }.
 */
export async function scoreDeliverable({ spec, deliverable, apiKey, model }) {
  const systemPrompt = `You are a fair, consistent quality reviewer for a work marketplace escrow system.
You will be given a task specification and a submitted deliverable. Judge ONLY whether the deliverable satisfies the spec - not your own taste or unstated preferences.
Return ONLY valid JSON, no prose outside the JSON object, in this exact shape:
{
  "qualityScore": 0-100,
  "reasoning": "2-4 sentences explaining the score, citing specific ways the deliverable does or doesn't meet the spec"
}
Scoring guide:
- 90-100: fully meets the spec, no meaningful gaps
- 70-89: meets the spec with minor gaps or rough edges
- 40-69: partially meets the spec, meaningful gaps a reasonable poster would want addressed
- 0-39: does not meet the spec, or is off-topic/incomplete
Be specific in your reasoning - vague scores erode trust in this system.`;

  const userPrompt = JSON.stringify({ spec, deliverable }, null, 2);

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("OpenRouter response had no content");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  }

  if (!Number.isInteger(parsed.qualityScore) || parsed.qualityScore < 0 || parsed.qualityScore > 100) {
    throw new Error(`invalid qualityScore from model: ${parsed.qualityScore}`);
  }
  if (typeof parsed.reasoning !== "string" || parsed.reasoning.length === 0) {
    throw new Error("missing reasoning from model");
  }

  return parsed;
}
