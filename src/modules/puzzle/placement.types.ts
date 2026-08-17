export interface PlacedWord {
  word: string;
  row: number;
  col: number;
  direction: Direction;
}

export type Direction = {
  dr: number;
  dc: number;
  name: string;
};

export interface PlacementResult {
  grid: string[][];
  placedWords: PlacedWord[];
  failedWords: string[];
  attempts: number;
}

export interface PlacementOptions {
  maxAttempts?: number;
  allowBackwards?: boolean;
  randomizeDirection?: boolean;
}