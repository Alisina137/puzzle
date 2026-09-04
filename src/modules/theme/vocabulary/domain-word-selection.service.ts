import {
  LoadedDomainWords,
  WordSelectionMode,
  DomainSelectionResult,
} from "../domain/domain.types";
import { getEligibleDifficultyPools } from "./difficulty-pools";
import {
  loadDomainWords,
  loadMultipleDomainWords,
  loadLegacyThemeWords,
  themeHasDomains,
} from "./word-list-loader";
import {
  selectDomainsForMixedPuzzle,
  distributeWordCountAcrossDomains,
} from "./domain-distribution.service";

export interface DomainWordSelectionOptions {
  theme: string;
  domain?: string;
  domains?: string[];
  mode: WordSelectionMode;
  wordsPerPuzzle: number;
  bookDifficulty: string;
  usedWords: string[];
  minWordLength: number;
  maxWordLength: number;
  gridSize: number;
  puzzleIndex?: number;
}

/**
 * Domain-aware word selection service.
 *
 * This service enforces the book's difficulty as a HARD constraint on which
 * vocabulary difficulty arrays can supply puzzle words. It integrates with
 * the existing global word reuse (usedWords) system.
 *
 * The selection order is:
 *   Book difficulty → Determine allowed pools → Select domain(s) →
 *   Load domain JSON → Read ONLY allowed arrays → Filter used words →
 *   Filter grid-incompatible candidates → Select words
 */
export class DomainWordSelectionService {
  /**
   * Select words for a single puzzle based on domain and difficulty constraints.
   */
  static selectWords(
    options: DomainWordSelectionOptions,
  ): DomainSelectionResult {
    const {
      theme,
      mode,
      wordsPerPuzzle,
      bookDifficulty,
      usedWords,
      minWordLength,
      maxWordLength,
      gridSize,
      puzzleIndex = 0,
    } = options;

    // Step 1: Determine allowed difficulty pools (HARD constraint)
    const eligiblePools = getEligibleDifficultyPools(bookDifficulty);

    if (mode === "single-domain") {
      return this.selectSingleDomain(
        theme,
        options.domain ?? "",
        wordsPerPuzzle,
        eligiblePools,
        usedWords,
        minWordLength,
        maxWordLength,
        gridSize,
      );
    } else {
      return this.selectMixedDomain(
        theme,
        options.domains ?? [],
        wordsPerPuzzle,
        eligiblePools,
        usedWords,
        minWordLength,
        maxWordLength,
        gridSize,
        puzzleIndex,
      );
    }
  }

  /**
   * Select words from a single domain.
   */
  private static selectSingleDomain(
    theme: string,
    domain: string,
    wordsPerPuzzle: number,
    eligiblePools: string[],
    usedWords: string[],
    minWordLength: number,
    maxWordLength: number,
    gridSize: number,
  ): DomainSelectionResult {
    const domainWords = this.loadDomainEligibleWords(
      theme,
      [domain],
      eligiblePools,
    );

    const available = this.filterWords(
      domainWords,
      usedWords,
      minWordLength,
      maxWordLength,
      gridSize,
    );

    const selected = this.shuffleAndSelect(available, wordsPerPuzzle);

    return {
      words: selected,
      domain,
      domains: [domain],
      mode: "single-domain",
      eligiblePoolCount: available.length,
      shortage: selected.length < wordsPerPuzzle,
      shortageAmount: wordsPerPuzzle - selected.length,
    };
  }

  /**
   * Select words from multiple domains (mixed mode).
   */
  private static selectMixedDomain(
    theme: string,
    domains: string[],
    wordsPerPuzzle: number,
    eligiblePools: string[],
    usedWords: string[],
    minWordLength: number,
    maxWordLength: number,
    gridSize: number,
    puzzleIndex: number,
  ): DomainSelectionResult {
    if (domains.length === 0) {
      return {
        words: [],
        domain: "",
        domains: [],
        mode: "mixed-domain",
        eligiblePoolCount: 0,
        shortage: true,
        shortageAmount: wordsPerPuzzle,
      };
    }

    // Distribute word count across domains
    const distribution = distributeWordCountAcrossDomains(
      wordsPerPuzzle,
      domains.length,
    );

    const allSelected: string[] = [];
    const contributingDomains: string[] = [];
    let totalAvailable = 0;

    for (let i = 0; i < domains.length; i++) {
      const domainWords = this.loadDomainEligibleWords(
        theme,
        [domains[i]],
        eligiblePools,
      );

      const available = this.filterWords(
        domainWords,
        [...usedWords, ...allSelected],
        minWordLength,
        maxWordLength,
        gridSize,
      );

      totalAvailable += available.length;
      const count = Math.min(distribution[i], available.length);
      const selected = this.shuffleAndSelect(available, count);

      if (selected.length > 0) {
        allSelected.push(...selected);
        contributingDomains.push(domains[i]);
      }
    }

    // If we still need more words, try to get them from any domain
    if (allSelected.length < wordsPerPuzzle) {
      const allDomainWords = this.loadDomainEligibleWords(
        theme,
        domains,
        eligiblePools,
      );
      const remaining = this.filterWords(
        allDomainWords,
        [...usedWords, ...allSelected],
        minWordLength,
        maxWordLength,
        gridSize,
      );
      const needed = wordsPerPuzzle - allSelected.length;
      const extra = this.shuffleAndSelect(remaining, needed);
      allSelected.push(...extra);
    }

    return {
      words: allSelected,
      domain: contributingDomains[0] ?? "",
      domains: contributingDomains,
      mode: "mixed-domain",
      eligiblePoolCount: totalAvailable,
      shortage: allSelected.length < wordsPerPuzzle,
      shortageAmount: wordsPerPuzzle - allSelected.length,
    };
  }

  /**
   * Load eligible words from domain(s), respecting the allowed difficulty pools.
   * Falls back to legacy theme words if no domain files exist.
   */
  private static loadDomainEligibleWords(
    theme: string,
    domains: string[],
    eligiblePools: string[],
  ): string[] {
    let loaded: LoadedDomainWords | null = null;

    if (themeHasDomains(theme)) {
      if (domains.length === 1) {
        loaded = loadDomainWords(theme, domains[0]);
      } else {
        loaded = loadMultipleDomainWords(theme, domains);
      }
    }

    // Fallback to legacy theme words
    if (!loaded) {
      loaded = loadLegacyThemeWords(theme);
    }

    if (!loaded) {
      return [];
    }

    // Read ONLY the allowed difficulty arrays
    let words: string[] = [];
    for (const pool of eligiblePools) {
      if (pool === "simple") {
        words.push(...loaded.simple);
      } else if (pool === "intermediate") {
        words.push(...loaded.intermediate);
      } else if (pool === "hard") {
        words.push(...loaded.hard);
      }
    }

    return words;
  }

  /**
   * Filter words by used words, length constraints, and grid fit.
   */
  private static filterWords(
    words: string[],
    usedWords: string[],
    minWordLength: number,
    maxWordLength: number,
    gridSize: number,
  ): string[] {
    const usedSet = new Set(usedWords.map((w) => w.toUpperCase()));

    return words
      .map((w) => w.trim().toUpperCase())
      .filter((w) => {
        // Must be A-Z only
        if (!/^[A-Z]+$/.test(w)) return false;
        // Length constraints
        if (w.length < minWordLength || w.length > maxWordLength) return false;
        // Must fit in grid
        if (w.length > gridSize) return false;
        // Must not be already used
        if (usedSet.has(w)) return false;
        return true;
      });
  }

  /**
   * Shuffle and select up to count words.
   * Uses length-aware distribution for better grid placement.
   */
  private static shuffleAndSelect(
    words: string[],
    count: number,
  ): string[] {
    if (words.length === 0 || count <= 0) return [];

    const shuffled = this.shuffleArray(words);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Check if a domain has enough eligible words for the requested count.
   */
  static hasEnoughWords(
    theme: string,
    domain: string,
    bookDifficulty: string,
    needed: number,
    usedWords: string[],
    minWordLength: number,
    maxWordLength: number,
    gridSize: number,
  ): boolean {
    const eligiblePools = getEligibleDifficultyPools(bookDifficulty);
    const domainWords = this.loadDomainEligibleWords(
      theme,
      [domain],
      eligiblePools,
    );
    const available = this.filterWords(
      domainWords,
      usedWords,
      minWordLength,
      maxWordLength,
      gridSize,
    );
    return available.length >= needed;
  }

  /**
   * Fisher-Yates shuffle.
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
