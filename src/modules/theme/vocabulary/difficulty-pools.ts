import { BookDifficulty, VocabularyDifficulty } from "../domain/domain.types";

/**
 * Centralized difficulty-to-pool mapping.
 *
 * This is the SINGLE authoritative implementation that determines which
 * vocabulary difficulty arrays are eligible based on the book's difficulty.
 *
 * Rules:
 *   Easy   → simple only
 *   Medium → simple + intermediate
 *   Hard   → hard only
 *   Expert → hard only
 *
 * The book difficulty is a HARD constraint. If a pool is not listed here,
 * words from that pool MUST NOT be selected.
 */
export function getEligibleDifficultyPools(
  bookDifficulty: string,
): VocabularyDifficulty[] {
  switch (bookDifficulty?.toLowerCase()) {
    case "easy":
      return ["simple"];

    case "medium":
      return ["simple", "intermediate"];

    case "hard":
      return ["hard"];

    case "expert":
      return ["hard"];

    default:
      // Fallback: treat unknown difficulty as medium
      return ["simple", "intermediate"];
  }
}

/**
 * Check whether a given vocabulary difficulty pool is eligible for a book difficulty.
 */
export function isPoolEligible(
  pool: VocabularyDifficulty,
  bookDifficulty: string,
): boolean {
  return getEligibleDifficultyPools(bookDifficulty).includes(pool);
}

/**
 * Get a human-readable description of the eligible pools for logging.
 */
export function describeEligiblePools(bookDifficulty: string): string {
  const pools = getEligibleDifficultyPools(bookDifficulty);
  return pools.join(", ");
}
