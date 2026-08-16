export interface GridPosition {
  row: number;
  col: number;
}

export interface GridBounds {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export class GridUtils {
  /**
   * Check if a position is within grid bounds
   */
  static isValidPosition(grid: string[][], row: number, col: number): boolean {
    return row >= 0 && row < grid.length && col >= 0 && col < grid[row].length;
  }

  /**
   * Get the dimensions of a grid
   */
  static getDimensions(grid: string[][]): { rows: number; cols: number } {
    return {
      rows: grid.length,
      cols: grid.length > 0 ? grid[0].length : 0,
    };
  }

  /**
   * Get all neighboring positions
   */
  static getNeighbors(grid: string[][], row: number, col: number): GridPosition[] {
    const neighbors: GridPosition[] = [];
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1],
    ];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (this.isValidPosition(grid, newRow, newCol)) {
        neighbors.push({ row: newRow, col: newCol });
      }
    }

    return neighbors;
  }

  /**
   * Get a subgrid
   */
  static getSubgrid(grid: string[][], startRow: number, startCol: number, rows: number, cols: number): string[][] {
    const subgrid: string[][] = [];
    for (let i = startRow; i < startRow + rows && i < grid.length; i++) {
      const row: string[] = [];
      for (let j = startCol; j < startCol + cols && j < grid[i].length; j++) {
        row.push(grid[i][j]);
      }
      subgrid.push(row);
    }
    return subgrid;
  }

  /**
   * Check if a grid is empty
   */
  static isEmpty(grid: string[][]): boolean {
    return grid.length === 0 || grid[0].length === 0;
  }

  /**
   * Check if a grid is square
   */
  static isSquare(grid: string[][]): boolean {
    if (this.isEmpty(grid)) return false;
    return grid.length === grid[0].length;
  }

  /**
   * Get the bounds of non-empty cells
   */
  static getNonEmptyBounds(grid: string[][]): GridBounds | null {
    let minRow = Infinity;
    let maxRow = -Infinity;
    let minCol = Infinity;
    let maxCol = -Infinity;
    let hasContent = false;

    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        if (grid[i][j] !== '' && grid[i][j] !== null) {
          hasContent = true;
          minRow = Math.min(minRow, i);
          maxRow = Math.max(maxRow, i);
          minCol = Math.min(minCol, j);
          maxCol = Math.max(maxCol, j);
        }
      }
    }

    if (!hasContent) {
      return null;
    }

    return { minRow, maxRow, minCol, maxCol };
  }

  /**
   * Convert grid to string for display
   */
  static gridToString(grid: string[][]): string {
    return grid.map(row => row.join(' ')).join('\n');
  }

  /**
   * Get a specific row
   */
  static getRow(grid: string[][], rowIndex: number): string[] {
    if (rowIndex < 0 || rowIndex >= grid.length) {
      return [];
    }
    return [...grid[rowIndex]];
  }

  /**
   * Get a specific column
   */
  static getColumn(grid: string[][], colIndex: number): string[] {
    const col: string[] = [];
    for (let i = 0; i < grid.length; i++) {
      if (colIndex < grid[i].length) {
        col.push(grid[i][colIndex]);
      }
    }
    return col;
  }

  /**
   * Get the average word length capacity of the grid
   */
  static getWordCapacity(grid: string[][]): number {
    const { rows, cols } = this.getDimensions(grid);
    // Estimate: each word takes about 3-4 cells on average
    return Math.floor((rows * cols) / 4);
  }
}