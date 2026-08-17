import { PuzzleFingerprint, SimilarityResult, DuplicateCheckOptions } from './duplicate.types.js';
import { PlacedWord } from './placement.types.js';
import { GridUtils } from './grid-utils.js';

export class DuplicateDetector {
  // Default similarity threshold (80% or higher = duplicate)
  private static readonly DEFAULT_THRESHOLD = 0.8;

  /**
   * Create a fingerprint for a puzzle
   */
  static createFingerprint(
    grid: string[][],
    words: string[],
    placedWords: PlacedWord[]
  ): PuzzleFingerprint {
    // Sort words for consistent comparison
    const sortedWords = [...words].sort();
    
    // Create a string representation of word positions
    const positions = placedWords
      .map((pw) => {
        return pw.word + ':' + pw.row + ',' + pw.col + ',' + pw.direction.dr + ',' + pw.direction.dc;
      })
      .sort()
      .join('|');

    // Create a simple hash
    const content = sortedWords.join('') + grid.length + grid[0].length + positions;
    const hash = this.simpleHash(content);

    return {
      words: sortedWords,
      gridSize: grid.length,
      wordPositions: positions,
      hash: hash,
    };
  }

  /**
   * Compare two puzzles for similarity
   */
  static comparePuzzles(
    fingerprint1: PuzzleFingerprint,
    fingerprint2: PuzzleFingerprint,
    options: DuplicateCheckOptions = {}
  ): SimilarityResult {
    const { threshold = this.DEFAULT_THRESHOLD, compareGrid = true, compareWords = true, comparePositions = true } = options;

    let matchCount = 0;
    let totalChecks = 0;

    // Compare grid size
    if (compareGrid) {
      totalChecks++;
      if (fingerprint1.gridSize === fingerprint2.gridSize) {
        matchCount++;
      }
    }

    // Compare words
    if (compareWords) {
      totalChecks++;
      const words1 = new Set(fingerprint1.words);
      const words2 = new Set(fingerprint2.words);
      let wordMatches = 0;
      for (const word of words1) {
        if (words2.has(word)) {
          wordMatches++;
        }
      }
      const wordSimilarity = wordMatches / Math.max(words1.size, words2.size);
      if (wordSimilarity >= threshold) {
        matchCount++;
      }
    }

    // Compare positions
    if (comparePositions) {
      totalChecks++;
      if (fingerprint1.wordPositions === fingerprint2.wordPositions) {
        matchCount++;
      }
    }

    // Calculate overall similarity
    const similarity = totalChecks > 0 ? matchCount / totalChecks : 0;

    return {
      score: similarity,
      isDuplicate: similarity >= threshold,
      reason: similarity >= threshold ? 'Puzzle exceeds similarity threshold' : 'Puzzle is sufficiently different',
    };
  }

  /**
   * Check if a new puzzle is a duplicate of existing puzzles
   */
  static isDuplicate(
    newFingerprint: PuzzleFingerprint,
    existingFingerprints: PuzzleFingerprint[],
    options: DuplicateCheckOptions = {}
  ): SimilarityResult | null {
    if (existingFingerprints.length === 0) {
      return null;
    }

    // Check if the hash matches exactly (fast path)
    const exactMatch = existingFingerprints.find((f) => f.hash === newFingerprint.hash);
    if (exactMatch) {
      return {
        score: 1.0,
        isDuplicate: true,
        reason: 'Exact match found',
      };
    }

    // Compare with each existing puzzle
    let highestSimilarity = 0;
    let mostSimilar: SimilarityResult | null = null;

    for (const existing of existingFingerprints) {
      const result = this.comparePuzzles(newFingerprint, existing, options);
      if (result.score > highestSimilarity) {
        highestSimilarity = result.score;
        mostSimilar = result;
      }
    }

    return mostSimilar;
  }

  /**
   * Simple hash function
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Batch check for duplicates
   */
  static findDuplicates(
    fingerprints: PuzzleFingerprint[],
    options: DuplicateCheckOptions = {}
  ): Map<number, number[]> {
    const duplicates = new Map<number, number[]>();

    for (let i = 0; i < fingerprints.length; i++) {
      const similarIndices: number[] = [];
      for (let j = i + 1; j < fingerprints.length; j++) {
        const result = this.comparePuzzles(fingerprints[i], fingerprints[j], options);
        if (result.isDuplicate) {
          similarIndices.push(j);
        }
      }
      if (similarIndices.length > 0) {
        duplicates.set(i, similarIndices);
      }
    }

    return duplicates;
  }

  /**
   * Get a summary of duplicate detection results
   */
  static getDuplicateSummary(
    newFingerprint: PuzzleFingerprint,
    existingFingerprints: PuzzleFingerprint[]
  ): string {
    const result = this.isDuplicate(newFingerprint, existingFingerprints);
    if (!result) {
      return 'No existing puzzles to compare against.';
    }

    const status = result.isDuplicate ? 'DUPLICATE DETECTED' : 'UNIQUE';
    const lines = [
      'Duplicate Check Result: ' + status,
      'Similarity Score: ' + (result.score * 100).toFixed(1) + '%',
      'Threshold: ' + (this.DEFAULT_THRESHOLD * 100).toFixed(0) + '%',
    ];

    if (result.reason) {
      lines.push('Reason: ' + result.reason);
    }

    return lines.join('\n');
  }
}