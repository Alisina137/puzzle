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
   * Place words in the grid.
   */
  static placeWords(
    grid: string[][],
    words: string[],
    options: PlacementOptions = {},
  ): PlacementResult {
    const {
      maxAttempts = 200,
      allowBackwards = true,
      randomizeDirection = true,
      directions,
    } = options;

    // Use custom directions if provided, otherwise use all 8 directions
    let availableDirections = directions
      ? [...directions]
      : [...this.DIRECTIONS];

    // Remove duplicates
    availableDirections = this.uniqueDirections(availableDirections);

    console.log(
      "[WordPlacer] Using directions:",
      availableDirections.map((d) => d.name).join(", "),
    );
    console.log("[WordPlacer] allowBackwards:", allowBackwards);

    // If backwards is not allowed, filter out backward directions
    if (!allowBackwards) {
      const forwardDirections = availableDirections.filter(
        (d) => d.dr >= 0 && d.dc >= 0,
      );
      console.log(
        "[WordPlacer] Backwards disabled. Using only forward directions:",
        forwardDirections.map((d) => d.name).join(", "),
      );

      // If no forward directions left, use all available
      if (forwardDirections.length > 0) {
        availableDirections = forwardDirections;
      }
    }

    console.log(
      "[WordPlacer] Final directions:",
      availableDirections.map((d) => d.name).join(", "),
    );

    const result: PlacementResult = {
      grid: GridUtils.copyGrid(grid),
      placedWords: [],
      failedWords: [],
      attempts: 0,
    };

    const rows = grid.length;
    const cols = grid[0].length;

    if (rows === 0 || cols === 0) {
      result.failedWords = [...words];
      return result;
    }

    // Track direction usage
    const usedDirections: Record<string, number> = {};
    for (const dir of availableDirections) {
      usedDirections[dir.name] = 0;
    }

    // Shuffle words for variety
    const shuffledWords = this.shuffleArray(words);

    for (const word of shuffledWords) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < maxAttempts) {
        attempts++;
        result.attempts++;

        // Random starting position
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);

        // Sort directions by usage (least used first)
        const sortedDirections = [...availableDirections].sort((a, b) => {
          return (usedDirections[a.name] || 0) - (usedDirections[b.name] || 0);
        });

        // Shuffle for randomness among same usage
        const shuffledDirections = randomizeDirection
          ? this.shuffleArray(sortedDirections)
          : sortedDirections;

        for (const dir of shuffledDirections) {
          // Calculate the actual start position for this direction
          let startRow = row;
          let startCol = col;

          // For negative directions, the random position is the END of the word
          if (dir.dr < 0) {
            startRow = row - (word.length - 1);
          }
          if (dir.dc < 0) {
            startCol = col - (word.length - 1);
          }

          // Check bounds
          if (startRow < 0 || startRow >= rows) continue;
          if (startCol < 0 || startCol >= cols) continue;
          if (startRow + (word.length - 1) * dir.dr < 0) continue;
          if (startRow + (word.length - 1) * dir.dr >= rows) continue;
          if (startCol + (word.length - 1) * dir.dc < 0) continue;
          if (startCol + (word.length - 1) * dir.dc >= cols) continue;

          if (this.canPlaceWord(result.grid, word, startRow, startCol, dir)) {
            this.placeWord(result.grid, word, startRow, startCol, dir);
            result.placedWords.push({
              word,
              row: startRow,
              col: startCol,
              direction: dir,
            });
            usedDirections[dir.name] = (usedDirections[dir.name] || 0) + 1;
            placed = true;
            break;
          }
        }
      }

      if (!placed) {
        result.failedWords.push(word);
        console.log(`[WordPlacer] ❌ Failed to place: ${word}`);
      }
    }

    // Fill empty cells
    this.fillEmptyCells(result.grid);

    // Log results
    const usedDirNames = Object.keys(usedDirections).filter(
      (k) => usedDirections[k] > 0,
    );
    console.log(
      "[WordPlacer] Direction usage:",
      JSON.stringify(usedDirections, null, 2),
    );
    console.log(
      "[WordPlacer] Used directions:",
      usedDirNames.join(", ") || "none",
    );
    console.log(
      `[WordPlacer] Placed: ${result.placedWords.length}/${words.length}, Failed: ${result.failedWords.length}`,
    );

    return result;
  }

  private static canPlaceWord(
    grid: string[][],
    word: string,
    row: number,
    col: number,
    direction: Direction,
  ): boolean {
    const wordLen = word.length;

    for (let i = 0; i < wordLen; i++) {
      const r = row + i * direction.dr;
      const c = col + i * direction.dc;

      if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) {
        return false;
      }

      const cell = grid[r][c];
      if (cell !== "" && cell !== word[i]) {
        return false;
      }
    }

    return true;
  }

  private static placeWord(
    grid: string[][],
    word: string,
    row: number,
    col: number,
    direction: Direction,
  ): void {
    const wordLen = word.length;

    for (let i = 0; i < wordLen; i++) {
      const r = row + i * direction.dr;
      const c = col + i * direction.dc;
      grid[r][c] = word[i];
    }
  }

  private static fillEmptyCells(grid: string[][]): void {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === "") {
          grid[row][col] = letters.charAt(
            Math.floor(Math.random() * letters.length),
          );
        }
      }
    }
  }

  private static uniqueDirections(directions: Direction[]): Direction[] {
    const seen = new Set<string>();
    const result: Direction[] = [];

    for (const dir of directions) {
      if (!seen.has(dir.name)) {
        seen.add(dir.name);
        result.push(dir);
      }
    }

    return result;
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
