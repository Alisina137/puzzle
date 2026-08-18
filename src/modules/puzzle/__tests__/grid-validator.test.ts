import { describe, expect, it } from 'vitest';
import { GridValidator } from '../grid-validator';

describe('GridValidator', () => {
  describe('validate', () => {
    it('accepts a valid grid', () => {
      const grid = Array.from({ length: 10 }, () =>
        Array(10).fill('A'),
      );

      const result = GridValidator.validate(grid);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects an empty grid', () => {
      const result = GridValidator.validate([]);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Grid is empty');
    });

    it('rejects rows with different lengths', () => {
      const grid = [
        ['A', 'B', 'C'],
        ['D', 'E'],
      ];

      const result = GridValidator.validate(grid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Row 1 has length 2, expected 3',
      );
    });

    it('rejects invalid characters', () => {
      const grid = Array.from({ length: 10 }, () =>
        Array(10).fill('A'),
      );

      grid[2][3] = '1';

      const result = GridValidator.validate(grid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Invalid character at (2, 3): '1'",
      );
    });

    it('rejects lowercase characters', () => {
      const grid = Array.from({ length: 10 }, () =>
        Array(10).fill('A'),
      );

      grid[0][0] = 'a';

      const result = GridValidator.validate(grid);

      expect(result.valid).toBe(false);
    });

    it('allows empty cells', () => {
      const grid = Array.from({ length: 10 }, () =>
        Array(10).fill(''),
      );

      grid[0][0] = 'A';

      const result = GridValidator.validate(grid);

      expect(result.valid).toBe(true);
    });

    it('warns when the grid is smaller than 8x8', () => {
      const grid = Array.from({ length: 5 }, () =>
        Array(5).fill('A'),
      );

      const result = GridValidator.validate(grid);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Grid size is smaller than recommended minimum (8x8)',
      );
    });

    it('warns when the grid is larger than 25x25', () => {
      const grid = Array.from({ length: 26 }, () =>
        Array(26).fill('A'),
      );

      const result = GridValidator.validate(grid);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Grid size is larger than recommended maximum (25x25)',
      );
    });
  });

  describe('validateOrThrow', () => {
    it('does not throw for a valid grid', () => {
      const grid = Array.from({ length: 10 }, () =>
        Array(10).fill('A'),
      );

      expect(() => GridValidator.validateOrThrow(grid)).not.toThrow();
    });

    it('throws for an invalid grid', () => {
      expect(() => GridValidator.validateOrThrow([])).toThrow(
        'Invalid grid: Grid is empty',
      );
    });
  });
});
