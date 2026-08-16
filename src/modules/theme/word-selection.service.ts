import { ThemeKey, getThemeWords, isValidTheme, themeLabels, themeCategories } from './word-lists';

export interface WordSelectionOptions {
  theme: string;
  count: number;
  difficulty?: 'easy' | 'medium' | 'hard';
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
  /**
   * Select words based on theme and options
   */
  static selectWords(options: WordSelectionOptions): WordSelectionResult {
    const {
      theme,
      count,
      difficulty = 'medium',
      excludeWords = [],
      minWordLength = 3,
      maxWordLength = 15,
      seed,
    } = options;

    // Validate theme
    if (!isValidTheme(theme)) {
      throw new Error(Invalid theme: . Available themes: );
    }

    const themeKey = theme as ThemeKey;
    let allWords = getThemeWords(themeKey);

    // Filter by word length
    allWords = allWords.filter(
      (word) => word.length >= minWordLength && word.length <= maxWordLength
    );

    // Exclude specified words
    allWords = allWords.filter((word) => !excludeWords.includes(word));

    if (allWords.length === 0) {
      throw new Error(No words available for theme "" with the specified criteria);
    }

    // Select words based on difficulty
    let selectedWords: string[] = [];
    const wordCount = Math.min(count, allWords.length);

    // Use seed for reproducible selection if provided
    let shuffled = this.shuffleArray(allWords, seed);

    switch (difficulty) {
      case 'easy':
        // Prefer shorter words (4-7 letters)
        const easyWords = shuffled.filter((w) => w.length >= 4 && w.length <= 7);
        selectedWords = easyWords.slice(0, wordCount);
        // If not enough easy words, add medium words
        if (selectedWords.length < wordCount) {
          const remaining = shuffled
            .filter((w) => !selectedWords.includes(w) && w.length >= 5 && w.length <= 10)
            .slice(0, wordCount - selectedWords.length);
          selectedWords = [...selectedWords, ...remaining];
        }
        break;
      case 'hard':
        // Prefer longer words (8-15 letters)
        const hardWords = shuffled.filter((w) => w.length >= 8 && w.length <= 15);
        selectedWords = hardWords.slice(0, wordCount);
        // If not enough hard words, add medium words
        if (selectedWords.length < wordCount) {
          const remaining = shuffled
            .filter((w) => !selectedWords.includes(w) && w.length >= 6 && w.length <= 12)
            .slice(0, wordCount - selectedWords.length);
          selectedWords = [...selectedWords, ...remaining];
        }
        break;
      default:
        // Medium: mix of short and long words
        selectedWords = shuffled.slice(0, wordCount);
        break;
    }

    // If still not enough words, fallback to all available words
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

  /**
   * Select multiple sets of words for a book
   */
  static selectMultipleSets(
    options: WordSelectionOptions & { sets: number }
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

  /**
   * Get theme information
   */
  static getThemeInfo(theme: string): { name: string; category: string; wordCount: number } | null {
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
  static getAvailableThemes(): { key: string; name: string; category: string; wordCount: number }[] {
    const themeKeys = Object.keys(themeLabels) as ThemeKey[];
    return themeKeys.map((key) => ({
      key,
      name: themeLabels[key],
      category: themeCategories[key],
      wordCount: getThemeWords(key).length,
    }));
  }

  /**
   * Validate if enough words exist for a theme
   */
  static hasEnoughWords(
    theme: string,
    count: number,
    minWordLength: number = 3,
    maxWordLength: number = 15
  ): boolean {
    if (!isValidTheme(theme)) {
      return false;
    }
    const themeKey = theme as ThemeKey;
    const words = getThemeWords(themeKey).filter(
      (word) => word.length >= minWordLength && word.length <= maxWordLength
    );
    return words.length >= count;
  }

  /**
   * Shuffle array using seed for reproducibility
   */
  private static shuffleArray<T>(array: T[], seed?: number): T[] {
    const shuffled = [...array];
    let currentIndex = shuffled.length;
    let random: () => number;

    if (seed !== undefined) {
      // Simple seeded random (using a basic linear congruential generator)
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
      [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
    }

    return shuffled;
  }
}