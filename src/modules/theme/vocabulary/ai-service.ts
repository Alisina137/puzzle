/**
 * Generic AI service for LLM-based vocabulary generation.
 *
 * Uses an OpenAI-compatible chat completions API.
 * The API key is read from the OPENAI_API_KEY environment variable.
 */

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
}

export class AIService {
  private static getApiKey(): string {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error(
        "OPENAI_API_KEY is not set. Cannot generate vocabulary via AI.",
      );
    }
    return key;
  }

  private static getBaseUrl(): string {
    return process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1";
  }

  private static getModel(): string {
    return process.env.OPENAI_MODEL || "gpt-4o";
  }

  /**
   * Send a chat completion request and return the assistant's response content.
   */
  static async chat(messages: AIMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<AIResponse> {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    const model = this.getModel();

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `AI API request failed (${response.status}): ${errorText}`,
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI API returned empty response");
    }

    return { content };
  }

  /**
   * Send a chat completion request and parse the response as JSON.
   * Extracts JSON from markdown code blocks if present.
   */
  static async chatJSON<T>(messages: AIMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<T> {
    const response = await this.chat(messages, options);
    return this.parseJSON<T>(response.content);
  }

  /**
   * Parse JSON from a string that may contain markdown code blocks.
   */
  private static parseJSON<T>(content: string): T {
    // Try to extract JSON from markdown code block
    const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = codeBlockMatch ? codeBlockMatch[1] : content;

    // Try direct parse
    try {
      return JSON.parse(jsonStr.trim());
    } catch {
      // Try to find the first { and last } as a fallback
      const firstBrace = jsonStr.indexOf("{");
      const lastBrace = jsonStr.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        const extracted = jsonStr.substring(firstBrace, lastBrace + 1);
        return JSON.parse(extracted);
      }
      throw new Error(`Failed to parse AI response as JSON: ${content.substring(0, 200)}`);
    }
  }

  /**
   * Check if the AI service is configured (API key present).
   */
  static isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}
