import {
  ThemeKey,
  themeLabels,
  themeCategories,
  THEME_WORDS,
  getWordsByLevel,
  themeWordCounts,
} from "./word-lists/index";
import { prisma } from "@/lib/prisma";

export interface WordSelectionOptions {
  theme: string;
  count: number;
  difficulty?: "easy" | "medium" | "hard";
  excludeWords?: string[];
  minWordLength?: number;
  maxWordLength?: number;
  seed?: number;
  listId?: string;
}

export interface WordSelectionByLevelOptions {
  theme: string;
  count: number;
  levels: string[];
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

type ThemeWordsStructure = {
  simple: string[];
  intermediate: string[];
  hard: string[];
};

export class WordSelectionService {
  /**
   * Get all words for a theme filtered by vocabulary levels
   */
  static getThemeWordsByLevel(
    theme: string,
    levels: string[] = ["simple"],
  ): string[] {
    if (!(theme in THEME_WORDS)) {
      throw new Error(`Invalid theme: ${theme}`);
    }
    const themeKey = theme as ThemeKey;
    const themeWords = THEME_WORDS[themeKey] as ThemeWordsStructure;

    let allWords: string[] = [];
    const validLevels = ["simple", "intermediate", "hard"];
    levels.forEach((level) => {
      if (validLevels.includes(level)) {
        const levelKey = level as keyof ThemeWordsStructure;
        const words = themeWords[levelKey];
        if (Array.isArray(words)) {
          allWords = allWords.concat(words);
        }
      }
    });

    return allWords;
  }

  /**
   * Get total word count for a theme filtered by vocabulary levels
   */
  static getThemeWordCountByLevel(
    theme: string,
    levels: string[] = ["simple"],
  ): number {
    const words = this.getThemeWordsByLevel(theme, levels);
    return words.length;
  }

  /**
   * Get all words for a theme (legacy)
   */
  static getThemeWords(theme: string): string[] {
    if (!(theme in THEME_WORDS)) {
      throw new Error(`Invalid theme: ${theme}`);
    }
    const themeKey = theme as ThemeKey;
    const themeWords = THEME_WORDS[themeKey] as ThemeWordsStructure;

    let allWords: string[] = [];
    const levels = ["simple", "intermediate", "hard"] as const;
    levels.forEach((level) => {
      const words = themeWords[level];
      if (Array.isArray(words)) {
        allWords = allWords.concat(words);
      }
    });
    return allWords;
  }

  /**
   * Get the total word count for a theme (legacy)
   */
  static getThemeWordCount(theme: string): number {
    const words = this.getThemeWords(theme);
    return words.length;
  }

  /**
   * 🆕 Select candidate words using intelligent strategy
   */
  static selectCandidateWords(
    eligibleWords: string[],
    count: number,
    gridSize: number,
  ): string[] {
    if (eligibleWords.length === 0 || count <= 0) {
      return [];
    }

    // Shuffle for randomness
    const shuffled = this.shuffleArray([...eligibleWords]);

    // Categorize by length
    const shortWords = shuffled.filter((w) => w.length <= 6);
    const mediumWords = shuffled.filter((w) => w.length > 6 && w.length <= 10);
    const longWords = shuffled.filter((w) => w.length > 10);

    // Calculate distribution: prefer medium words (more flexible for placement)
    let shortTarget = Math.floor(count * 0.25);
    let longTarget = Math.floor(count * 0.25);
    let mediumTarget = count - shortTarget - longTarget;

    // Adjust based on availability
    shortTarget = Math.min(shortTarget, shortWords.length);
    longTarget = Math.min(longTarget, longWords.length);
    mediumTarget = Math.min(mediumTarget, mediumWords.length);

    // If we don't have enough medium words, take from short and long
    if (shortTarget + mediumTarget + longTarget < count) {
      const remaining = count - (shortTarget + mediumTarget + longTarget);
      const remainingPool = shuffled.filter(
        (w) =>
          !shortWords.slice(0, shortTarget).includes(w) &&
          !mediumWords.slice(0, mediumTarget).includes(w) &&
          !longWords.slice(0, longTarget).includes(w),
      );
      const fillWords = this.pickRandom(remainingPool, remaining);
      const selected = [
        ...this.pickRandom(shortWords, shortTarget),
        ...this.pickRandom(mediumWords, mediumTarget),
        ...this.pickRandom(longWords, longTarget),
        ...fillWords,
      ];
      return selected;
    }

    return [
      ...this.pickRandom(shortWords, shortTarget),
      ...this.pickRandom(mediumWords, mediumTarget),
      ...this.pickRandom(longWords, longTarget),
    ];
  }

  /**
   * Pick random items from an array
   */
  private static pickRandom<T>(array: T[], count: number): T[] {
    if (array.length === 0 || count <= 0) return [];
    const shuffled = this.shuffleArray([...array]);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Select words by vocabulary levels
   */
  static selectWordsByLevel(
    options: WordSelectionByLevelOptions,
  ): WordSelectionResult {
    const {
      theme,
      count,
      levels = ["simple"],
      difficulty = "medium",
      excludeWords = [],
      minWordLength = 3,
      maxWordLength = 15,
      seed,
    } = options;

    if (!(theme in THEME_WORDS)) {
      throw new Error(
        "Invalid theme: " +
          theme +
          ". Available themes: " +
          Object.keys(THEME_WORDS).join(", "),
      );
    }

    const themeKey = theme as ThemeKey;
    const themeWords = THEME_WORDS[themeKey] as ThemeWordsStructure;

    let levelWords: string[] = [];
    levels.forEach((level) => {
      const validLevels = ["simple", "intermediate", "hard"];
      if (validLevels.includes(level)) {
        const levelKey = level as keyof ThemeWordsStructure;
        const words = themeWords[levelKey];
        if (Array.isArray(words)) {
          levelWords = levelWords.concat(words);
        }
      }
    });

    let allWords = levelWords.filter((word) => {
      const normalizedWord = word.trim().toUpperCase();
      return (
        normalizedWord.length >= minWordLength &&
        normalizedWord.length <= maxWordLength &&
        !excludeWords.includes(normalizedWord)
      );
    });

    if (allWords.length === 0) {
      throw new Error(
        `No words available for theme "${theme}" with levels "${levels.join(", ")}" ` +
          `and word length ${minWordLength}-${maxWordLength}`,
      );
    }

    const wordCount = Math.min(count, allWords.length);
    const shuffled = this.shuffleArray(allWords, seed);
    let selectedWords: string[] = [];

    switch (difficulty.toLowerCase()) {
      case "easy": {
        const preferred = shuffled.filter(
          (word) =>
            word.length >= Math.max(minWordLength, 4) &&
            word.length <= Math.min(maxWordLength, 7),
        );
        selectedWords = preferred.slice(0, wordCount);
        break;
      }
      case "hard": {
        const preferred = shuffled.filter(
          (word) =>
            word.length >= Math.max(minWordLength, 8) &&
            word.length <= maxWordLength,
        );
        selectedWords = preferred.slice(0, wordCount);
        break;
      }
      case "medium":
      default: {
        selectedWords = shuffled.slice(0, wordCount);
        break;
      }
    }

    if (selectedWords.length < wordCount) {
      const remaining = shuffled
        .filter((word) => !selectedWords.includes(word))
        .slice(0, wordCount - selectedWords.length);
      selectedWords = [...selectedWords, ...remaining];
    }

    return {
      words: selectedWords,
      theme: themeKey,
      difficulty,
      totalAvailable: allWords.length,
    };
  }

  /**
   * Select words from a custom word list
   */
  static async selectWordsFromList(
    listId: string,
    count: number = 12,
  ): Promise<{ words: string[] }> {
    try {
      const list = await prisma.customWordList.findUnique({
        where: { id: listId },
      });

      if (!list) {
        throw new Error(`Custom word list with ID ${listId} not found`);
      }

      const allWords = list.words;
      if (allWords.length === 0) {
        throw new Error(`Word list "${list.name}" is empty`);
      }

      const shuffled = [...allWords].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(count, shuffled.length));

      return { words: selected };
    } catch (error) {
      console.error(
        "[WordSelectionService] Error selecting words from list:",
        error,
      );
      throw error;
    }
  }

  /**
   * Select words (legacy method)
   */
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

    if (!(theme in THEME_WORDS)) {
      throw new Error(
        "Invalid theme: " +
          theme +
          ". Available themes: " +
          Object.keys(THEME_WORDS).join(", "),
      );
    }

    const themeKey = theme as ThemeKey;
    const themeWords = THEME_WORDS[themeKey] as ThemeWordsStructure;

    let allLevelWords: string[] = [];
    const levels = ["simple", "intermediate", "hard"] as const;
    levels.forEach((level) => {
      const words = themeWords[level];
      if (Array.isArray(words)) {
        allLevelWords = allLevelWords.concat(words);
      }
    });

    let allWords = allLevelWords.filter((word) => {
      const normalizedWord = word.trim().toUpperCase();
      return (
        normalizedWord.length >= minWordLength &&
        normalizedWord.length <= maxWordLength &&
        !excludeWords.includes(normalizedWord)
      );
    });

    if (allWords.length === 0) {
      throw new Error(
        `No words available for theme "${theme}" with word length ` +
          `${minWordLength}-${maxWordLength}`,
      );
    }

    const wordCount = Math.min(count, allWords.length);
    const shuffled = this.shuffleArray(allWords, seed);
    let selectedWords: string[] = [];

    switch (difficulty.toLowerCase()) {
      case "easy": {
        const preferred = shuffled.filter(
          (word) =>
            word.length >= Math.max(minWordLength, 4) &&
            word.length <= Math.min(maxWordLength, 7),
        );
        selectedWords = preferred.slice(0, wordCount);
        break;
      }
      case "hard": {
        const preferred = shuffled.filter(
          (word) =>
            word.length >= Math.max(minWordLength, 8) &&
            word.length <= maxWordLength,
        );
        selectedWords = preferred.slice(0, wordCount);
        break;
      }
      case "medium":
      default: {
        selectedWords = shuffled.slice(0, wordCount);
        break;
      }
    }

    if (selectedWords.length < wordCount) {
      const remaining = shuffled
        .filter((word) => !selectedWords.includes(word))
        .slice(0, wordCount - selectedWords.length);
      selectedWords = [...selectedWords, ...remaining];
    }

    return {
      words: selectedWords,
      theme: themeKey,
      difficulty,
      totalAvailable: allWords.length,
    };
  }

  static selectMultipleSets(
    options: WordSelectionOptions & { sets: number },
  ): WordSelectionResult[] {
    const { sets, ...baseOptions } = options;
    const results: WordSelectionResult[] = [];
    const usedWords: string[] = [];

    for (let i = 0; i < sets; i++) {
      const result = this.selectWords({
        ...baseOptions,
        excludeWords: [...(baseOptions.excludeWords || []), ...usedWords],
        seed: baseOptions.seed ? baseOptions.seed + i : undefined,
      });
      results.push(result);
      usedWords.push(...result.words);
    }

    return results;
  }

  static getThemeInfo(
    theme: string,
  ): { name: string; category: string; wordCount: number } | null {
    if (!(theme in THEME_WORDS)) {
      return null;
    }
    const themeKey = theme as ThemeKey;
    const themeWords = THEME_WORDS[themeKey] as ThemeWordsStructure;

    let totalCount = 0;
    const levels = ["simple", "intermediate", "hard"] as const;
    levels.forEach((level) => {
      const words = themeWords[level];
      if (Array.isArray(words)) {
        totalCount += words.length;
      }
    });

    return {
      name: themeLabels[themeKey],
      category: themeCategories[themeKey],
      wordCount: totalCount,
    };
  }

  static getAvailableThemes(): {
    key: string;
    name: string;
    category: string;
    wordCount: number;
  }[] {
    const themeKeys = Object.keys(THEME_WORDS) as ThemeKey[];
    return themeKeys.map((key) => {
      const themeWords = THEME_WORDS[key] as ThemeWordsStructure;
      let totalCount = 0;
      const levels = ["simple", "intermediate", "hard"] as const;
      levels.forEach((level) => {
        const words = themeWords[level];
        if (Array.isArray(words)) {
          totalCount += words.length;
        }
      });

      return {
        key,
        name: themeLabels[key],
        category: themeCategories[key],
        wordCount: totalCount,
      };
    });
  }

  static hasEnoughWords(
    theme: string,
    count: number,
    minWordLength: number = 3,
    maxWordLength: number = 15,
  ): boolean {
    if (!(theme in THEME_WORDS)) {
      return false;
    }
    const themeKey = theme as ThemeKey;
    const themeWords = THEME_WORDS[themeKey] as ThemeWordsStructure;

    let allWords: string[] = [];
    const levels = ["simple", "intermediate", "hard"] as const;
    levels.forEach((level) => {
      const words = themeWords[level];
      if (Array.isArray(words)) {
        allWords = allWords.concat(words);
      }
    });

    const filtered = allWords.filter(
      (word) => word.length >= minWordLength && word.length <= maxWordLength,
    );
    return filtered.length >= count;
  }

  private static shuffleArray<T>(array: T[], seed?: number): T[] {
    const shuffled = [...array];
    let currentIndex = shuffled.length;
    let random: () => number;

    if (seed !== undefined) {
      let s = seed;
      random = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    } else {
      random = () => Math.random();
    }

    while (currentIndex !== 0) {
      const randomIndex = Math.floor(random() * currentIndex);
      currentIndex--;
      [shuffled[currentIndex], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[currentIndex],
      ];
    }

    return shuffled;
  }
}
