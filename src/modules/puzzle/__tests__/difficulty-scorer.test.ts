import { describe, it, expect } from "vitest";
import { DifficultyScorer } from "../difficulty-scorer.service";

describe("DifficultyScorer", () => {
  describe("calculateScore", () => {
    it("should calculate a score for a puzzle", () => {
      const factors = {
        gridSize: 10,
        wordCount: 8,
        minWordLength: 3,
        maxWordLength: 6,
        directions: 4,
        allowReverse: false,
        overlap: "low" as const,
        vocabularyLevel: "simple" as const,
      };

      const result = DifficultyScorer.calculateScore(factors);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.label).toBeDefined();
      expect(result.breakdown).toBeDefined();
    });

    it("should return Easy label for low scores", () => {
      const factors = {
        gridSize: 6,
        wordCount: 4,
        minWordLength: 3,
        maxWordLength: 4,
        directions: 2,
        allowReverse: false,
        overlap: "low" as const,
        vocabularyLevel: "simple" as const,
      };

      const result = DifficultyScorer.calculateScore(factors);
      expect(result.label).toBe("Easy");
    });

    it("should return Expert label for high scores", () => {
      const factors = {
        gridSize: 20,
        wordCount: 28,
        minWordLength: 8,
        maxWordLength: 18,
        directions: 8,
        allowReverse: true,
        overlap: "high" as const,
        vocabularyLevel: "advanced" as const,
      };

      const result = DifficultyScorer.calculateScore(factors);
      expect(result.label).toBe("Expert");
    });

    it("should handle grid size scoring correctly", () => {
      const smallGrid = {
        gridSize: 6,
        wordCount: 6,
        minWordLength: 3,
        maxWordLength: 5,
        directions: 4,
        allowReverse: false,
        overlap: "low" as const,
        vocabularyLevel: "common" as const,
      };

      const largeGrid = {
        gridSize: 18,
        wordCount: 6,
        minWordLength: 3,
        maxWordLength: 5,
        directions: 4,
        allowReverse: false,
        overlap: "low" as const,
        vocabularyLevel: "common" as const,
      };

      const smallResult = DifficultyScorer.calculateScore(smallGrid);
      const largeResult = DifficultyScorer.calculateScore(largeGrid);

      expect(largeResult.score).toBeGreaterThan(smallResult.score);
    });
  });

  describe("getTargetRange", () => {
    it("should return correct range for Easy", () => {
      const range = DifficultyScorer.getTargetRange("Easy");
      expect(range.min).toBe(0);
      expect(range.max).toBe(30);
    });

    it("should return correct range for Medium", () => {
      const range = DifficultyScorer.getTargetRange("Medium");
      expect(range.min).toBe(25);
      expect(range.max).toBe(60);
    });

    it("should return correct range for Hard", () => {
      const range = DifficultyScorer.getTargetRange("Hard");
      expect(range.min).toBe(50);
      expect(range.max).toBe(80);
    });

    it("should return correct range for Expert", () => {
      const range = DifficultyScorer.getTargetRange("Expert");
      expect(range.min).toBe(70);
      expect(range.max).toBe(100);
    });
  });

  describe("meetsTarget", () => {
    it("should return true when score is within target range", () => {
      const result = DifficultyScorer.meetsTarget(50, "Medium");
      expect(result).toBe(true);
    });

    it("should return false when score is outside target range", () => {
      const result = DifficultyScorer.meetsTarget(90, "Medium");
      expect(result).toBe(false);
    });
  });
});
