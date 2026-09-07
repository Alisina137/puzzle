import fs from "node:fs";
import path from "node:path";

const WORD_LISTS_ROOT = path.join(
  process.cwd(),
  "src/modules/theme/word-lists",
);

export type ThemeKey = string;

export interface ThemeWordBundle {
  simple: string[];
  intermediate: string[];
  hard: string[];
}

interface DomainWordFile {
  words?: {
    simple?: string[];
    intermediate?: string[];
    hard?: string[];
  };
}

interface ThemeMeta {
  label?: string;
  category?: string;
}

function toDisplayLabel(folderName: string): string {
  return folderName
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function loadThemeMeta(themeDir: string): ThemeMeta {
  const metaPath = path.join(themeDir, "_meta.json");
  if (!fs.existsSync(metaPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8")) as ThemeMeta;
  } catch (err) {
    console.error(
      `[theme-words] Failed to parse _meta.json in ${themeDir}:`,
      err,
    );
    return {};
  }
}

// Persistent objects, mutated in place on refresh rather than reassigned
// — ES module named exports bind to these specific object references, so
// any file that imports THEME_WORDS/themeLabels/etc. sees updates
// immediately once refreshThemeRegistry() mutates them.
export const THEME_WORDS: Record<string, ThemeWordBundle> = {};
export const themeLabels: Record<ThemeKey, string> = {};
export const themeCategories: Record<ThemeKey, string> = {};
export const themeWordCounts: Record<ThemeKey, Record<string, number>> = {};

function clearOwnKeys(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) delete obj[key];
}

/**
 * Re-scans src/modules/theme/word-lists/ and repopulates THEME_WORDS,
 * themeLabels, themeCategories, and themeWordCounts in place. Runs once
 * at module load (below) — call it again any time your generation
 * pipeline finishes writing a new/updated theme's domain files in the
 * same running process, so newly generated themes show up without a
 * server restart.
 */
export function refreshThemeRegistry(): void {
  clearOwnKeys(THEME_WORDS);
  clearOwnKeys(themeLabels);
  clearOwnKeys(themeCategories);
  clearOwnKeys(themeWordCounts);

  if (!fs.existsSync(WORD_LISTS_ROOT)) {
    console.warn(
      `[theme-words] word-lists folder not found at ${WORD_LISTS_ROOT}`,
    );
    return;
  }

  const entries = fs.readdirSync(WORD_LISTS_ROOT, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const themeDir = path.join(WORD_LISTS_ROOT, entry.name);
    const domainFiles = fs
      .readdirSync(themeDir)
      .filter(
        (f) =>
          f.endsWith(".json") && f !== "_meta.json" && !f.endsWith(".raw.json"),
      );

    if (domainFiles.length === 0) continue; // folder exists, nothing generated yet

    const bundle: ThemeWordBundle = { simple: [], intermediate: [], hard: [] };

    for (const file of domainFiles) {
      try {
        const raw = fs.readFileSync(path.join(themeDir, file), "utf8");
        const parsed = JSON.parse(raw) as DomainWordFile;
        bundle.simple.push(...(parsed.words?.simple ?? []));
        bundle.intermediate.push(...(parsed.words?.intermediate ?? []));
        bundle.hard.push(...(parsed.words?.hard ?? []));
      } catch (err) {
        console.error(
          `[theme-words] Failed to parse ${entry.name}/${file}, skipping:`,
          err,
        );
      }
    }

    // Deduplicate — the same word can legitimately appear in more than
    // one domain file within a theme.
    bundle.simple = [...new Set(bundle.simple)];
    bundle.intermediate = [...new Set(bundle.intermediate)];
    bundle.hard = [...new Set(bundle.hard)];

    const themeKey = entry.name.toLowerCase();
    THEME_WORDS[themeKey] = bundle;

    const meta = loadThemeMeta(themeDir);
    themeLabels[themeKey] = meta.label ?? toDisplayLabel(entry.name);
    themeCategories[themeKey] = meta.category ?? "General";
    themeWordCounts[themeKey] = {
      simple: bundle.simple.length,
      intermediate: bundle.intermediate.length,
      hard: bundle.hard.length,
    };
  }
}

refreshThemeRegistry(); // populate once at module load

export function getThemeKeys(): ThemeKey[] {
  return Object.keys(THEME_WORDS);
}

export function isValidTheme(theme: string): theme is ThemeKey {
  return theme in THEME_WORDS;
}

export function getThemeWords(theme: ThemeKey): ThemeWordBundle {
  const bundle = THEME_WORDS[theme];
  if (!bundle) {
    throw new Error(
      `Unknown theme "${theme}". Available: ${getThemeKeys().join(", ")}`,
    );
  }
  return bundle;
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
