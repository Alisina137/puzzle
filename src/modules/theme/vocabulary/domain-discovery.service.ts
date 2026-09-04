import { AIService } from "./ai-service";
import {
  DomainMetadata,
  ThemeDomainDiscovery,
  DomainRichness,
} from "../domain/domain.types";

/**
 * Domain Discovery Service — Prompt 1.
 *
 * Given a theme name, discovers 30-50 meaningful sub-domains.
 * Does NOT generate vocabulary — only domain metadata.
 */

const DISCOVERY_SYSTEM_PROMPT = `You are a vocabulary domain expert. Your task is to discover meaningful sub-domains for a given theme. You return ONLY valid JSON. Do not include any explanation outside the JSON.`;

const DISCOVERY_USER_TEMPLATE = (theme: string) => `Given the theme "${theme}", discover approximately 30-50 meaningful sub-domains that cover the theme comprehensively.

The exact number should be based on the vocabulary richness of the theme. A broad theme like "Sports" might have 40 domains; a narrower theme might have fewer.

Each domain must include:
- id: sequential integer starting from 1
- name: the domain name (e.g., "Water Sports")
- description: a description of what vocabulary the domain covers
- richness: one of "VERY_HIGH", "HIGH", "MEDIUM", "LOW" — how vocabulary-rich this domain is
- priority: 1-5 (5 = highest priority, most essential to the theme)
- generationFocus: an array of 3-6 specific focus areas for vocabulary generation within this domain

Return JSON in this exact format:
{
  "theme": "${theme}",
  "domains": [
    {
      "id": 1,
      "name": "Water Sports",
      "description": "Vocabulary covering sports performed in or on water...",
      "richness": "VERY_HIGH",
      "priority": 5,
      "generationFocus": ["swimming disciplines", "diving", "rowing", "sailing"]
    }
  ]
}

Ensure domains are diverse and non-overlapping. Cover the theme comprehensively.`;

export class DomainDiscoveryService {
  /**
   * Discover domains for a theme (Prompt 1).
   * Returns domain metadata only — no vocabulary.
   */
  static async discoverDomains(theme: string): Promise<ThemeDomainDiscovery> {
    const result = await AIService.chatJSON<ThemeDomainDiscovery>(
      [
        { role: "system", content: DISCOVERY_SYSTEM_PROMPT },
        { role: "user", content: DISCOVERY_USER_TEMPLATE(theme) },
      ],
      { temperature: 0.7, maxTokens: 8192 },
    );

    // Validate and normalize
    if (!result.domains || !Array.isArray(result.domains)) {
      throw new Error("Domain discovery returned invalid response: missing domains array");
    }

    // Ensure each domain has required fields
    result.domains = result.domains.map((d, i) => ({
      id: d.id ?? i + 1,
      name: d.name ?? `Domain ${i + 1}`,
      description: d.description ?? "",
      richness: (["VERY_HIGH", "HIGH", "MEDIUM", "LOW"].includes(d.richness)
        ? d.richness
        : "MEDIUM") as DomainRichness,
      priority: d.priority ?? 3,
      generationFocus: Array.isArray(d.generationFocus) ? d.generationFocus : [],
    }));

    return result;
  }
}
