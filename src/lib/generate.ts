// src/lib/generate.ts

export type GeneratedQuestion = {
  prompt: string;
  choices: string[];
  answerIndex: number; // 0..3
};

/**
 * Simple sentence splitter for local generation fallback
 */
function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Picks top "keywords" from a paragraph using a tiny frequency heuristic.
 */
function pickKeywords(paragraph: string, k = 6): string[] {
  const stop = new Set([
    "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "with",
    "as", "by", "is", "are", "was", "were", "be", "been", "that", "this", "it",
    "at", "from", "which", "into", "than", "then", "so", "such", "these", "those",
    "can", "could", "should", "would", "will", "may", "might", "about", "over",
    "under", "between", "through", "their", "there", "they", "them", "his", "her",
    "its", "we", "you", "your", "our", "us"
  ]);

  const counts = new Map<string, number>();
  for (const w of paragraph.toLowerCase().match(/[a-z][a-z\-']+/g) ?? []) {
    if (stop.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([w]) => w);
}

/**
 * Local/offline generation — quick MCQs from text using heuristics.
 * Useful for demos/tests and totally free.
 */
export function generateQuestionsLocal(
  text: string,
  count = 5
): GeneratedQuestion[] {
  const sentences = splitSentences(text);
  const paragraphs: string[] = [];

  // Build small paragraphs to have some context
  let bucket: string[] = [];
  for (const s of sentences) {
    bucket.push(s);
    if (bucket.join(" ").length > 280) {
      paragraphs.push(bucket.join(" "));
      bucket = [];
    }
  }
  if (bucket.length) paragraphs.push(bucket.join(" "));

  const qs: GeneratedQuestion[] = [];
  const rng = (n: number) => Math.floor(Math.random() * n);

  for (let i = 0; i < count; i++) {
    const para = paragraphs[i % Math.max(1, paragraphs.length)] || text;
    const keywords = pickKeywords(para, 6);
    const topic = keywords[0] ?? "concept";
    const distractors = keywords.slice(1, 4);
    // Guarantee 4 options
    while (distractors.length < 3) {
      const extra = keywords[rng(keywords.length)] ?? "term";
      if (!distractors.includes(extra)) distractors.push(extra);
    }
    const options = [...distractors, topic].sort(() => Math.random() - 0.5);
    const answerIndex = options.indexOf(topic);

    qs.push({
      prompt: `In the context of: "${para.slice(0, 160)}" — which term best fits the topic?`,
      choices: options.map((o) => capitalize(o)),
      answerIndex: Math.max(0, answerIndex),
    });
  }

  return qs;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Truncate big lesson text to a safe prompt size (~40k chars by default).
 */
export function truncateForModel(input: string, limit = 40000): string {
  if (input.length <= limit) return input;
  return input.slice(0, limit);
}

type AiOptions = {
  model?: string; // default gpt-4o-mini
  temperature?: number;
  systemPrompt?: string;
};

/**
 * Generate questions with OpenAI (BYOK).
 * Uses Chat Completions with a strict JSON response format.
 */
export async function generateQuestionsAI(
  text: string,
  count = 5,
  apiKey: string,
  opts: AiOptions = {}
): Promise<GeneratedQuestion[]> {
  if (!apiKey || !apiKey.startsWith("sk-")) {
    throw new Error("Invalid OpenAI API key. Paste a valid 'sk-...' key.");
  }

  const model = opts.model ?? "gpt-4o-mini";
  const temperature = opts.temperature ?? 0.2;

  const lesson = truncateForModel(text);

  const system =
    opts.systemPrompt ??
    "You are an assistant that writes multiple-choice questions. " +
      "Return STRICT JSON ONLY with no extra text.";

  const user = `
Create ${count} multiple-choice questions from the following lesson content.

Rules:
- Each question must have exactly 4 choices.
- Provide an integer 'answerIndex' (0..3) for the correct choice.
- Choices must be concise.
- Use the exact JSON schema below.

Schema (JSON only):
{
  "questions": [
    {
      "prompt": "string",
      "choices": ["string", "string", "string", "string"],
      "answerIndex": 0
    }
  ]
}

Lesson:
"""${lesson}"""
`;

  const body = {
    model,
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const textErr = await res.text().catch(() => "");
    throw new Error(
      `OpenAI error (${res.status}): ${textErr || res.statusText}`
    );
  }

  type ChatResponse = {
    choices: { message: { content: string } }[];
  };

  const data = (await res.json()) as ChatResponse;
  const content = data.choices?.[0]?.message?.content ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // sometimes the model may wrap JSON in code fences; try to strip
    const match = content.match(/```json\s*([\s\S]*?)```/i);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      throw new Error("AI did not return valid JSON.");
    }
  }

  const out: GeneratedQuestion[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (parsed as any)?.questions?.map((q: any) => ({
      prompt: String(q.prompt ?? "").trim(),
      choices: Array.isArray(q.choices)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? q.choices.map((c: any) => String(c))
        : [],
      answerIndex: Number(q.answerIndex ?? 0),
    })) ?? [];

  // Basic validation / repair
  const fixed = out
    .filter(
      (q) =>
        q.prompt &&
        Array.isArray(q.choices) &&
        q.choices.length === 4 &&
        Number.isFinite(q.answerIndex)
    )
    .map((q) => ({
      ...q,
      answerIndex: Math.min(3, Math.max(0, Math.round(q.answerIndex))),
    }));

  if (!fixed.length) {
    throw new Error("AI returned no valid questions.");
  }

  // If the model returned more than requested, slice
  return fixed.slice(0, count);
}
