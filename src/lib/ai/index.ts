/**
 * AI Provider Manager — handles provider selection and fallback.
 *
 * Selection logic:
 *   1. If OPENAI_API_KEY is set → OpenAI is primary, Gemini is fallback.
 *   2. If only GEMINI_API_KEY is set → Gemini is used directly.
 *   3. If neither is set → clear configuration error.
 *
 * Fallback logic (when OpenAI is primary):
 *   - On recoverable OpenAI failures (auth, rate-limit, server, network),
 *     automatically retry with Gemini if it's configured.
 *   - Non-recoverable errors (programming bugs) are NOT caught — they
 *     propagate as-is so they surface during development.
 */

import {
  AIProvider,
  AIMessage,
  AIRequestOptions,
  AIResponse,
  AIProviderError,
  AIErrorType,
} from "./types";
import { OpenAIProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";

const openai = new OpenAIProvider();
const gemini = new GeminiProvider();

/**
 * Error types that warrant a fallback to another provider.
 * These are provider/API availability issues, not programming bugs.
 */
const RECOVERABLE_ERROR_TYPES = new Set<AIErrorType>([
  AIErrorType.AUTHENTICATION,
  AIErrorType.RATE_LIMIT,
  AIErrorType.SERVER_ERROR,
  AIErrorType.NETWORK,
]);

/**
 * Determine if an error is a recoverable provider failure
 * (as opposed to a programming bug that should not be hidden).
 */
function isRecoverable(error: unknown): boolean {
  if (error instanceof AIProviderError) {
    return RECOVERABLE_ERROR_TYPES.has(error.type);
  }
  // Non-AIProviderError errors (TypeError, ReferenceError, etc.)
  // are programming bugs — do NOT treat them as recoverable.
  return false;
}

/**
 * Send a chat request through the provider abstraction.
 *
 * Automatically selects the primary provider and falls back to the
 * secondary provider on recoverable failures.
 */
export async function aiChat(
  messages: AIMessage[],
  options?: AIRequestOptions,
): Promise<AIResponse> {
  const openaiConfigured = openai.isConfigured();
  const geminiConfigured = gemini.isConfigured();

  if (!openaiConfigured && !geminiConfigured) {
    throw new Error(
      "No AI provider is configured. Set OPENAI_API_KEY or GEMINI_API_KEY.",
    );
  }

  // If only Gemini is configured, use it directly (no fallback).
  if (!openaiConfigured && geminiConfigured) {
    console.log("[AI] OPENAI_API_KEY not configured, using Gemini");
    return gemini.chat(messages, options);
  }

  // OpenAI is configured — use it as primary.
  // (If Gemini is also configured, it serves as fallback.)
  try {
    console.log("[AI] Provider selected: OpenAI");
    return await openai.chat(messages, options);
  } catch (error) {
    if (!isRecoverable(error)) {
      // Programming bug or non-recoverable error — don't hide it.
      throw error;
    }

    if (!geminiConfigured) {
      // No fallback available — rethrow the OpenAI error.
      throw error;
    }

    // Recoverable OpenAI failure — attempt Gemini fallback.
    const providerError = error as AIProviderError;
    console.log(
      `[AI] OpenAI request failed (${providerError.type}), attempting Gemini fallback`,
    );

    try {
      const result = await gemini.chat(messages, options);
      console.log("[AI] Gemini fallback succeeded");
      return result;
    } catch (geminiError) {
      // Both providers failed.
      console.error("[AI] Gemini fallback also failed");
      throw new Error(
        "AI generation failed. OpenAI request failed and Gemini fallback also failed. Check provider configuration and API availability.",
      );
    }
  }
}

/**
 * Check if any AI provider is configured.
 */
export function isAIConfigured(): boolean {
  return openai.isConfigured() || gemini.isConfigured();
}

/**
 * Get the name of the active primary provider (for logging/status).
 */
export function getActiveProviderName(): string {
  if (openai.isConfigured()) return "OpenAI";
  if (gemini.isConfigured()) return "Gemini";
  return "None";
}

export type {
  AIProvider,
  AIMessage,
  AIRequestOptions,
  AIResponse,
  AIProviderError,
  AIErrorType,
} from "./types";
export { OpenAIProvider } from "./openai-provider";
export { GeminiProvider } from "./gemini-provider";
