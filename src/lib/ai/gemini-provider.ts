/**
 * Google Gemini provider — uses the Gemini REST API (generateContent).
 *
 * This is the FALLBACK provider. Configuration is read from:
 *   GEMINI_API_KEY   (required)
 *   GEMINI_MODEL     (optional, defaults to gemini-2.5-flash)
 *
 * Gemini's REST API uses a different message format than OpenAI.
 * This provider translates AIMessage[] into Gemini's format internally,
 * so the rest of the application never needs to know about Gemini's API.
 *
 * Includes rate limiting and automatic retry on 429 (rate limit) errors,
 * since the Gemini free tier has strict RPM limits.
 */

import {
  AIProvider,
  AIMessage,
  AIRequestOptions,
  AIResponse,
  AIProviderError,
  AIErrorType,
} from "./types";

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}

/** Minimum gap between consecutive Gemini requests (ms). ~8 RPM. */
const MIN_REQUEST_INTERVAL_MS = 7000;

/** Max retry attempts on 429 rate-limit errors. */
const MAX_RATE_LIMIT_RETRIES = 4;

/** Base wait time for 429 retry backoff (ms). */
const RATE_LIMIT_RETRY_BASE_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiProvider implements AIProvider {
  readonly name = "Gemini";

  /** Timestamp of the last Gemini API request (ms since epoch). */
  private static lastRequestTime = 0;

  private getApiKey(): string {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new AIProviderError(
        "GEMINI_API_KEY is not set",
        this.name,
        AIErrorType.AUTHENTICATION,
      );
    }
    return key;
  }

  private getModel(): string {
    return process.env.GEMINI_MODEL || "gemini-2.5-flash";
  }

  isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  async chat(
    messages: AIMessage[],
    options?: AIRequestOptions,
  ): Promise<AIResponse> {
    const apiKey = this.getApiKey();
    const model = this.getModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const { systemText, conversation } = this.convertMessages(messages);

    const body: Record<string, unknown> = {
      contents: conversation,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 4096,
        responseMimeType: "application/json",
        // Gemini 2.5+ models use "thinking" tokens that count against
        // maxOutputTokens, leaving little room for actual output.
        // Disable thinking to ensure the full token budget is available
        // for the response. The vocabulary prompts are well-structured
        // and do not require complex reasoning.
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    if (systemText) {
      body.systemInstruction = {
        parts: [{ text: systemText }],
      };
    }

    const bodyJson = JSON.stringify(body);

    // Retry loop for 429 rate-limit errors
    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
      // Enforce minimum interval between requests
      await this.enforceRateLimit();

      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyJson,
        });
      } catch (error) {
        throw new AIProviderError(
          `Gemini network error: ${error instanceof Error ? error.message : "unknown"}`,
          this.name,
          AIErrorType.NETWORK,
        );
      }

      GeminiProvider.lastRequestTime = Date.now();

      // On 429, wait and retry
      if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
        const waitMs = RATE_LIMIT_RETRY_BASE_MS * (attempt + 1);
        console.log(
          `[AI] Gemini rate limited (429), retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})`,
        );
        await sleep(waitMs);
        continue;
      }

      if (!response.ok) {
        const status = response.status;
        throw new AIProviderError(
          `Gemini request failed (${status})`,
          this.name,
          this.classifyError(status),
          status,
        );
      }

      const data = (await response.json()) as GeminiResponse;

      if (data.promptFeedback?.blockReason) {
        throw new AIProviderError(
          `Gemini prompt blocked: ${data.promptFeedback.blockReason}`,
          this.name,
          AIErrorType.UNKNOWN,
        );
      }

      const content = data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join("");

      if (!content) {
        throw new AIProviderError(
          "Gemini returned empty response",
          this.name,
          AIErrorType.UNKNOWN,
        );
      }

      return { content, provider: this.name };
    }

    // Should not reach here, but TypeScript needs a return
    throw new AIProviderError(
      "Gemini request failed after rate-limit retries",
      this.name,
      AIErrorType.RATE_LIMIT,
      429,
    );
  }

  /**
   * Ensure at least MIN_REQUEST_INTERVAL_MS has passed since the last request.
   */
  private async enforceRateLimit(): Promise<void> {
    const elapsed = Date.now() - GeminiProvider.lastRequestTime;
    const remaining = MIN_REQUEST_INTERVAL_MS - elapsed;
    if (remaining > 0) {
      await sleep(remaining);
    }
  }

  /**
   * Convert OpenAI-style messages to Gemini format.
   * Extracts system messages (which Gemini doesn't support as a role)
   * and merges them into a systemInstruction.
   */
  private convertMessages(messages: AIMessage[]): {
    systemText: string;
    conversation: GeminiContent[];
  } {
    const systemParts: string[] = [];
    const conversation: GeminiContent[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemParts.push(msg.content);
      } else {
        conversation.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    return {
      systemText: systemParts.join("\n\n"),
      conversation,
    };
  }

  private classifyError(status: number): AIErrorType {
    if (status === 401 || status === 403) return AIErrorType.AUTHENTICATION;
    if (status === 429) return AIErrorType.RATE_LIMIT;
    if (status >= 500) return AIErrorType.SERVER_ERROR;
    return AIErrorType.UNKNOWN;
  }
}
