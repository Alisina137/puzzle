export interface TitleSuggestionInput {
  theme: string;
  difficultyLevel: string;
  targetAudience: string;
  puzzleCount: number;
}

const SYSTEM_PROMPT =
  "You are a book title generator for Amazon KDP puzzle books. " +
  "Given the book's details, generate exactly 5 distinct, marketable title " +
  "options. Titles should be catchy, clear, and appropriate for KDP search " +
  "discoverability (include relevant keywords like the theme and puzzle " +
  "count where it reads naturally). Avoid punctuation gimmicks or quotes " +
  "around the titles themselves. " +
  "Respond with ONLY a raw JSON array of 5 strings — no markdown code " +
  "fences, no preamble, no explanation. Example format: " +
  '["Title One", "Title Two", "Title Three", "Title Four", "Title Five"]';

function buildUserPrompt(input: TitleSuggestionInput): string {
  return (
    `Theme: ${input.theme}\n` +
    `Difficulty: ${input.difficultyLevel}\n` +
    `Target audience: ${input.targetAudience}\n` +
    `Number of puzzles: ${input.puzzleCount}`
  );
}

/**
 * Strips markdown code fences and any stray text around a JSON array,
 * since LLMs occasionally wrap output in ```json fences even when told
 * not to, or add a stray leading/trailing sentence.
 */
function extractJsonArray(raw: string): string[] {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Response did not contain a JSON array");
  }
  text = text.slice(start, end + 1);

  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed) || !parsed.every((t) => typeof t === "string")) {
    throw new Error("Parsed JSON was not an array of strings");
  }
  return parsed;
}

/**
 * Groq's API is OpenAI-compatible — same chat completions shape, just a
 * different base URL and model names.
 */
async function callGroq(input: TitleSuggestionInput): Promise<string[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) },
        ],
        temperature: 0.9,
        max_tokens: 400,
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq response had no content");

  const titles = extractJsonArray(content);
  if (titles.length === 0) throw new Error("Groq returned zero titles");
  return titles.slice(0, 5);
}

async function callGemini(input: TitleSuggestionInput): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(input)}` }],
          },
        ],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 400,
        },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Gemini response had no content");

  const titles = extractJsonArray(content);
  if (titles.length === 0) throw new Error("Gemini returned zero titles");
  return titles.slice(0, 5);
}

export class TitleSuggestionService {
  /**
   * Tries Groq first (primary), falls back to Gemini if Groq fails for
   * any reason (missing key, rate limit, network error, malformed
   * response). Throws only if BOTH providers fail, so the route layer
   * can return a single clear error to the frontend.
   */
  static async suggestTitles(
    input: TitleSuggestionInput,
  ): Promise<{ titles: string[]; provider: "groq" | "gemini" }> {
    try {
      const titles = await callGroq(input);
      return { titles, provider: "groq" };
    } catch (groqError: any) {
      console.warn(
        "[TitleSuggestion] Groq failed, falling back to Gemini:",
        groqError.message,
      );
      try {
        const titles = await callGemini(input);
        return { titles, provider: "gemini" };
      } catch (geminiError: any) {
        console.error(
          "[TitleSuggestion] Gemini also failed:",
          geminiError.message,
        );
        throw new Error(
          "Both title suggestion providers failed. " +
            `Groq: ${groqError.message}. Gemini: ${geminiError.message}`,
        );
      }
    }
  }
}
