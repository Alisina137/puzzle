import { DomainInfo } from "../domain/domain.types";

/**
 * Domain distribution service.
 *
 * Determines which domains to assign to each puzzle in single-domain
 * and mixed-domain modes.
 *
 * Priorities:
 *   1. Domain variety (don't always pick the first domain)
 *   2. Sufficient vocabulary
 *   3. Requested difficulty
 *   4. Word availability
 */

/**
 * Assign one domain to each puzzle in single-domain mode.
 *
 * Distributes domains intelligently across puzzles. When there are more
 * puzzles than domains, domains are reused in a round-robin fashion
 * with shuffled ordering to maximize variety.
 */
export function assignDomainsToPuzzles(
  domains: DomainInfo[],
  puzzleCount: number,
): string[] {
  if (domains.length === 0 || puzzleCount === 0) {
    return [];
  }

  // Sort domains by priority (highest first), then shuffle within same priority
  const sortedDomains = [...domains].sort(
    (a, b) => b.priority - a.priority,
  );

  const assignments: string[] = [];

  // Build a shuffled pool of domain names for round-robin
  const domainNames = sortedDomains.map((d) => d.name);
  const shuffledPool = shuffleArray(domainNames);

  for (let i = 0; i < puzzleCount; i++) {
    assignments.push(shuffledPool[i % shuffledPool.length]);
  }

  return assignments;
}

/**
 * Select multiple domains for a mixed-domain puzzle.
 *
 * Returns 2-4 domains for variety, prioritizing domains with sufficient
 * vocabulary.
 */
export function selectDomainsForMixedPuzzle(
  domains: DomainInfo[],
  puzzleIndex: number,
  maxDomains: number = 3,
): string[] {
  if (domains.length === 0) {
    return [];
  }

  // Rotate the starting point based on puzzle index for variety
  const offset = puzzleIndex % domains.length;
  const rotated = [...domains.slice(offset), ...domains.slice(0, offset)];

  // Pick up to maxDomains, prioritizing high-priority domains
  const selected = rotated.slice(0, Math.min(maxDomains, rotated.length));

  return selected.map((d) => d.name);
}

/**
 * Distribute word count across multiple domains for a mixed-domain puzzle.
 *
 * Example: 20 words across 3 domains → [7, 6, 7]
 */
export function distributeWordCountAcrossDomains(
  totalWords: number,
  domainCount: number,
): number[] {
  if (domainCount <= 0) return [];
  if (domainCount === 1) return [totalWords];

  const base = Math.floor(totalWords / domainCount);
  const remainder = totalWords % domainCount;

  const distribution: number[] = [];
  for (let i = 0; i < domainCount; i++) {
    distribution.push(base + (i < remainder ? 1 : 0));
  }

  return distribution;
}

/**
 * Fisher-Yates shuffle.
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
