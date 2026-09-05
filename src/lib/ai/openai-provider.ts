/**
 * OpenAI provider — uses the OpenAI-compatible chat completions REST API.
 *
 * This is the PRIMARY provider. Configuration is read from:
 *   OPENAI_API_KEY        (required)
 *   OPENAI_API_BASE_URL   (optional, defaults to https://api.openai.com/v1)
 *   OPENAI_MODEL          (optional, defaults to gpt-4o)
 */

import {
  AIProvider,
  AIMessage,
  AIRequestOptions,
  AIResponse,
  AIProviderError,
  AIErrorType,
} from "./types";

export class OpenAIProvider implements AIProvider {
  readonly name = "OpenAI";

  private getApiKey(): string {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new AIProviderError(
        "OPENAI_API_KEY is not set",
        this.name,
        AIErrorType.AUTHENTICATION,
      );
    }
    return key;
  }

  private getBaseUrl(): string {
    return process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1";
  }

  private getModel(): string {
    return process.env.OPENAI_MODEL || "gpt-4o";
  }

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async chat(
    messages: AIMessage[],
    options?: AIRequestOptions,
  ): Promise<AIResponse> {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    const model = this.getModel();

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
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
    } catch (error) {
      // Network-level failure (DNS, connection refused, timeout, etc.)
      throw new AIProviderError(
        `OpenAI network error: ${error instanceof Error ? error.message : "unknown"}`,
        this.name,
        AIErrorType.NETWORK,
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const status = response.status;
      throw new AIProviderError(
        `OpenAI request failed (${status})`,
        this.name,
        this.classifyError(status),
        status,
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new AIProviderError(
        "OpenAI returned empty response",
        this.name,
        AIErrorType.UNKNOWN,
      );
    }

    return { content, provider: this.name };
  }

  private classifyError(status: number): AIErrorType {
    if (status === 401 || status === 403) return AIErrorType.AUTHENTICATION;
    if (status === 429) return AIErrorType.RATE_LIMIT;
    if (status >= 500) return AIErrorType.SERVER_ERROR;
    return AIErrorType.UNKNOWN;
  }
}
