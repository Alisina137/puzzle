export interface SolutionWord {
  word: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  direction: string;
}

export interface PuzzleSolution {
  grid: string[][];
  words: SolutionWord[];
  highlightedGrid: string[][];
  solutionHash: string;
}

export interface SolutionVerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  foundWords: string[];
  missingWords: string[];
}