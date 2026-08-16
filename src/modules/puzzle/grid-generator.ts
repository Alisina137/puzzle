export interface GridDimensions {
  rows: number;
  cols: number;
}

export interface GridOptions {
  size?: number;
  rows?: number;
  cols?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GridResult {
  grid: string[][];
  dimensions: GridDimensions;
  difficulty: string;
}

export class GridGenerator {
  // Default sizes by difficulty
  private static readonly DIFFICULTY_SIZES = {
    easy: { rows: 10, cols: 10 },
    medium: { rows: 12, cols: 12 },
    hard: { rows: 15, cols: 15 },
  };

  // Minimum and maximum grid sizes
  private static readonly MIN_SIZE = 8;
  private static readonly MAX_SIZE = 20;

  /**
   * Generate a grid with the specified options
   */
  static generate(options: GridOptions = {}): GridResult {
    const { difficulty = 'medium', size, rows, cols } = options;

    // Determine dimensions
    let finalRows: number;
    let finalCols: number;

    if (rows && cols) {
      finalRows = Math.min(Math.max(rows, this.MIN_SIZE), this.MAX_SIZE);
      finalCols = Math.min(Math.max(cols, this.MIN_SIZE), this.MAX_SIZE);
    } else if (size) {
      const s = Math.min(Math.max(size, this.MIN_SIZE), this.MAX_SIZE);
      finalRows = s;
      finalCols = s;
    } else {
      const dims = this.DIFFICULTY_SIZES[difficulty];
      finalRows = dims.rows;
      finalCols = dims.cols;
    }

    // Create empty grid
    const grid = this.createEmptyGrid(finalRows, finalCols);

    // Fill with random letters
    this.fillGrid(grid);

    return {
      grid,
      dimensions: { rows: finalRows, cols: finalCols },
      difficulty,
    };
  }

  /**
   * Create an empty grid with the specified dimensions
   */
  static createEmptyGrid(rows: number, cols: number): string[][] {
    return Array(rows).fill(null).map(() => Array(cols).fill(''));
  }

  /**
   * Fill the grid with random uppercase letters
   */
  static fillGrid(grid: string[][]): void {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        grid[i][j] = letters.charAt(Math.floor(Math.random() * letters.length));
      }
    }
  }

  /**
   * Get recommended size for a given difficulty
   */
  static getSizeForDifficulty(difficulty: 'easy' | 'medium' | 'hard'): GridDimensions {
    return this.DIFFICULTY_SIZES[difficulty];
  }

  /**
   * Validate grid dimensions
   */
  static isValidSize(rows: number, cols: number): boolean {
    return rows >= this.MIN_SIZE && rows <= this.MAX_SIZE &&
           cols >= this.MIN_SIZE && cols <= this.MAX_SIZE;
  }

  /**
   * Get available sizes
   */
  static getAvailableSizes(): number[] {
    const sizes: number[] = [];
    for (let i = this.MIN_SIZE; i <= this.MAX_SIZE; i++) {
      sizes.push(i);
    }
    return sizes;
  }

  /**
   * Create a copy of a grid
   */
  static copyGrid(grid: string[][]): string[][] {
    return grid.map(row => [...row]);
  }
}