/**
 * Google Gemini provider — uses the Gemini REST API (generateContent).
 *
 * This is the FALLBACK provider. Configuration is read from:
 *   GEMINI_API_KEY   (required)
 *   GEMINI_MODEL     (optional, defaults to gemini-2.0-flash)
 *
 * Gemini's REST API uses a different message format than OpenAI.
 * This provider translates AIMessage[] into Gemini's format internally,
 * so the rest of the application never needs to know about Gemini's API.
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

export class GeminiProvider implements AIProvider {
  readonly name = "Gemini";

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
    return process.env.GEMINI_MODEL || "gemini-2.0-flash";
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

    // Convert AIMessage[] to Gemini format.
    // Gemini uses "user" and "model" roles and does not have a "system" role.
    // We merge system messages into the first user message as a prefix,
    // which is the recommended approach for Gemini.
    const { systemText, conversation } = this.convertMessages(messages);

    const body: Record<string, unknown> = {
      contents: conversation,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 4096,
        responseMimeType: "application/json",
      },
    };

    if (systemText) {
      body.systemInstruction = {
        parts: [{ text: systemText }],
      };
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new AIProviderError(
        `Gemini network error: ${error instanceof Error ? error.message : "unknown"}`,
        this.name,
        AIErrorType.NETWORK,
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const status = response.status;
      throw new AIProviderError(
        `Gemini request failed (${status})`,
        this.name,
        this.classifyError(status),
        status,
      );
    }

    const data = (await response.json()) as GeminiResponse;

    // Check for blocked prompts
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
