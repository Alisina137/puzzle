export interface DifficultyFactors {
  gridSize: number;
  wordCount: number;
  minWordLength: number;
  maxWordLength: number;
  directions: number;
  allowReverse: boolean;
  overlap: "low" | "medium" | "high";
  vocabularyLevel: "simple" | "common" | "intermediate" | "advanced";
}

export interface DifficultyScore {
  score: number; // 0-100
  label: "Easy" | "Medium" | "Hard" | "Expert";
  breakdown: {
    gridSizeScore: number;
    wordCountScore: number;
    wordLengthScore: number;
    directionsScore: number;
    reverseScore: number;
    overlapScore: number;
    vocabularyScore: number;
  };
}

export class DifficultyScorer {
  /**
   * Calculate difficulty score for a puzzle
   */
  static calculateScore(factors: DifficultyFactors): DifficultyScore {
    const gridSizeScore = this.scoreGridSize(factors.gridSize);
    const wordCountScore = this.scoreWordCount(factors.wordCount);
    const wordLengthScore = this.scoreWordLength(factors.minWordLength, factors.maxWordLength);
    const directionsScore = this.scoreDirections(factors.directions);
    const reverseScore = this.scoreReverse(factors.allowReverse);
    const overlapScore = this.scoreOverlap(factors.overlap);
    const vocabularyScore = this.scoreVocabulary(factors.vocabularyLevel);

    // Weighted average (some factors matter more than others)
    const totalWeight = 100;
    const weightedScore =
      (gridSizeScore * 20 +
        wordCountScore * 20 +
        wordLengthScore * 15 +
        directionsScore * 15 +
        reverseScore * 10 +
        overlapScore * 10 +
        vocabularyScore * 10) /
      totalWeight;

    const score = Math.min(100, Math.max(0, Math.round(weightedScore)));

    return {
      score,
      label: this.getLabel(score),
      breakdown: {
        gridSizeScore,
        wordCountScore,
        wordLengthScore,
        directionsScore,
        reverseScore,
        overlapScore,
        vocabularyScore,
      },
    };
  }

  /**
   * Score grid size (larger = harder)
   */
  private static scoreGridSize(size: number): number {
    if (size <= 8) return 10;
    if (size <= 10) return 25;
    if (size <= 12) return 50;
    if (size <= 14) return 70;
    if (size <= 16) return 85;
    return 95;
  }

  /**
   * Score word count (more = harder)
   */
  private static scoreWordCount(count: number): number {
    if (count <= 6) return 10;
    if (count <= 8) return 25;
    if (count <= 10) return 40;
    if (count <= 12) return 55;
    if (count <= 15) return 70;
    if (count <= 18) return 85;
    return 95;
  }

  /**
   * Score word length (longer words = harder to find)
   */
  private static scoreWordLength(minLength: number, maxLength: number): number {
    const avgLength = (minLength + maxLength) / 2;
    if (avgLength <= 4) return 15;
    if (avgLength <= 5) return 30;
    if (avgLength <= 6) return 45;
    if (avgLength <= 7) return 60;
    if (avgLength <= 8) return 75;
    if (avgLength <= 10) return 85;
    return 95;
  }

  /**
   * Score directions (more directions = harder)
   */
  private static scoreDirections(directions: number): number {
    if (directions <= 2) return 10; // horizontal only
    if (directions <= 4) return 30; // horizontal + vertical
    if (directions <= 6) return 60; // + diagonal
    if (directions <= 8) return 85; // all directions
    return 95;
  }

  /**
   * Score reverse words (reverse = harder)
   */
  private static scoreReverse(allowReverse: boolean): number {
    return allowReverse ? 70 : 20;
  }

  /**
   * Score overlap (more overlap = harder)
   */
  private static scoreOverlap(overlap: "low" | "medium" | "high"): number {
    switch (overlap) {
      case "low":
        return 20;
      case "medium":
        return 55;
      case "high":
        return 85;
      default:
        return 50;
    }
  }

  /**
   * Score vocabulary difficulty
   */
  private static scoreVocabulary(level: "simple" | "common" | "intermediate" | "advanced"): number {
    switch (level) {
      case "simple":
        return 10;
      case "common":
        return 35;
      case "intermediate":
        return 65;
      case "advanced":
        return 90;
      default:
        return 50;
    }
  }

  /**
   * Get difficulty label based on score
   */
  private static getLabel(score: number): "Easy" | "Medium" | "Hard" | "Expert" {
    if (score <= 25) return "Easy";
    if (score <= 50) return "Medium";
    if (score <= 75) return "Hard";
    return "Expert";
  }

  /**
   * Get target score range for a difficulty level
   */
  static getTargetRange(difficulty: string): { min: number; max: number } {
    switch (difficulty) {
      case "Easy":
        return { min: 0, max: 30 };
      case "Medium":
        return { min: 25, max: 60 };
      case "Hard":
        return { min: 50, max: 80 };
      case "Expert":
        return { min: 70, max: 100 };
      default:
        return { min: 0, max: 100 };
    }
  }

  /**
   * Check if a puzzle meets the target difficulty
   */
  static meetsTarget(score: number, targetDifficulty: string): boolean {
    const range = this.getTargetRange(targetDifficulty);
    return score >= range.min && score <= range.max;
  }
}
