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
  const sortedDomains = [...domains].sort((a, b) => b.priority - a.priority);

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
 * Precompute domain groups for ALL puzzles in mixed-domain mode, in one
 * call before the generation loop starts (mirrors assignDomainsToPuzzles
 * above). Replaces the old selectDomainsForMixedPuzzle, which computed a
 * "sliding window" per puzzle index — domains [1,2,3], then [2,3,4], then
 * [3,4,5]... — so every domain bled into 3 consecutive puzzles and
 * vocabulary felt repetitive even though the domain list technically
 * changed each time.
 *
 * This version instead:
 *   1. Shuffles all domains once and cuts them into non-overlapping
 *      groups of `domainsPerPuzzle`.
 *   2. A domain can't be picked again until every other domain has had
 *      a turn (one full "cycle").
 *   3. If a cycle doesn't divide evenly, the leftover domains aren't
 *      shipped as a short group — they're merged into the FIRST group
 *      of the next cycle instead, so one puzzle briefly gets a few extra
 *      domains rather than any puzzle getting fewer than normal.
 *   4. Once a cycle is exhausted, domains are reshuffled for the next
 *      cycle.
 */
export function assignDomainGroupsForMixedPuzzles(
  domains: DomainInfo[],
  puzzleCount: number,
  domainsPerPuzzle: number = 3,
): string[][] {
  if (domains.length === 0 || puzzleCount === 0) {
    return [];
  }

  const domainNames = domains.map((d) => d.name);

  // Not enough distinct domains to ever form a full group — every
  // puzzle just uses the whole set.
  if (domainNames.length <= domainsPerPuzzle) {
    return Array.from({ length: puzzleCount }, () => [...domainNames]);
  }

  const groups: string[][] = [];
  let pool: string[] = shuffleArray(domainNames);
  let pendingCarryover: string[] = [];

  // Safety valve: guarantees termination even in pathological cases
  // (e.g. domainsPerPuzzle very close to domainNames.length) instead of
  // risking an infinite loop.
  const maxIterations = (puzzleCount + domainNames.length) * 4;
  let iterations = 0;

  while (groups.length < puzzleCount) {
    iterations++;
    if (iterations > maxIterations) {
      // Should not happen in practice; fail safe rather than hang.
      const fallback = pendingCarryover.length > 0 ? pendingCarryover : pool;
      groups.push(fallback.length > 0 ? fallback : [domainNames[0]]);
      pendingCarryover = [];
      pool = shuffleArray(domainNames);
      continue;
    }

    if (pool.length === 0) {
      // Cycle complete — reshuffle, excluding anything already queued
      // as carryover so it isn't picked again immediately.
      pool = shuffleArray(
        domainNames.filter((d) => !pendingCarryover.includes(d)),
      );
    }

    const takeCount = Math.min(domainsPerPuzzle, pool.length);
    let group = pool.splice(0, takeCount);

    if (group.length < domainsPerPuzzle && pool.length === 0) {
      // End of a cycle with leftovers — stash for the next cycle's
      // first group instead of shipping this short.
      pendingCarryover =
        pendingCarryover.length > 0 ? [...pendingCarryover, ...group] : group;
      continue;
    }

    if (pendingCarryover.length > 0) {
      group = [...pendingCarryover, ...group];
      pendingCarryover = [];
    }

    groups.push(group);
  }

  return groups;
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
