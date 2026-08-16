import { animalsWords } from './animals';
import { spaceWords } from './space';
import { travelWords } from './travel';
import { foodWords } from './food';
import { sportsWords } from './sports';

export const themeWordLists = {
  animals: animalsWords,
  space: spaceWords,
  travel: travelWords,
  food: foodWords,
  sports: sportsWords,
};

export type ThemeKey = keyof typeof themeWordLists;

export const themeLabels: Record<ThemeKey, string> = {
  animals: 'Animals',
  space: 'Space',
  travel: 'Travel',
  food: 'Food',
  sports: 'Sports',
};

export const themeCategories: Record<ThemeKey, string> = {
  animals: 'Nature',
  space: 'Science',
  travel: 'Adventure',
  food: 'Cooking',
  sports: 'Fitness',
};

export const themeWordCounts: Record<ThemeKey, number> = {
  animals: animalsWords.length,
  space: spaceWords.length,
  travel: travelWords.length,
  food: foodWords.length,
  sports: sportsWords.length,
};

// Get all available theme keys
export function getThemeKeys(): ThemeKey[] {
  return Object.keys(themeWordLists) as ThemeKey[];
}

// Check if a theme is valid
export function isValidTheme(theme: string): theme is ThemeKey {
  return theme in themeWordLists;
}

// Get words for a specific theme
export function getThemeWords(theme: ThemeKey): string[] {
  return themeWordLists[theme] || [];
}

// Get a random subset of words from a theme
export function getRandomWords(
  theme: ThemeKey,
  count: number = 10,
  exclude: string[] = []
): string[] {
  const allWords = getThemeWords(theme);
  const available = allWords.filter((word) => !exclude.includes(word));
  
  // Shuffle and select
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}