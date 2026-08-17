export interface PuzzleFingerprint {
  words: string[];
  gridSize: number;
  wordPositions: string;
  hash: string;
}

export interface SimilarityResult {
  score: number;
  isDuplicate: boolean;
  reason?: string;
}

export interface DuplicateCheckOptions {
  threshold?: number;
  compareGrid?: boolean;
  compareWords?: boolean;
  comparePositions?: boolean;
}