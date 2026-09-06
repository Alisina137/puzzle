import { AIService } from "./ai-service";
import {
  DomainMetadata,
  RawDomainVocabulary,
} from "../domain/domain.types";

/**
 * Vocabulary Generation Service — Prompt 2.
 *
 * Given a theme and ONE domain, generates raw candidate vocabulary.
 * Runs independently for each domain. Does NOT combine domains.
 * Does NOT classify difficulty — only produces raw candidates.
 */

const GENERATION_SYSTEM_PROMPT = `You are a vocabulary expert. Your task is to generate a comprehensive list of candidate words for a specific domain within a theme. You return ONLY valid JSON. Do not include any explanation outside the JSON.`;

const GENERATION_USER_TEMPLATE = (
  theme: string,
  domain: DomainMetadata,
) => `Theme: "${theme}"
Domain: "${domain.name}"
Description: ${domain.description}
Generation Focus: ${domain.generationFocus.join(", ")}

Generate a comprehensive list of 250-400 candidate words for this domain. Include:
- Common terms
- Technical terms
- Equipment names
- Techniques
- Places
- People roles
- Events
- Concepts

Rules:
- Words should be relevant to the domain "${domain.name}" within the theme "${theme}"
- Include a mix of easy, medium, and hard words
- Do NOT include phrases with spaces — only single words
- Do NOT include numbers or special characters
- Aim for variety and completeness

Return JSON in this exact format:
{
  "theme": "${theme}",
  "subtheme": "${domain.name}",
  "candidates": ["WORD1", "WORD2", "WORD3"]
}`;

export class VocabularyGenerationService {
  /**
   * Generate raw vocabulary for a single domain (Prompt 2).
   * Each domain is processed independently.
   */
  static async generateDomainVocabulary(
    theme: string,
    domain: DomainMetadata,
  ): Promise<RawDomainVocabulary> {
    const result = await AIService.chatJSON<RawDomainVocabulary>(
      [
        { role: "system", content: GENERATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: GENERATION_USER_TEMPLATE(theme, domain),
        },
      ],
      { temperature: 0.8, maxTokens: 8192 },
    );

    if (!result.candidates || !Array.isArray(result.candidates)) {
      throw new Error(
        `Vocabulary generation for domain "${domain.name}" returned invalid response: missing candidates array`,
      );
    }

    return {
      theme,
      subtheme: domain.name,
      candidates: result.candidates,
    };
  }
}
