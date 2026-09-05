/**
 * AI Provider abstraction types.
 *
 * All vocabulary-generation services interact with AI through this interface,
 * so the underlying provider (OpenAI, Gemini, or future providers) can be
 * swapped without touching prompt logic.
 */

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequestOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  provider: string;
}

/**
 * A single AI provider (OpenAI, Gemini, etc.).
 */
export interface AIProvider {
  readonly name: string;
  isConfigured(): boolean;
  chat(messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse>;
}

/**
 * Error types used to classify whether a failure is recoverable
 * (and thus eligible for fallback to another provider).
 */
export enum AIErrorType {
  AUTHENTICATION = "authentication",
  RATE_LIMIT = "rate_limit",
  SERVER_ERROR = "server_error",
  NETWORK = "network",
  UNKNOWN = "unknown",
}

/**
 * Error thrown by a provider when a request fails.
 * The `type` field lets the manager decide whether to attempt fallback.
 */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly type: AIErrorType,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
