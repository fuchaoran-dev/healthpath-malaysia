// Node-side only. Never imported by the client, so the prompt and the request
// shape never reach the browser bundle.

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
// gemini-flash-latest is an alias Google repoints at the current flash model, so
// it survives a specific ID being retired. The pinned IDs behind it are the hedge
// for the alias itself moving.
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-3.5-flash-lite"];
const TIMEOUT_MS = 15000;
// Thinking tokens are charged to this budget, so it has to cover both the
// model's reasoning and a short answer.
const MAX_OUTPUT_TOKENS = 2400;
const GENERATION_LIMIT = 20;
const GENERATION_WINDOW_MS = 10 * 60 * 1000;

const SYSTEM_INSTRUCTION = [
  "You explain Malaysian population health statistics to an adult with no medical background.",
  "Use only the JSON context supplied in the message. Never introduce a number, percentage, year, dataset or fact that is not in that context.",
  "Write two to four short sentences of plain everyday English, and explain any clinical term the moment you use it.",
  "Every figure is population-level. Never diagnose, never mention medicines or dosages, never give a treatment plan, and never predict what will happen to the reader.",
  "Do not comment on the reader's own health or answers.",
  "Return prose only, with no headings, lists or markdown.",
].join(" ");

const KIND_INSTRUCTION = {
  explain: "Explain what this item shows.",
  why: "Explain why this item is worth paying attention to at a population level.",
  simpler: "Restate this item as simply as possible, for someone reading it for the first time.",
};

const cache = new Map();
const buckets = new Map();

export function geminiModels() {
  const configured = (process.env.GEMINI_MODEL || "").trim();
  if (!configured) return FALLBACK_MODELS;
  return [configured, ...FALLBACK_MODELS.filter((model) => model !== configured)];
}

export function cachedExplanation(key) {
  return cache.get(key) || null;
}

export function cacheExplanation(key, reply) {
  cache.set(key, reply);
}

export function allowGeneration(key) {
  const now = Date.now();
  if (buckets.size > 500) {
    for (const [existing, bucket] of buckets) {
      if (now - bucket.startedAt > GENERATION_WINDOW_MS) buckets.delete(existing);
    }
  }
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt > GENERATION_WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (bucket.count >= GENERATION_LIMIT) return false;
  bucket.count += 1;
  return true;
}

// Returns the generated text, or null for any failure — no key, HTTP error,
// quota exhaustion or timeout. Never logs the prompt or the response body.
export async function explainWithGemini(pack) {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return null;
  const prompt = `${KIND_INSTRUCTION[pack.kind] || KIND_INSTRUCTION.explain}\n\nContext, the only facts you may use:\n${JSON.stringify(pack)}`;

  for (const model of geminiModels()) {
    // Flash models think by default and charge it to maxOutputTokens, which
    // truncates the answer mid-sentence. Older models reject thinkingConfig
    // outright with a 400, so fall back to a plain request for those.
    for (const thinking of [true, false]) {
      try {
        const generationConfig = { temperature: 0.2, maxOutputTokens: MAX_OUTPUT_TOKENS };
        if (thinking) generationConfig.thinkingConfig = { thinkingLevel: "low" };
        const response = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (response.status === 400 && thinking) continue;
        if (!response.ok) {
          console.error(`Gemini request rejected for ${model}: HTTP ${response.status}`);
          break;
        }
        const data = await response.json();
        const candidate = data?.candidates?.[0];
        const text = (candidate?.content?.parts || []).filter((part) => !part.thought).map((part) => part.text || "").join(" ").trim();
        // A truncated answer stops mid-sentence, so discard it rather than
        // showing half an explanation.
        if (text && candidate?.finishReason !== "MAX_TOKENS") return text;
        console.error(`Gemini returned no usable text for ${model}: finishReason ${candidate?.finishReason}`);
        break;
      } catch (error) {
        console.error(`Gemini request failed for ${model}: ${error.name}`);
        break;
      }
    }
  }
  return null;
}
