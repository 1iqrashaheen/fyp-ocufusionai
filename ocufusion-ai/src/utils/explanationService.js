const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";
// const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_BASE_URL = (
  import.meta.env.VITE_OPENAI_BASE_URL || "https://api.openai.com/v1"
).replace(/\/$/, "");
const EXPLANATION_PROXY = (import.meta.env.VITE_EXPLANATION_PROXY || "").trim();

export function isExplanationConfigured() {
  return Boolean(EXPLANATION_PROXY || OPENAI_API_KEY);
}

export async function generateResultExplanation(summary) {
  const hasContent =
    summary &&
    ((Array.isArray(summary.individual) && summary.individual.length > 0) ||
      (Array.isArray(summary.combined) && summary.combined.length > 0));

  if (!hasContent) {
    return "";
  }

  if (EXPLANATION_PROXY) {
    return callProxy(summary);
  }

  if (!OPENAI_API_KEY) {
    throw new Error(
      "Explanation API is not configured. Set VITE_OPENAI_API_KEY in your .env file."
    );
  }

  return callOpenAI(summary);
}

async function callProxy(summary) {
  const response = await fetch(EXPLANATION_PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summary }),
  });

  let payload = null;
  let fallbackText = "";
  try {
    payload = await response.json();
  } catch (error) {
    fallbackText = await response.text().catch(() => "");
  }

  if (!response.ok) {
    throw new Error(
      payload?.error || fallbackText || "Explanation proxy error"
    );
  }

  if (!payload && fallbackText) {
    return fallbackText.trim();
  }

  const text =
    payload?.explanation ||
    payload?.text ||
    payload?.message ||
    payload?.result ||
    fallbackText;

  if (!text || typeof text !== "string") {
    throw new Error("Explanation proxy returned an empty response.");
  }

  return text.trim();
}

async function callOpenAI(summary) {
  const endpoint = `${OPENAI_BASE_URL}/chat/completions`;
  const systemPrompt =
    "You are an ophthalmology assistant. Explain OCT and fundus AI predictions in accessible language, mention confidence and agreement if available, and remind the reader to consult an eye specialist.";
  const userContent = `Summarize these predictions in <= 180 words:\n${JSON.stringify(
    summary
  )}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.35,
      max_tokens: 360,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    const message =
      payload?.error?.message ||
      `OpenAI API returned status ${response.status}.`;
    throw new Error(message);
  }

  const text =
    payload?.choices?.[0]?.message?.content?.trim() ||
    payload?.choices?.[0]?.text?.trim();

  if (!text) {
    throw new Error("OpenAI API returned an empty explanation.");
  }

  return text;
}
