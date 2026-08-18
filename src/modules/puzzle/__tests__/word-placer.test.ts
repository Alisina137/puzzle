import { describe, expect, it } from 'vitest';
import { WordPlacer } from '../word-placer';

describe('WordPlacer', () => {
  const createEmptyGrid = (size = 10): string[][] =>
    Array.from({ length: size }, () =>
      Array(size).fill(''),
    );

  it('places words into a grid', () => {
    const grid = createEmptyGrid();

    const result = WordPlacer.placeWords(
      grid,
      ['CAT', 'DOG'],
      {
        randomizeDirection: false,
      },
    );

    expect(result.placedWords.length).toBeGreaterThan(0);
    expect(result.grid).toHaveLength(10);
    expect(result.grid[0]).toHaveLength(10);
  });

  it('records placed words', () => {
    const result = WordPlacer.placeWords(
      createEmptyGrid(),
      ['CAT'],
      {
        randomizeDirection: false,
      },
    );

    expect(result.placedWords).toHaveLength(1);
    expect(result.placedWords[0].word).toBe('CAT');
  });

  it('fills all empty cells', () => {
    const result = WordPlacer.placeWords(
      createEmptyGrid(),
      ['CAT'],
      {
        randomizeDirection: false,
      },
    );

    for (const row of result.grid) {
      for (const cell of row) {
        expect(cell).toMatch(/^[A-Z]$/);
      }
    }
  });

  it('does not modify the original grid', () => {
    const grid = createEmptyGrid();

    WordPlacer.placeWords(
      grid,
      ['CAT'],
      {
        randomizeDirection: false,
      },
    );

    expect(grid.every(row => row.every(cell => cell === ''))).toBe(
      true,
    );
  });

  it('reports failed words when they cannot fit', () => {
    const grid = createEmptyGrid(3);

    const result = WordPlacer.placeWords(
      grid,
      ['THISWORDISTOOLONG'],
      {
        maxAttempts: 5,
        randomizeDirection: false,
      },
    );

    expect(result.failedWords).toContain('THISWORDISTOOLONG');
    expect(result.placedWords).toHaveLength(0);
  });

  it('sorts words by length before placement', () => {
    const result = WordPlacer.placeWords(
      createEmptyGrid(),
      ['CAT', 'ELEPHANT', 'DOG'],
      {
        randomizeDirection: false,
      },
    );

    expect(result.placedWords.length).toBeGreaterThan(0);

    if (result.placedWords.length > 1) {
      expect(result.placedWords[0].word).toBe('ELEPHANT');
    }
  });

  it('tracks the number of attempts', () => {
    const result = WordPlacer.placeWords(
      createEmptyGrid(),
      ['CAT', 'DOG'],
      {
        randomizeDirection: false,
      },
    );

    expect(result.attempts).toBeGreaterThan(0);
  });
});
