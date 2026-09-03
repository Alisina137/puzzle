import {
  PlacedWord,
  Direction,
  PlacementResult,
  PlacementOptions,
} from "./placement.types";
import { GridUtils } from "./grid-utils";

export class WordPlacer {
  // All 8 directions
  private static readonly DIRECTIONS: Direction[] = [
    { dr: 0, dc: 1, name: "right" },
    { dr: 0, dc: -1, name: "left" },
    { dr: 1, dc: 0, name: "down" },
    { dr: -1, dc: 0, name: "up" },
    { dr: 1, dc: 1, name: "down-right" },
    { dr: -1, dc: -1, name: "up-left" },
    { dr: 1, dc: -1, name: "down-left" },
    { dr: -1, dc: 1, name: "up-right" },
  ];

  /**
   * Build a direction pool with an as-even-as-possible distribution.
   *
   * Example: 28 words / 8 directions =
   * right: 4, left: 4, down: 4, up: 4, down-right: 3, up-left: 3, down-left: 3, up-right: 3
   *
   * The directions receiving the extra words are randomized.
   */
  private static buildDirectionPool(
    directions: Direction[],
    wordCount: number,
  ): Direction[] {
    if (directions.length === 0 || wordCount <= 0) {
      return [];
    }

    const pool: Direction[] = [];

    const baseCount = Math.floor(wordCount / directions.length);
    const remainder = wordCount % directions.length;

    // Randomize which directions receive the extra words.
    const shuffledDirections = this.shuffleArray(directions);

    for (let i = 0; i < shuffledDirections.length; i++) {
      const direction = shuffledDirections[i];
      const count = baseCount + (i < remainder ? 1 : 0);

      for (let j = 0; j < count; j++) {
        pool.push(direction);
      }
    }

    // Shuffle the final assignments so directions aren't grouped.
    return this.shuffleArray(pool);
  }

  /**
   * Place words on the grid while maintaining a balanced
   * distribution of directions.
   */
  static placeWords(
    grid: string[][],
    words: string[],
    options: PlacementOptions = {},
  ): PlacementResult {
    const {
      maxAttempts = 200,
      randomizeDirection = true,
      directions,
    } = options;

    // Use supplied directions or all 8 directions.
    let availableDirections = directions
      ? [...directions]
      : [...this.DIRECTIONS];

    availableDirections = this.uniqueDirections(availableDirections);

    const directionCount = availableDirections.length;

    console.log(`[WordPlacer] Direction count: ${directionCount}`);
    console.log(
      `[WordPlacer] Available: ${availableDirections
        .map((d) => d.name)
        .join(", ")}`,
    );

    const result: PlacementResult = {
      grid: GridUtils.copyGrid(grid),
      placedWords: [],
      failedWords: [],
      attempts: 0,
    };

    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    if (rows === 0 || cols === 0) {
      result.failedWords = [...words];
      return result;
    }

    if (availableDirections.length === 0) {
      result.failedWords = [...words];
      return result;
    }

    /**
     * Track how many words have actually been placed
     * in each direction.
     */
    const usedDirections: Record<string, number> = {};

    for (const dir of availableDirections) {
      usedDirections[dir.name] = 0;
    }

    /**
     * Create the direction assignment pool ONCE.
     *
     * This is important. The old implementation changed directions based
     * on totalAttempts. That meant a direction was assigned to an ATTEMPT
     * rather than to a WORD.
     *
     * Now every word gets an intended direction.
     */
    let directionPool = this.buildDirectionPool(
      availableDirections,
      words.length,
    );

    // Log requested distribution.
    const requestedCounts: Record<string, number> = {};

    for (const dir of directionPool) {
      requestedCounts[dir.name] = (requestedCounts[dir.name] || 0) + 1;
    }

    console.log(
      "[WordPlacer] Requested direction distribution:",
      requestedCounts,
    );

    /**
     * Shuffle words so direction assignments are not
     * always associated with the same type/length of word.
     */
    const shuffledWords = this.shuffleArray(words);

    /**
     * If randomizeDirection is false, don't shuffle the
     * direction pool again. Otherwise it was already randomized by
     * buildDirectionPool().
     */
    if (!randomizeDirection) {
      directionPool = this.buildOrderedDirectionPool(
        availableDirections,
        words.length,
      );
    }

    let fallbackPlacements = 0;

    /**
     * Place each word.
     */
    for (let wordIndex = 0; wordIndex < shuffledWords.length; wordIndex++) {
      const word = shuffledWords[wordIndex];

      /**
       * Primary direction assigned to this word.
       */
      const assignedDirection = directionPool[wordIndex];

      if (!assignedDirection) {
        result.failedWords.push(word);
        continue;
      }

      let placed = false;

      /**
       * ✅ INCREASED ATTEMPTS FOR HARDER DIRECTIONS
       *
       * Left, Up, and diagonal directions are harder to place because they
       * require starting positions near the edges. Give them more attempts.
       */
      let attemptsForDirection = maxAttempts;

      // Left and Up are the hardest - double attempts
      if (
        assignedDirection.name === "left" ||
        assignedDirection.name === "up"
      ) {
        attemptsForDirection = maxAttempts * 2;
      }

      // Diagonal directions also need more attempts
      if (
        assignedDirection.name === "down-left" ||
        assignedDirection.name === "up-left" ||
        assignedDirection.name === "down-right" ||
        assignedDirection.name === "up-right"
      ) {
        attemptsForDirection = Math.floor(maxAttempts * 1.5);
      }

      // First try the assigned direction with increased attempts.
      placed = this.tryPlaceWord(
        result,
        word,
        assignedDirection,
        rows,
        cols,
        attemptsForDirection,
      );

      if (placed) {
        usedDirections[assignedDirection.name] =
          (usedDirections[assignedDirection.name] || 0) + 1;
        continue;
      }

      /**
       * ✅ REDUCED FALLBACK FOR HARD DIRECTIONS
       *
       * If the requested direction doesn't work, use fallback directions.
       * But for Left/Up/Diagonal, only allow 1 fallback attempt so they
       * don't get overridden by Right/Down.
       */
      const isHardDirection =
        assignedDirection.name === "left" ||
        assignedDirection.name === "up" ||
        assignedDirection.name === "up-left" ||
        assignedDirection.name === "down-left" ||
        assignedDirection.name === "down-right" ||
        assignedDirection.name === "up-right";

      const fallbackDirections = this.getFallbackDirections(
        availableDirections,
        assignedDirection,
        usedDirections,
      );

      // ✅ For hard directions, only try the first fallback (least used)
      const fallbackLimit = isHardDirection ? 1 : fallbackDirections.length;

      for (
        let i = 0;
        i < Math.min(fallbackLimit, fallbackDirections.length);
        i++
      ) {
        const fallbackDirection = fallbackDirections[i];

        // ✅ Also give more attempts to fallback if it's a hard direction
        let fallbackAttempts = maxAttempts;
        if (
          fallbackDirection.name === "left" ||
          fallbackDirection.name === "up"
        ) {
          fallbackAttempts = maxAttempts * 2;
        } else if (
          fallbackDirection.name === "down-left" ||
          fallbackDirection.name === "up-left" ||
          fallbackDirection.name === "down-right" ||
          fallbackDirection.name === "up-right"
        ) {
          fallbackAttempts = Math.floor(maxAttempts * 1.5);
        }

        placed = this.tryPlaceWord(
          result,
          word,
          fallbackDirection,
          rows,
          cols,
          fallbackAttempts,
        );

        if (placed) {
          usedDirections[fallbackDirection.name] =
            (usedDirections[fallbackDirection.name] || 0) + 1;

          fallbackPlacements++;

          console.log(
            `[WordPlacer] ⚠️ Fallback: ${word} ` +
              `${assignedDirection.name} → ${fallbackDirection.name}`,
          );

          break;
        }
      }

      if (!placed) {
        result.failedWords.push(word);

        console.log(
          `[WordPlacer] ❌ Failed to place: ${word} ` +
            `(requested: ${assignedDirection.name})`,
        );
      }
    }

    console.log("[WordPlacer] Final direction usage:", usedDirections);
    console.log(`[WordPlacer] Fallback placements: ${fallbackPlacements}`);
    console.log(
      `[WordPlacer] Placed: ${result.placedWords.length}/${words.length}, ` +
        `Failed: ${result.failedWords.length}`,
    );

    return result;
  }

  /**
   * Try to place a word using ONE specific direction.
   */
  private static tryPlaceWord(
    result: PlacementResult,
    word: string,
    direction: Direction,
    rows: number,
    cols: number,
    maxAttempts: number,
  ): boolean {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      result.attempts++;

      const position = this.getRandomStartPosition(
        rows,
        cols,
        word.length,
        direction,
      );

      /**
       * Word physically cannot fit in this direction.
       */
      if (!position) {
        return false;
      }

      if (
        this.canPlaceWord(
          result.grid,
          word,
          position.row,
          position.col,
          direction,
        )
      ) {
        this.placeWord(
          result.grid,
          word,
          position.row,
          position.col,
          direction,
        );

        result.placedWords.push({
          word,
          row: position.row,
          col: position.col,
          direction,
        });

        return true;
      }
    }

    return false;
  }

  /**
   * Calculate a valid random starting position for
   * ANY of the 8 directions.
   *
   * This replaces the old complicated negative-direction logic.
   *
   * The function guarantees that the entire word will
   * remain inside the grid.
   */
  private static getRandomStartPosition(
    rows: number,
    cols: number,
    wordLength: number,
    direction: Direction,
  ): { row: number; col: number } | null {
    if (wordLength <= 0 || rows <= 0 || cols <= 0) {
      return null;
    }

    let minRow = 0;
    let maxRow = rows - 1;
    let minCol = 0;
    let maxCol = cols - 1;

    /**
     * Vertical movement.
     */
    if (direction.dr > 0) {
      // DOWN
      maxRow = rows - wordLength;
    } else if (direction.dr < 0) {
      // UP
      minRow = wordLength - 1;
    }

    /**
     * Horizontal movement.
     */
    if (direction.dc > 0) {
      // RIGHT
      maxCol = cols - wordLength;
    } else if (direction.dc < 0) {
      // LEFT
      minCol = wordLength - 1;
    }

    /**
     * If the word doesn't fit, return null.
     */
    if (maxRow < minRow || maxCol < minCol) {
      return null;
    }

    const row = minRow + Math.floor(Math.random() * (maxRow - minRow + 1));
    const col = minCol + Math.floor(Math.random() * (maxCol - minCol + 1));

    return {
      row,
      col,
    };
  }

  /**
   * Return fallback directions ordered by the number
   * of words already placed in them.
   *
   * Least-used directions come first.
   */
  private static getFallbackDirections(
    directions: Direction[],
    excludedDirection: Direction,
    usedDirections: Record<string, number>,
  ): Direction[] {
    return directions
      .filter((direction) => direction.name !== excludedDirection.name)
      .sort((a, b) => {
        const countA = usedDirections[a.name] || 0;
        const countB = usedDirections[b.name] || 0;

        if (countA !== countB) {
          return countA - countB;
        }

        // Random tie breaker.
        return Math.random() - 0.5;
      });
  }

  /**
   * Ordered direction pool used when
   * randomizeDirection === false.
   */
  private static buildOrderedDirectionPool(
    directions: Direction[],
    wordCount: number,
  ): Direction[] {
    if (directions.length === 0 || wordCount <= 0) {
      return [];
    }

    const pool: Direction[] = [];

    const baseCount = Math.floor(wordCount / directions.length);
    const remainder = wordCount % directions.length;

    for (let i = 0; i < directions.length; i++) {
      const count = baseCount + (i < remainder ? 1 : 0);

      for (let j = 0; j < count; j++) {
        pool.push(directions[i]);
      }
    }

    return pool;
  }

  /**
   * Check whether a word can be placed without
   * conflicting with existing letters.
   */
  private static canPlaceWord(
    grid: string[][],
    word: string,
    row: number,
    col: number,
    direction: Direction,
  ): boolean {
    for (let i = 0; i < word.length; i++) {
      const r = row + i * direction.dr;
      const c = col + i * direction.dc;

      /**
       * Extra safety check.
       */
      if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) {
        return false;
      }

      const currentChar = grid[r][c];

      /**
       * Empty cell is fine.
       *
       * Same letter is also fine because it creates
       * a valid overlap.
       */
      if (currentChar !== "" && currentChar !== word[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Write the word onto the grid.
   */
  private static placeWord(
    grid: string[][],
    word: string,
    row: number,
    col: number,
    direction: Direction,
  ): void {
    for (let i = 0; i < word.length; i++) {
      const r = row + i * direction.dr;
      const c = col + i * direction.dc;

      grid[r][c] = word[i];
    }
  }

  /**
   * Remove duplicate directions.
   */
  private static uniqueDirections(directions: Direction[]): Direction[] {
    const seen = new Set<string>();

    return directions.filter((direction) => {
      const key = `${direction.dr},${direction.dc}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
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

// copy
