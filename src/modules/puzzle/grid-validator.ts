import { GridUtils } from "./grid-utils";

export interface GridValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class GridValidator {
  /**
   * Validate a grid
   */
  static validate(grid: string[][]): GridValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if grid is empty
    if (GridUtils.isEmpty(grid)) {
      errors.push("Grid is empty");
      return { valid: false, errors, warnings };
    }

    // Check if all rows have the same length
    const firstRowLength = grid[0].length;

    for (let i = 0; i < grid.length; i++) {
      if (grid[i].length !== firstRowLength) {
        errors.push(
          `Row ${i} has length ${grid[i].length}, expected ${firstRowLength}`,
        );
      }
    }

    // Check if grid contains only uppercase letters or empty cells
    const validChars = /^[A-Z]?$/;

    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        const char = grid[i][j];

        if (char !== "" && !validChars.test(char)) {
          errors.push(`Invalid character at (${i}, ${j}): '${char}'`);
        }
      }
    }

    // Check if grid is too small
    if (grid.length < 8 || firstRowLength < 8) {
      warnings.push("Grid size is smaller than recommended minimum (8x8)");
    }

    // Check if grid is too large
    if (grid.length > 25 || firstRowLength > 25) {
      warnings.push("Grid size is larger than recommended maximum (25x25)");
    }

    // Check if grid has enough cells for words
    const totalCells = grid.length * firstRowLength;

    if (totalCells < 20) {
      warnings.push("Grid has very few cells, may not support many words");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Quick validation (throws error if invalid)
   */
  static validateOrThrow(grid: string[][]): void {
    const result = this.validate(grid);

    if (!result.valid) {
      throw new Error(`Invalid grid: ${result.errors.join(", ")}`);
    }
  }
}
