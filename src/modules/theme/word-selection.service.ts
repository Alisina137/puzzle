import {
  ThemeKey,
  themeLabels,
  themeCategories,
  themeWordLists,
  isValidTheme,
  getThemeWords,
} from "./word-lists/index.js";

export interface WordSelectionOptions {
  theme: string;
  count: number;
  difficulty?: "easy" | "medium" | "hard";
  excludeWords?: string[];
  minWordLength?: number;
  maxWordLength?: number;
  seed?: number;
}

export interface WordSelectionResult {
  words: string[];
  theme: string;
  difficulty: string;
  totalAvailable: number;
}

export class WordSelectionService {
  static selectWords(options: WordSelectionOptions): WordSelectionResult {
    const {
      theme,
      count,
      difficulty = "medium",
      excludeWords = [],
      minWordLength = 3,
      maxWordLength = 15,
      seed,
    } = options;

    // Validate theme
    if (!isValidTheme(theme)) {
      throw new Error(
        `Invalid theme: ${theme}. Available themes: ${Object.keys(
          themeWordLists,
        ).join(", ")}`,
      );
    }

    const themeKey = theme as ThemeKey;
    let allWords = getThemeWords(themeKey);

    // Filter by word length
    allWords = allWords.filter(
      (word) => word.length >= minWordLength && word.length <= maxWordLength,
    );

    // Exclude specified words
    allWords = allWords.filter((word) => !excludeWords.includes(word));

    if (allWords.length === 0) {
      throw new Error(
        `No words available for theme "${theme}" with the specified criteria`,
      );
    }

    // Select words based on difficulty
    let selectedWords: string[] = [];
    const wordCount = Math.min(count, allWords.length);

    // Use seed for reproducible selection if provided
    let shuffled = this.shuffleArray(allWords, seed);

    switch (difficulty) {
      case "easy":
        // Easy words: shorter words first
        shuffled = [...shuffled].sort((a, b) => a.length - b.length);
        selectedWords = shuffled.slice(0, wordCount);
        break;

      case "hard":
        // Hard words: longer words first
        shuffled = [...shuffled].sort((a, b) => b.length - a.length);
        selectedWords = shuffled.slice(0, wordCount);
        break;

      case "medium":
      default:
        selectedWords = shuffled.slice(0, wordCount);
        break;
    }

    return {
      words: selectedWords,
      theme,
      difficulty,
      totalAvailable: allWords.length,
    };
  }

  private static shuffleArray(array: string[], seed?: number): string[] {
    const result = [...array];

    if (seed !== undefined) {
      const random = this.seededRandom(seed);

      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
    } else {
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
    }

    return result;
  }

  private static seededRandom(seed: number): () => number {
    let value = seed;

    return () => {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
  }
}

export function getThemeLabel(theme: ThemeKey): string {
  return themeLabels[theme];
}

export function getThemeCategory(theme: ThemeKey): string {
  return themeCategories[theme];
}
