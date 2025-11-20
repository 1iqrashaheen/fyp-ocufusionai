// const GEMINI_API_KEY =
//   import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || "";
// const GEMINI_MODEL =
//   import.meta.env.VITE_GEMINI_MODEL ||
//   import.meta.env.GEMINI_MODEL ||
//   "gemini-2.5-flash";
// const GEMINI_BASE_URL = (
//   import.meta.env.VITE_GEMINI_BASE_URL ||
//   import.meta.env.GEMINI_BASE_URL ||
//   "https://generativelanguage.googleapis.com/v1beta"
// ).replace(/\/$/, "");

// const SYSTEM_PROMPT =
//   "You are a professional ophthalmology assistant. Produce a single patient-friendly paragraph (<=90 words) describing the AI results, mention confidence/agreement when available, and remind the reader that only an eye specialist can confirm the diagnosis.";
// const TEMPERATURE = 0.2;

// export function isExplanationConfigured() {
//   return Boolean(GEMINI_API_KEY);
// }

// export async function fetchReportExplanation(reportPayload) {
//   const hasResults =
//     reportPayload &&
//     ((Array.isArray(reportPayload.individual) &&
//       reportPayload.individual.length > 0) ||
//       (Array.isArray(reportPayload.combined) &&
//         reportPayload.combined.length > 0));

//   if (!hasResults) {
//     return "";
//   }

//   if (!GEMINI_API_KEY) {
//     throw new Error(
//       "Gemini API key not found. Please set VITE_GEMINI_API_KEY (or GEMINI_API_KEY) in your .env file."
//     );
//   }

//   const prompt = buildPrompt(reportPayload);
//   const body = {
//     systemInstruction: {
//       role: "system",
//       parts: [{ text: SYSTEM_PROMPT }],
//     },
//     contents: [
//       {
//         role: "user",
//         parts: [{ text: prompt }],
//       },
//     ],
//     generationConfig: {
//       temperature: TEMPERATURE,
//     },
//   };

//   const response = await fetch(
//     `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent`,
//     {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-goog-api-key": GEMINI_API_KEY,
//       },
//       body: JSON.stringify(body),
//     }
//   );

//   const payload = await response.json().catch(() => null);
//   if (!response.ok || !payload) {
//     const message =
//       payload?.error?.message ||
//       `Gemini API returned status ${response.status}.`;
//     throw new Error(message);
//   }

//   const explanation =
//     payload?.candidates?.[0]?.content?.parts
//       ?.map((part) => part.text || "")
//       .join("")
//       .trim() || "";

//   if (!explanation) {
//     throw new Error("Gemini API returned an empty explanation.");
//   }

//   return explanation;
// }

// function buildPrompt(reportPayload) {
//   const lines = [
//     "Use the following JSON data to craft a short explanation of the AI results.",
//     "Focus on the key findings, describe how confident the AI is, mention agreement between OCT and fundus when present, and remind the patient to consult their doctor.",
//     `Report generated at: ${reportPayload.generatedAt || "unknown time"}`,
//     "JSON data:",
//     JSON.stringify(
//       {
//         combined: reportPayload.combined || [],
//         individual: reportPayload.individual || [],
//       },
//       null,
//       2
//     ),
//   ];
//   return lines.join("\n");
// }
