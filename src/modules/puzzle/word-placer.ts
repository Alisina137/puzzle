import { PlacedWord, Direction, PlacementResult, PlacementOptions } from './placement.types.js';
import { GridUtils } from './grid-utils.js';

export class WordPlacer {
  // All 8 directions
  private static readonly DIRECTIONS: Direction[] = [
    { dr: 0, dc: 1, name: 'right' },
    { dr: 0, dc: -1, name: 'left' },
    { dr: 1, dc: 0, name: 'down' },
    { dr: -1, dc: 0, name: 'up' },
    { dr: 1, dc: 1, name: 'down-right' },
    { dr: -1, dc: -1, name: 'up-left' },
    { dr: 1, dc: -1, name: 'down-left' },
    { dr: -1, dc: 1, name: 'up-right' },
  ];

  // Direction groups for better distribution
  private static readonly DIRECTION_GROUPS = {
    horizontal: [
      { dr: 0, dc: 1, name: 'right' },
      { dr: 0, dc: -1, name: 'left' },
    ],
    vertical: [
      { dr: 1, dc: 0, name: 'down' },
      { dr: -1, dc: 0, name: 'up' },
    ],
    diagonal: [
      { dr: 1, dc: 1, name: 'down-right' },
      { dr: -1, dc: -1, name: 'up-left' },
      { dr: 1, dc: -1, name: 'down-left' },
      { dr: -1, dc: 1, name: 'up-right' },
    ],
  };

  /**
   * Place words in the grid
   */
  static placeWords(
    grid: string[][],
    words: string[],
    options: PlacementOptions = {}
  ): PlacementResult {
    const { maxAttempts = 100, allowBackwards = true, randomizeDirection = true } = options;

    const placedWords: PlacedWord[] = [];
    const failedWords: string[] = [];
    const workingGrid = GridUtils.copyGrid(grid);
    let totalAttempts = 0;

    // Sort words by length (longest first for better placement)
    const sortedWords = [...words].sort((a, b) => b.length - a.length);

    for (const word of sortedWords) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < maxAttempts) {
        attempts++;
        totalAttempts++;

        // Get available directions
        let directions = this.getAvailableDirections(workingGrid, word, allowBackwards);

        // Shuffle directions for randomness
        if (randomizeDirection) {
          directions = this.shuffleArray(directions);
        }

        for (const direction of directions) {
          const positions = this.findValidPositions(workingGrid, word, direction);
          
          // Shuffle positions for randomness
          const shuffledPositions = this.shuffleArray(positions);
          
          for (const pos of shuffledPositions) {
            if (this.canPlaceWord(workingGrid, word, pos.row, pos.col, direction)) {
              // Place the word
              this.placeWord(workingGrid, word, pos.row, pos.col, direction);
              placedWords.push({
                word,
                row: pos.row,
                col: pos.col,
                direction: direction,
              });
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
      }

      if (!placed) {
        failedWords.push(word);
      }
    }

    // Fill remaining empty cells with random letters
    this.fillEmptyCells(workingGrid);

    return {
      grid: workingGrid,
      placedWords,
      failedWords,
      attempts: totalAttempts,
    };
  }

  /**
   * Get available directions for a word
   */
  private static getAvailableDirections(
    grid: string[][],
    word: string,
    allowBackwards: boolean
  ): Direction[] {
    let directions = [...this.DIRECTIONS];

    // If backwards is not allowed, remove left, up, and diagonal opposites
    if (!allowBackwards) {
      directions = directions.filter(
        (d) => !(d.dr < 0 || d.dc < 0 || (d.dr < 0 && d.dc < 0))
      );
    }

    // Filter by grid capacity
    directions = directions.filter((d) => {
      const maxRow = grid.length - 1;
      const maxCol = grid[0].length - 1;
      const endRow = d.dr * (word.length - 1);
      const endCol = d.dc * (word.length - 1);
      
      // Check if word fits in grid
      if (d.dr > 0 && endRow > maxRow) return false;
      if (d.dr < 0 && endRow < 0) return false;
      if (d.dc > 0 && endCol > maxCol) return false;
      if (d.dc < 0 && endCol < 0) return false;
      
      return true;
    });

    return directions;
  }

  /**
   * Find valid positions for a word in a direction
   */
  private static findValidPositions(
    grid: string[][],
    word: string,
    direction: Direction
  ): { row: number; col: number }[] {
    const positions: { row: number; col: number }[] = [];
    const rows = grid.length;
    const cols = grid[0].length;
    const wordLen = word.length;

    let startRow = 0;
    let endRow = rows - 1;
    let startCol = 0;
    let endCol = cols - 1;

    // Adjust bounds based on direction
    if (direction.dr > 0) endRow = rows - wordLen;
    if (direction.dr < 0) startRow = wordLen - 1;
    if (direction.dc > 0) endCol = cols - wordLen;
    if (direction.dc < 0) startCol = wordLen - 1;

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        positions.push({ row: r, col: c });
      }
    }

    return positions;
  }

  /**
   * Check if a word can be placed at a position
   */
  private static canPlaceWord(
    grid: string[][],
    word: string,
    row: number,
    col: number,
    direction: Direction
  ): boolean {
    const wordLen = word.length;

    for (let i = 0; i < wordLen; i++) {
      const r = row + i * direction.dr;
      const c = col + i * direction.dc;
      const cell = grid[r][c];

      // Cell must be empty or match the letter
      if (cell !== '' && cell !== word[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Place a word in the grid
   */
  private static placeWord(
    grid: string[][],
    word: string,
    row: number,
    col: number,
    direction: Direction
  ): void {
    const wordLen = word.length;

    for (let i = 0; i < wordLen; i++) {
      const r = row + i * direction.dr;
      const c = col + i * direction.dc;
      grid[r][c] = word[i];
    }
  }

  /**
   * Fill empty cells with random letters
   */
  private static fillEmptyCells(grid: string[][]): void {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        if (grid[i][j] === '') {
          grid[i][j] = letters.charAt(Math.floor(Math.random() * letters.length));
        }
      }
    }
  }

  /**
   * Shuffle an array
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}