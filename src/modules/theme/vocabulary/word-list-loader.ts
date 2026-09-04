import * as fs from "fs";
import * as path from "path";
import {
  DomainVocabularyFile,
  DomainInfo,
  ThemeDomainInfo,
  LoadedDomainWords,
} from "../domain/domain.types";
import {
  normalizeThemeDir,
  normalizeFilename,
  buildThemeDirPath,
} from "../domain/filename.util";
import { THEME_WORDS } from "../word-lists/index";

/**
 * Domain-based word list loader.
 *
 * Loads domain vocabulary JSON files from the filesystem while preserving
 * the difficulty structure (simple/intermediate/hard arrays).
 *
 * Falls back to legacy static TypeScript word lists when a theme has no
 * domain directory.
 */

const WORD_LISTS_BASE = "src/modules/theme/word-lists";

/**
 * Get the absolute path to the word-lists directory.
 */
function getWordListsDir(): string {
  return path.join(process.cwd(), WORD_LISTS_BASE);
}

/**
 * Check if a theme has a domain vocabulary directory.
 */
export function themeHasDomains(themeName: string): boolean {
  const themeDir = normalizeThemeDir(themeName);
  const dirPath = path.join(getWordListsDir(), themeDir);
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

/**
 * List all domain JSON files for a theme.
 * Returns normalized domain names (without .json extension).
 */
function listDomainFiles(themeName: string): string[] {
  const themeDir = normalizeThemeDir(themeName);
  const dirPath = path.join(getWordListsDir(), themeDir);

  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".raw.json"))
    .map((f) => f.replace(/\.json$/, ""));
}

/**
 * Load a single domain vocabulary file.
 * Preserves the difficulty structure.
 */
export function loadDomainWords(
  themeName: string,
  domainName: string,
): LoadedDomainWords | null {
  const themeDir = normalizeThemeDir(themeName);
  const domainFile = normalizeFilename(domainName);
  const filePath = path.join(getWordListsDir(), themeDir, `${domainFile}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content) as DomainVocabularyFile;

    return {
      simple: data.words?.simple ?? [],
      intermediate: data.words?.intermediate ?? [],
      hard: data.words?.hard ?? [],
    };
  } catch (error) {
    console.error(
      `[WordListLoader] Error loading domain file ${filePath}:`,
      error,
    );
    return null;
  }
}

/**
 * Load a domain vocabulary file with full metadata.
 */
export function loadDomainVocabularyFile(
  themeName: string,
  domainName: string,
): DomainVocabularyFile | null {
  const themeDir = normalizeThemeDir(themeName);
  const domainFile = normalizeFilename(domainName);
  const filePath = path.join(getWordListsDir(), themeDir, `${domainFile}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as DomainVocabularyFile;
  } catch (error) {
    console.error(
      `[WordListLoader] Error loading domain file ${filePath}:`,
      error,
    );
    return null;
  }
}

/**
 * Load multiple domain vocabulary files.
 * Merges words while preserving the difficulty structure.
 */
export function loadMultipleDomainWords(
  themeName: string,
  domainNames: string[],
): LoadedDomainWords {
  const result: LoadedDomainWords = {
    simple: [],
    intermediate: [],
    hard: [],
  };

  for (const domainName of domainNames) {
    const words = loadDomainWords(themeName, domainName);
    if (words) {
      result.simple.push(...words.simple);
      result.intermediate.push(...words.intermediate);
      result.hard.push(...words.hard);
    }
  }

  // Deduplicate within each pool
  result.simple = [...new Set(result.simple)];
  result.intermediate = [...new Set(result.intermediate)];
  result.hard = [...new Set(result.hard)];

  return result;
}

/**
 * Get all domain info for a theme.
 * Returns metadata and word counts for each domain.
 */
export function loadThemeDomains(themeName: string): ThemeDomainInfo {
  const themeDir = normalizeThemeDir(themeName);
  const hasVocab = themeHasDomains(themeName);

  if (!hasVocab) {
    return {
      theme: themeName,
      themeDir,
      domainCount: 0,
      domains: [],
      hasVocabulary: false,
    };
  }

  const domainFiles = listDomainFiles(themeName);
  const domains: DomainInfo[] = [];

  for (const fileName of domainFiles) {
    const vocab = loadDomainVocabularyFile(themeName, fileName);
    if (!vocab) continue;

    domains.push({
      id: vocab.domainId ?? domains.length + 1,
      name: vocab.domainName ?? vocab.subtheme ?? fileName,
      description: vocab.description ?? "",
      richness: vocab.richness ?? "MEDIUM",
      priority: vocab.priority ?? 3,
      generationFocus: vocab.generationFocus ?? [],
      fileName,
      wordCounts: {
        simple: vocab.words?.simple?.length ?? 0,
        intermediate: vocab.words?.intermediate?.length ?? 0,
        hard: vocab.words?.hard?.length ?? 0,
        total:
          (vocab.words?.simple?.length ?? 0) +
          (vocab.words?.intermediate?.length ?? 0) +
          (vocab.words?.hard?.length ?? 0),
      },
    });
  }

  // Sort by priority (descending), then by name
  domains.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));

  return {
    theme: themeName,
    themeDir,
    domainCount: domains.length,
    domains,
    hasVocabulary: true,
  };
}

/**
 * Legacy fallback: load words from the static TypeScript word lists.
 * Returns words in the difficulty structure format.
 */
export function loadLegacyThemeWords(
  themeName: string,
): LoadedDomainWords | null {
  const themeKey = themeName.toLowerCase();
  if (!(themeKey in THEME_WORDS)) {
    return null;
  }

  const themeWords = THEME_WORDS[themeKey as keyof typeof THEME_WORDS] as {
    simple: string[];
    intermediate: string[];
    hard: string[];
  };

  return {
    simple: themeWords.simple ?? [],
    intermediate: themeWords.intermediate ?? [],
    hard: themeWords.hard ?? [],
  };
}

/**
 * Check if a theme has any vocabulary available (domain-based or legacy).
 */
export function themeHasVocabulary(themeName: string): boolean {
  return themeHasDomains(themeName) || !!loadLegacyThemeWords(themeName);
}
