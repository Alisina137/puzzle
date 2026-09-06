/**
 * AI Service — thin wrapper over the provider abstraction.
 *
 * This was previously a direct OpenAI client. It now delegates to
 * src/lib/ai (the provider manager) which handles:
 *   - Provider selection (OpenAI primary, Gemini fallback)
 *   - Automatic fallback on recoverable OpenAI failures
 *   - JSON parsing
 *
 * The three vocabulary-generation services (Prompt 1, 2, 3) call
 * AIService.chat() and AIService.chatJSON() — they are unchanged.
 */

import {
  aiChat,
  isAIConfigured,
  getActiveProviderName,
  AIMessage,
  AIResponse,
} from "@/lib/ai";

export type { AIMessage, AIResponse };

export class AIService {
  /**
   * Send a chat completion request through the provider abstraction.
   * The provider manager handles selection and fallback automatically.
   */
  static async chat(messages: AIMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<AIResponse> {
    return aiChat(messages, options);
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
   * Falls back to truncated-JSON repair when the response was cut off
   * mid-generation (e.g. due to maxTokens limits).
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
        try {
          const extracted = jsonStr.substring(firstBrace, lastBrace + 1);
          return JSON.parse(extracted);
        } catch {
          // continue to repair below
        }
      }

      // Last resort: attempt to repair truncated JSON
      if (firstBrace !== -1) {
        try {
          const repaired = this.repairTruncatedJSON(
            jsonStr.substring(firstBrace),
          );
          return JSON.parse(repaired);
        } catch {
          // repair also failed
        }
      }

      throw new Error(
        `Failed to parse AI response as JSON: ${content.substring(0, 200)}`,
      );
    }
  }

  /**
   * Attempt to repair truncated JSON by closing open structures.
   *
   * When an AI response is cut off mid-generation (token limit), the JSON
   * is incomplete. This method tracks bracket/brace depth (accounting for
   * strings) and closes any open structures so the partial data is still
   * usable. It also handles mid-string truncation and trailing commas.
   */
  private static repairTruncatedJSON(text: string): string {
    let result = text;

    // Track depth of brackets and braces, accounting for strings
    let inString = false;
    let escape = false;
    const stack: ("[" | "{")[] = [];

    for (let i = 0; i < result.length; i++) {
      const char = result[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (char === "\\" && inString) {
        escape = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === "[" || char === "{") {
        stack.push(char);
      } else if (char === "]" || char === "}") {
        stack.pop();
      }
    }

    // If truncated mid-string, close the string
    if (inString) {
      result += '"';
    }

    // Remove trailing comma or whitespace before closing
    result = result.replace(/[\s,]+$/, "");

    // Close open structures in reverse order
    while (stack.length > 0) {
      const open = stack.pop();
      result += open === "[" ? "]" : "}";
    }

    return result;
  }

  /**
   * Check if any AI provider is configured (OpenAI or Gemini).
   */
  static isConfigured(): boolean {
    return isAIConfigured();
  }

  /**
   * Get the name of the active primary provider (for status/logging).
   */
  static getActiveProvider(): string {
    return getActiveProviderName();
  }
}
