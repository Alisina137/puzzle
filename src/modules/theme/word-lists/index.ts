import { animalsWords } from "./animals";
import { footballWords } from "./football";
import { spaceWords } from "./space";
import { travelWords } from "./travel";
import { technologyWords } from "./technology";

// Each theme now exports { simple, intermediate, hard }
export const THEME_WORDS = {
  animals: animalsWords,
  football: footballWords,
  space: spaceWords,
  travel: travelWords,
  technology: technologyWords,
};

export type ThemeKey = keyof typeof THEME_WORDS;

export const themeLabels: Record<ThemeKey, string> = {
  animals: "Animals",
  football: "Football",
  space: "Space",
  travel: "Travel",
  technology: "Technology",
};

export const themeCategories: Record<ThemeKey, string> = {
  animals: "Nature",
  football: "Sports",
  space: "Science",
  travel: "Adventure",
  technology: "Technology",
};

export const themeWordCounts: Record<ThemeKey, Record<string, number>> = {
  animals: {
    simple: animalsWords.simple?.length || 0,
    intermediate: animalsWords.intermediate?.length || 0,
    hard: animalsWords.hard?.length || 0,
  },
  football: {
    simple: footballWords.simple?.length || 0,
    intermediate: footballWords.intermediate?.length || 0,
    hard: footballWords.hard?.length || 0,
  },
  space: {
    simple: spaceWords.simple?.length || 0,
    intermediate: spaceWords.intermediate?.length || 0,
    hard: spaceWords.hard?.length || 0,
  },
  travel: {
    simple: travelWords.simple?.length || 0,
    intermediate: travelWords.intermediate?.length || 0,
    hard: travelWords.hard?.length || 0,
  },
  technology: {
    simple: technologyWords.simple?.length || 0,
    intermediate: technologyWords.intermediate?.length || 0,
    hard: technologyWords.hard?.length || 0,
  },
};

export function getThemeKeys(): ThemeKey[] {
  return Object.keys(THEME_WORDS) as ThemeKey[];
}

export function isValidTheme(theme: string): theme is ThemeKey {
  return theme in THEME_WORDS;
}

export function getThemeWords(theme: ThemeKey): {
  simple: string[];
  intermediate: string[];
  hard: string[];
} {
  return THEME_WORDS[theme];
}

export function getWordsByLevel(
  theme: ThemeKey,
  levels: string[] = ["simple"],
  count: number = 10,
  exclude: string[] = [],
): string[] {
  const themeWords = getThemeWords(theme);

  let allWords: string[] = [];
  levels.forEach((level) => {
    if (themeWords[level as keyof typeof themeWords]) {
      allWords = allWords.concat(themeWords[level as keyof typeof themeWords]);
    }
  });

  const available = allWords.filter((word) => !exclude.includes(word));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function getRandomWords(
  theme: ThemeKey,
  count: number = 10,
  exclude: string[] = [],
): string[] {
  return getWordsByLevel(theme, ["simple"], count, exclude);
}

export function getTotalWordCount(theme: ThemeKey): number {
  const counts = themeWordCounts[theme];
  if (!counts) return 0;
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

export function hasEnoughWords(
  theme: ThemeKey,
  levels: string[],
  needed: number,
  exclude: string[] = [],
): boolean {
  const available = getWordsByLevel(theme, levels, 9999, exclude);
  return available.length >= needed;
}
