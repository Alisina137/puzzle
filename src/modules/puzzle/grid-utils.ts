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
  static isValidPosition(grid: string[][], row: number, col: number): boolean {
    return row >= 0 && row < grid.length && col >= 0 && col < grid[row].length;
  }

  static getDimensions(grid: string[][]): { rows: number; cols: number } {
    return {
      rows: grid.length,
      cols: grid.length > 0 ? grid[0].length : 0,
    };
  }

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

  static isEmpty(grid: string[][]): boolean {
    return grid.length === 0 || grid[0].length === 0;
  }

  static isSquare(grid: string[][]): boolean {
    if (this.isEmpty(grid)) return false;
    return grid.length === grid[0].length;
  }

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

  static gridToString(grid: string[][]): string {
    return grid.map(row => row.join(' ')).join('\n');
  }

  static getRow(grid: string[][], rowIndex: number): string[] {
    if (rowIndex < 0 || rowIndex >= grid.length) {
      return [];
    }
    return [...grid[rowIndex]];
  }

  static getColumn(grid: string[][], colIndex: number): string[] {
    const col: string[] = [];
    for (let i = 0; i < grid.length; i++) {
      if (colIndex < grid[i].length) {
        col.push(grid[i][colIndex]);
      }
    }
    return col;
  }

  static getWordCapacity(grid: string[][]): number {
    const { rows, cols } = this.getDimensions(grid);
    return Math.floor((rows * cols) / 4);
  }

  static copyGrid(grid: string[][]): string[][] {
    return grid.map(row => [...row]);
  }
}