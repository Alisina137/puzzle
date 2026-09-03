import { prisma } from "@/lib/prisma";
import { ConfigurationTemplate } from "@prisma/client";

export interface ConfigRecommendation {
  gridSize: number;
  // Legacy - keep for backward compatibility
  wordsPerPuzzle: number;
  // New adaptive fields
  targetWordsPerPuzzle: number;
  minWordsPerPuzzle: number;
  maxWordsPerPuzzle: number;
  minWordLength: number;
  maxWordLength: number;
  directions: number;
  allowReverse: boolean;
  overlap: "low" | "medium" | "high";
  vocabularyLevels: string[];
  trimSize?: string; // Add trimSize as optional
}

// Type for template with typed config
export type TemplateWithConfig = Omit<ConfigurationTemplate, "config"> & {
  config: ConfigRecommendation;
};

export class ConfigTemplateService {
  /**
   * Get a configuration template by audience and difficulty
   */
  static async getTemplate(
    audience: string,
    difficulty: string,
  ): Promise<TemplateWithConfig | null> {
    try {
      const template = await prisma.configurationTemplate.findFirst({
        where: {
          audience: audience,
          difficulty: difficulty,
        },
      });

      if (!template) {
        return null;
      }

      return {
        ...template,
        config: template.config as unknown as ConfigRecommendation,
      };
    } catch (error) {
      console.error("[ConfigTemplateService] Error fetching template:", error);
      return null;
    }
  }

  /**
   * Get the default configuration template (fallback)
   */
  static async getDefaultTemplate(): Promise<TemplateWithConfig | null> {
    try {
      const template = await prisma.configurationTemplate.findFirst({
        where: {
          isDefault: true,
        },
      });

      if (!template) {
        return null;
      }

      return {
        ...template,
        config: template.config as unknown as ConfigRecommendation,
      };
    } catch (error) {
      console.error(
        "[ConfigTemplateService] Error fetching default template:",
        error,
      );
      return null;
    }
  }

  /**
   * Get all configuration templates for a specific audience
   */
  static async getTemplatesByAudience(
    audience: string,
  ): Promise<TemplateWithConfig[]> {
    try {
      const templates = await prisma.configurationTemplate.findMany({
        where: {
          audience: audience,
        },
        orderBy: {
          difficulty: "asc",
        },
      });

      return templates.map((template) => ({
        ...template,
        config: template.config as unknown as ConfigRecommendation,
      }));
    } catch (error) {
      console.error(
        "[ConfigTemplateService] Error fetching templates by audience:",
        error,
      );
      return [];
    }
  }

  /**
   * Get all configuration templates
   */
  static async getAllTemplates(): Promise<TemplateWithConfig[]> {
    try {
      const templates = await prisma.configurationTemplate.findMany({
        orderBy: [
          {
            audience: "asc",
          },
          {
            difficulty: "asc",
          },
        ],
      });

      return templates.map((template) => ({
        ...template,
        config: template.config as unknown as ConfigRecommendation,
      }));
    } catch (error) {
      console.error(
        "[ConfigTemplateService] Error fetching all templates:",
        error,
      );
      return [];
    }
  }

  /**
   * Get recommended configuration for a book based on audience and difficulty
   * Falls back to default template if no specific match found
   */
  static async getRecommendation(
    audience: string,
    difficulty: string,
  ): Promise<ConfigRecommendation | null> {
    try {
      let template = await this.getTemplate(audience, difficulty);

      if (!template) {
        console.warn(
          `[ConfigTemplateService] No template found for ${audience}/${difficulty}, using default`,
        );
        const defaultTemplate = await this.getDefaultTemplate();
        if (!defaultTemplate) {
          console.error("[ConfigTemplateService] No default template found");
          return null;
        }
        template = defaultTemplate;
      }

      return template.config;
    } catch (error) {
      console.error(
        "[ConfigTemplateService] Error getting recommendation:",
        error,
      );
      return null;
    }
  }

  /**
   * Get vocabulary levels from a config template
   */
  static getVocabularyLevels(template: TemplateWithConfig | null): string[] {
    if (!template) {
      return ["simple"];
    }

    const config = template.config as ConfigRecommendation;

    if (config.vocabularyLevels && Array.isArray(config.vocabularyLevels)) {
      return config.vocabularyLevels;
    }

    return ["simple"];
  }

  /**
   * Validate if a configuration is valid
   */
  static validateConfig(config: Partial<ConfigRecommendation> | any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // If config is empty or undefined, return default valid config
    if (!config) {
      return { valid: true, errors: [] };
    }

    // Only validate fields that exist
    if (
      config.gridSize !== undefined &&
      (config.gridSize < 5 || config.gridSize > 25)
    ) {
      errors.push("Grid size must be between 5 and 25");
    }

    if (
      config.wordsPerPuzzle !== undefined &&
      (config.wordsPerPuzzle < 3 || config.wordsPerPuzzle > 30)
    ) {
      errors.push("wordsPerPuzzle must be between 3 and 30");
    }

    if (
      config.targetWordsPerPuzzle !== undefined &&
      (config.targetWordsPerPuzzle < 3 || config.targetWordsPerPuzzle > 30)
    ) {
      errors.push("targetWordsPerPuzzle must be between 3 and 30");
    }

    if (
      config.minWordsPerPuzzle !== undefined &&
      config.targetWordsPerPuzzle !== undefined
    ) {
      if (
        config.minWordsPerPuzzle < 1 ||
        config.minWordsPerPuzzle > config.targetWordsPerPuzzle
      ) {
        errors.push(
          "minWordsPerPuzzle must be between 1 and targetWordsPerPuzzle",
        );
      }
    }

    if (
      config.maxWordsPerPuzzle !== undefined &&
      config.targetWordsPerPuzzle !== undefined
    ) {
      if (
        config.maxWordsPerPuzzle < config.targetWordsPerPuzzle ||
        config.maxWordsPerPuzzle > 30
      ) {
        errors.push(
          "maxWordsPerPuzzle must be between targetWordsPerPuzzle and 30",
        );
      }
    }

    if (
      config.minWordLength !== undefined &&
      (config.minWordLength < 2 || config.minWordLength > 15)
    ) {
      errors.push("Min word length must be between 2 and 15");
    }

    if (
      config.maxWordLength !== undefined &&
      config.minWordLength !== undefined
    ) {
      if (config.maxWordLength < config.minWordLength) {
        errors.push(
          "Max word length must be greater than or equal to min word length",
        );
      }
    }

    if (
      config.directions !== undefined &&
      (config.directions < 2 || config.directions > 8)
    ) {
      errors.push("Directions must be between 2 and 8");
    }

    // Handle vocabularyLevels - make it optional
    let vocabularyLevels = config.vocabularyLevels;

    // If vocabularyLevels doesn't exist but vocabularyLevel does, convert it
    if (!vocabularyLevels && config.vocabularyLevel) {
      vocabularyLevels = [config.vocabularyLevel];
    }

    // Only validate if vocabularyLevels is provided
    if (vocabularyLevels !== undefined) {
      if (!Array.isArray(vocabularyLevels) || vocabularyLevels.length === 0) {
        errors.push("vocabularyLevels must be a non-empty array");
      } else {
        const validLevels = ["simple", "intermediate", "hard"];
        vocabularyLevels.forEach((level: string) => {
          if (!validLevels.includes(level)) {
            errors.push(
              `Invalid vocabulary level: ${level}. Must be one of: ${validLevels.join(", ")}`,
            );
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
