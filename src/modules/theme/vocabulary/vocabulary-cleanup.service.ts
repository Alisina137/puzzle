import { AIService } from "./ai-service";
import {
  RawDomainVocabulary,
  DomainVocabulary,
  DomainMetadata,
  DomainVocabularyStatistics,
} from "../domain/domain.types";

/**
 * Vocabulary Cleanup & Classification Service — Prompt 3.
 *
 * Processes ONE raw domain at a time:
 *   1. Parse candidates
 *   2. Normalize (uppercase, remove spaces/hyphens/apostrophes/punctuation/numbers)
 *   3. Keep only A-Z, 3-20 letters
 *   4. Remove duplicates and normalization collisions
 *   5. Remove invalid/weak/cross-domain/artificial/generic words
 *   6. Classify remaining words as SIMPLE, INTERMEDIATE, or HARD
 *
 * Target distribution: 25% SIMPLE, 35% INTERMEDIATE, 40% HARD
 * (but never invent or misclassify words to meet the ratio)
 */

const CLEANUP_SYSTEM_PROMPT = `You are a vocabulary cleaning and classification expert. Your task is to clean, validate, and classify a raw word list for a specific domain. You return ONLY valid JSON. Do not include any explanation outside the JSON.`;

const CLEANUP_USER_TEMPLATE = (
  raw: RawDomainVocabulary,
  domain: DomainMetadata,
) => `Theme: "${raw.theme}"
Domain: "${raw.subtheme}"
Domain Description: ${domain.description}

Raw candidates (${raw.candidates.length} words):
${JSON.stringify(raw.candidates)}

Clean and classify these words. For each word:
1. Normalize: convert to UPPERCASE, remove spaces, hyphens, apostrophes, punctuation, numbers
2. Keep only A-Z letters
3. Reject words with fewer than 3 letters or more than 20 letters
4. Remove exact duplicates and normalization collisions (words that become identical after normalization)
5. Remove misspellings, invented terminology, artificial compounds, generic filler, and weakly related vocabulary
6. Remove cross-domain contamination (words that don't belong to "${raw.subtheme}")
7. Preserve legitimate domain-specific vocabulary
8. Classify every remaining word as "simple", "intermediate", or "hard"

Classification guidelines:
- SIMPLE: short, common, well-known words (3-7 letters typically)
- INTERMEDIATE: moderately complex words, known to most adults (6-12 letters typically)
- HARD: complex, specialized, or uncommon words (8-20 letters typically)

Target: at least 150 final unique words. Be conservative when removing words — only remove clearly invalid, misspelled, or completely unrelated words. Preserve as much legitimate domain-specific vocabulary as possible to reach the target.
Target distribution: 25% simple, 35% intermediate, 40% hard
But NEVER invent words or intentionally misclassify to meet the ratio. Classify by genuine difficulty.

Return JSON in this EXACT format:
{
  "theme": "${raw.theme}",
  "subtheme": "${raw.subtheme}",
  "statistics": {
    "rawCandidates": ${raw.candidates.length},
    "duplicatesRemoved": 0,
    "normalizationCollisions": 0,
    "invalidWordsRemoved": 0,
    "weakThemeWordsRemoved": 0,
    "crossDomainWordsRemoved": 0,
    "artificialCompoundsRemoved": 0,
    "genericFillerRemoved": 0,
    "lengthRejected": 0,
    "finalSimple": 0,
    "finalIntermediate": 0,
    "finalHard": 0,
    "totalFinalUniqueWords": 0
  },
  "words": {
    "simple": [],
    "intermediate": [],
    "hard": []
  }
}

The statistics must accurately reflect the cleaning process. finalSimple = words.simple.length, finalIntermediate = words.intermediate.length, finalHard = words.hard.length, totalFinalUniqueWords = sum of all three.`;

export class VocabularyCleanupService {
  /**
   * Clean and classify raw vocabulary for a single domain (Prompt 3).
   * Processes ONE domain at a time.
   */
  static async cleanupAndClassify(
    raw: RawDomainVocabulary,
    domain: DomainMetadata,
  ): Promise<DomainVocabulary> {
    // First, do local normalization to help the AI
    const normalized = this.normalizeCandidates(raw.candidates);

    const normalizedRaw: RawDomainVocabulary = {
      ...raw,
      candidates: normalized,
    };

    const result = await AIService.chatJSON<DomainVocabulary>(
      [
        { role: "system", content: CLEANUP_SYSTEM_PROMPT },
        {
          role: "user",
          content: CLEANUP_USER_TEMPLATE(normalizedRaw, domain),
        },
      ],
      { temperature: 0.3, maxTokens: 8192 },
    );

    // Post-process: enforce local validation on the AI's output
    return this.validateAndFixResult(result, raw);
  }

  /**
   * Local normalization of candidates before sending to AI.
   */
  private static normalizeCandidates(candidates: string[]): string[] {
    return candidates
      .map((word) =>
        word
          .trim()
          .toUpperCase()
          .replace(/['']/g, "")
          .replace(/[^A-Z]/g, ""),
      )
      .filter((word) => word.length >= 3 && word.length <= 20);
  }

  /**
   * Validate and fix the AI's output to ensure it meets the spec.
   */
  private static validateAndFixResult(
    result: DomainVocabulary,
    raw: RawDomainVocabulary,
  ): DomainVocabulary {
    const simple = this.validateWordArray(result.words?.simple ?? []);
    const intermediate = this.validateWordArray(result.words?.intermediate ?? []);
    const hard = this.validateWordArray(result.words?.hard ?? []);

    // Ensure no cross-pool duplicates
    const allWords = new Set<string>();
    const cleanSimple = simple.filter((w) => {
      if (allWords.has(w)) return false;
      allWords.add(w);
      return true;
    });
    const cleanIntermediate = intermediate.filter((w) => {
      if (allWords.has(w)) return false;
      allWords.add(w);
      return true;
    });
    const cleanHard = hard.filter((w) => {
      if (allWords.has(w)) return false;
      allWords.add(w);
      return true;
    });

    const statistics: DomainVocabularyStatistics = {
      rawCandidates: raw.candidates.length,
      duplicatesRemoved: result.statistics?.duplicatesRemoved ?? 0,
      normalizationCollisions: result.statistics?.normalizationCollisions ?? 0,
      invalidWordsRemoved: result.statistics?.invalidWordsRemoved ?? 0,
      weakThemeWordsRemoved: result.statistics?.weakThemeWordsRemoved ?? 0,
      crossDomainWordsRemoved: result.statistics?.crossDomainWordsRemoved ?? 0,
      artificialCompoundsRemoved: result.statistics?.artificialCompoundsRemoved ?? 0,
      genericFillerRemoved: result.statistics?.genericFillerRemoved ?? 0,
      lengthRejected: result.statistics?.lengthRejected ?? 0,
      finalSimple: cleanSimple.length,
      finalIntermediate: cleanIntermediate.length,
      finalHard: cleanHard.length,
      totalFinalUniqueWords:
        cleanSimple.length + cleanIntermediate.length + cleanHard.length,
    };

    return {
      theme: raw.theme,
      subtheme: raw.subtheme,
      statistics,
      words: {
        simple: cleanSimple,
        intermediate: cleanIntermediate,
        hard: cleanHard,
      },
    };
  }

  /**
   * Validate a word array: uppercase, A-Z only, 3-20 letters, unique.
   */
  private static validateWordArray(words: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const word of words) {
      const normalized = word.trim().toUpperCase().replace(/[^A-Z]/g, "");
      if (normalized.length < 3 || normalized.length > 20) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
    }

    return result;
  }
}
