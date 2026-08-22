import {
  ThemeKey,
  themeLabels,
  themeCategories,
  THEME_WORDS,
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
  listId?: string; // Custom word list ID
}

export interface WordSelectionResult {
  words: string[];
  theme: string;
  difficulty: string;
  totalAvailable: number;
}

export class WordSelectionService {
  /**
   * Select words from a custom word list
   */
  static async selectWordsFromList(listId: string, count: number = 12): Promise<{ words: string[] }> {
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

      // Shuffle and select words
      const shuffled = [...allWords].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(count, shuffled.length));

      return { words: selected };
    } catch (error) {
      console.error("[WordSelectionService] Error selecting words from list:", error);
      throw error;
    }
  }

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
    let allWords = THEME_WORDS[themeKey];

    allWords = allWords.filter(
      (word) => word.length >= minWordLength && word.length <= maxWordLength,
    );

    allWords = allWords.filter((word) => !excludeWords.includes(word));

    if (allWords.length === 0) {
      throw new Error(
        'No words available for theme "' +
          theme +
          '" with the specified criteria',
      );
    }

    let selectedWords: string[] = [];
    const wordCount = Math.min(count, allWords.length);

    let shuffled = this.shuffleArray(allWords, seed);

    switch (difficulty) {
      case "easy":
        const easyWords = shuffled.filter(
          (w) => w.length >= 4 && w.length <= 7,
        );
        selectedWords = easyWords.slice(0, wordCount);
        if (selectedWords.length < wordCount) {
          const remaining = shuffled
            .filter(
              (w) =>
                !selectedWords.includes(w) && w.length >= 5 && w.length <= 10,
            )
            .slice(0, wordCount - selectedWords.length);
          selectedWords = [...selectedWords, ...remaining];
        }
        break;
      case "hard":
        const hardWords = shuffled.filter(
          (w) => w.length >= 8 && w.length <= 15,
        );
        selectedWords = hardWords.slice(0, wordCount);
        if (selectedWords.length < wordCount) {
          const remaining = shuffled
            .filter(
              (w) =>
                !selectedWords.includes(w) && w.length >= 6 && w.length <= 12,
            )
            .slice(0, wordCount - selectedWords.length);
          selectedWords = [...selectedWords, ...remaining];
        }
        break;
      default:
        selectedWords = shuffled.slice(0, wordCount);
        break;
    }

    if (selectedWords.length < wordCount) {
      const remaining = shuffled
        .filter((w) => !selectedWords.includes(w))
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
    return {
      name: themeLabels[themeKey],
      category: themeCategories[themeKey],
      wordCount: THEME_WORDS[themeKey].length,
    };
  }

  static getAvailableThemes(): {
    key: string;
    name: string;
    category: string;
    wordCount: number;
  }[] {
    const themeKeys = Object.keys(THEME_WORDS) as ThemeKey[];
    return themeKeys.map((key) => ({
      key,
      name: themeLabels[key],
      category: themeCategories[key],
      wordCount: THEME_WORDS[key].length,
    }));
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
    const words = THEME_WORDS[themeKey].filter(
      (word) => word.length >= minWordLength && word.length <= maxWordLength,
    );
    return words.length >= count;
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