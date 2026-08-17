import { PlacedWord } from './placement.types.js';
import { GridUtils } from './grid-utils';

export interface PuzzleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export interface WordValidationResult {
  word: string;
  found: boolean;
  row?: number;
  col?: number;
  direction?: string;
}

export class PuzzleValidator {
  static validatePuzzle(
    grid: string[][],
    words: string[],
    placedWords: PlacedWord[]
  ): PuzzleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    const gridValidation = this.validateGrid(grid);
    errors.push(...gridValidation.errors);
    warnings.push(...gridValidation.warnings);

    if (!gridValidation.valid) {
      return {
        valid: false,
        errors,
        warnings,
        score: 0,
      };
    }

    const wordValidation = this.validateWordsPlaced(words, placedWords);
    errors.push(...wordValidation.errors);
    warnings.push(...wordValidation.warnings);
    if (!wordValidation.valid) {
      score = Math.max(0, score - 40);
    }

    const positionValidation = this.validatePositions(grid, placedWords);
    errors.push(...positionValidation.errors);
    warnings.push(...positionValidation.warnings);
    if (!positionValidation.valid) {
      score = Math.max(0, score - 20);
    }

    const consistencyValidation = this.validateConsistency(grid, placedWords);
    warnings.push(...consistencyValidation.warnings);
    if (!consistencyValidation.valid) {
      score = Math.max(0, score - 10);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }

  private static validateGrid(grid: string[][]): PuzzleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (GridUtils.isEmpty(grid)) {
      errors.push('Grid is empty');
      return { valid: false, errors, warnings, score: 0 };
    }

    const firstRowLength = grid[0].length;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i].length !== firstRowLength) {
        errors.push('Row ' + i + ' has length ' + grid[i].length + ', expected ' + firstRowLength);
      }
    }

    const validChars = /^[A-Z]$/;
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        const char = grid[i][j];
        if (!validChars.test(char)) {
          errors.push('Invalid character at (' + i + ', ' + j + '): ' + char);
        }
      }
    }

    if (grid.length < 8 || firstRowLength < 8) {
      warnings.push('Grid size is smaller than recommended minimum (8x8)');
    }
    if (grid.length > 25 || firstRowLength > 25) {
      warnings.push('Grid size is larger than recommended maximum (25x25)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 100 : 70,
    };
  }

  private static validateWordsPlaced(
    words: string[],
    placedWords: PlacedWord[]
  ): PuzzleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const placedWordSet = new Set(placedWords.map((pw) => pw.word));

    for (const word of words) {
      if (!placedWordSet.has(word)) {
        errors.push('Word "' + word + '" was not placed in the grid');
      }
    }

    const wordCounts: Record<string, number> = {};
    for (const pw of placedWords) {
      wordCounts[pw.word] = (wordCounts[pw.word] || 0) + 1;
    }
    for (const [word, count] of Object.entries(wordCounts)) {
      if (count > 1) {
        warnings.push('Word "' + word + '" was placed ' + count + ' times (duplicate)');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 100 : 60,
    };
  }

  private static validatePositions(
    grid: string[][],
    placedWords: PlacedWord[]
  ): PuzzleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const pw of placedWords) {
      if (pw.row < 0 || pw.row >= grid.length || pw.col < 0 || pw.col >= grid[0].length) {
        errors.push('Word "' + pw.word + '" is placed outside grid bounds at (' + pw.row + ', ' + pw.col + ')');
        continue;
      }

      const wordLen = pw.word.length;
      let matches = true;
      for (let i = 0; i < wordLen; i++) {
        const r = pw.row + i * pw.direction.dr;
        const c = pw.col + i * pw.direction.dc;
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) {
          errors.push('Word "' + pw.word + '" extends outside grid at position ' + i);
          matches = false;
          break;
        }
        if (grid[r][c] !== pw.word[i]) {
          errors.push('Word "' + pw.word + '" has mismatch at (' + r + ', ' + c + '): expected ' + pw.word[i] + ', got ' + grid[r][c]);
          matches = false;
          break;
        }
      }

      if (matches) {
        const overlapCount = this.countOverlaps(pw, placedWords);
        if (overlapCount > 3) {
          warnings.push('Word "' + pw.word + '" has ' + overlapCount + ' overlapping letters with other words');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 100 : 80,
    };
  }

  private static validateConsistency(
    grid: string[][],
    placedWords: PlacedWord[]
  ): PuzzleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    let filledCells = 0;
    let totalCells = 0;
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        totalCells++;
        if (grid[i][j] !== '') {
          filledCells++;
        }
      }
    }

    const fillRatio = filledCells / totalCells;
    if (fillRatio < 0.3) {
      warnings.push('Grid has low fill ratio: ' + (fillRatio * 100).toFixed(1) + '% (minimum recommended: 30%)');
    }

    const positions = placedWords.map((pw) => ({ row: pw.row, col: pw.col }));
    const spread = this.calculateSpread(positions, grid.length, grid[0].length);
    if (spread < 0.4) {
      warnings.push('Words are clustered together (spread score: ' + (spread * 100).toFixed(1) + '%)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 100 : 90,
    };
  }

  private static countOverlaps(word: PlacedWord, allWords: PlacedWord[]): number {
    let overlapCount = 0;
    const wordCells = new Set<string>();

    for (let i = 0; i < word.word.length; i++) {
      const r = word.row + i * word.direction.dr;
      const c = word.col + i * word.direction.dc;
      wordCells.add(r + ',' + c);
    }

    for (const other of allWords) {
      if (other.word === word.word && other.row === word.row && other.col === word.col) {
        continue;
      }
      for (let i = 0; i < other.word.length; i++) {
        const r = other.row + i * other.direction.dr;
        const c = other.col + i * other.direction.dc;
        if (wordCells.has(r + ',' + c)) {
          overlapCount++;
        }
      }
    }

    return overlapCount;
  }

  private static calculateSpread(
    positions: { row: number; col: number }[],
    gridRows: number,
    gridCols: number
  ): number {
    if (positions.length === 0) return 0;

    let avgRow = 0;
    let avgCol = 0;
    for (const pos of positions) {
      avgRow += pos.row;
      avgCol += pos.col;
    }
    avgRow /= positions.length;
    avgCol /= positions.length;

    let variance = 0;
    for (const pos of positions) {
      variance += Math.pow(pos.row - avgRow, 2) + Math.pow(pos.col - avgCol, 2);
    }
    variance /= positions.length;

    const maxVariance = (gridRows * gridRows + gridCols * gridCols) / 2;
    return Math.min(1, variance / maxVariance);
  }

  static validateOrThrow(
    grid: string[][],
    words: string[],
    placedWords: PlacedWord[]
  ): void {
    const result = this.validatePuzzle(grid, words, placedWords);
    if (!result.valid) {
      throw new Error('Invalid puzzle: ' + result.errors.join(', '));
    }
  }

  static getValidationSummary(result: PuzzleValidationResult): string {
    const status = result.valid ? 'PASSED' : 'FAILED';

    const lines = [
      'Validation: ' + status,
      'Score: ' + result.score + '/100',
      'Errors: ' + result.errors.length,
      'Warnings: ' + result.warnings.length,
    ];

    if (result.errors.length > 0) {
      lines.push('Errors:');
      result.errors.forEach(function (e) {
        lines.push('  - ' + e);
      });
    }

    if (result.warnings.length > 0) {
      lines.push('Warnings:');
      result.warnings.forEach(function (w) {
        lines.push('  - ' + w);
      });
    }

    return lines.join('\n');
  }
}