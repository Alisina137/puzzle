import {
  ThemeKey,
  getThemeWords,
  isValidTheme,
  themeLabels,
  themeCategories,
} from "./word-lists";

export interface WordSelectorOptions {
  theme: string;
  count: number;
  difficulty?: "easy" | "medium" | "hard";
  excludeWords?: string[];
  minWordLength?: number;
  maxWordLength?: number;
}

export class WordSelector {
  /**
   * Select words based on theme and options
   */
  static selectWords(options: WordSelectorOptions): string[] {
    const {
      theme,
      count,
      difficulty = "medium",
      excludeWords = [],
      minWordLength = 3,
      maxWordLength = 15,
    } = options;

    // Validate theme
    if (!isValidTheme(theme)) {
      throw new Error(`Invalid theme: ${theme}`);
    }

    const themeKey = theme as ThemeKey;
    let allWords = getThemeWords(themeKey);

    // Filter by word length
    allWords = allWords.filter(
      (word) => word.length >= minWordLength && word.length <= maxWordLength,
    );

    // Exclude specified words
    allWords = allWords.filter((word) => !excludeWords.includes(word));

    // Select words based on difficulty
    let selectedWords: string[] = [];
    const wordCount = Math.min(count, allWords.length);

    switch (difficulty) {
      case "easy": {
        // Prefer shorter words (4-7 letters)
        const easyWords = allWords.filter(
          (word) => word.length >= 4 && word.length <= 7,
        );

        selectedWords = this.shuffleArray(easyWords).slice(0, wordCount);
        break;
      }

      case "hard": {
        // Prefer longer words (8-15 letters)
        const hardWords = allWords.filter(
          (word) => word.length >= 8 && word.length <= 15,
        );

        selectedWords = this.shuffleArray(hardWords).slice(0, wordCount);
        break;
      }

      default: {
        // Medium: mix of short and long words
        selectedWords = this.shuffleArray(allWords).slice(0, wordCount);
        break;
      }
    }

    // If not enough words for the requested difficulty,
    // fallback to other available words
    if (selectedWords.length < wordCount) {
      const remaining = this.shuffleArray(allWords)
        .filter((word) => !selectedWords.includes(word))
        .slice(0, wordCount - selectedWords.length);

      selectedWords = [...selectedWords, ...remaining];
    }

    return selectedWords;
  }

  /**
   * Get theme information
   */
  static getThemeInfo(theme: string): {
    name: string;
    category: string;
    wordCount: number;
  } | null {
    if (!isValidTheme(theme)) {
      return null;
    }

    const themeKey = theme as ThemeKey;

    return {
      name: themeLabels[themeKey],
      category: themeCategories[themeKey],
      wordCount: getThemeWords(themeKey).length,
    };
  }

  /**
   * Get all available themes
   */
  static getAvailableThemes(): {
    key: string;
    name: string;
    category: string;
  }[] {
    const themeKeys = Object.keys(themeLabels) as ThemeKey[];

    return themeKeys.map((key) => ({
      key,
      name: themeLabels[key],
      category: themeCategories[key],
    }));
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Validate if enough words exist for a theme
   */
  static hasEnoughWords(
    theme: string,
    count: number,
    minWordLength: number = 3,
    maxWordLength: number = 15,
  ): boolean {
    if (!isValidTheme(theme)) {
      return false;
    }

    const themeKey = theme as ThemeKey;

    const words = getThemeWords(themeKey).filter(
      (word) => word.length >= minWordLength && word.length <= maxWordLength,
    );

    return words.length >= count;
  }
}
