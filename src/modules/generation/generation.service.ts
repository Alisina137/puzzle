import { prisma } from "@/lib/prisma";
import { WordSelectionService } from "@/modules/theme/word-selection.service";
import { GridGenerator } from "@/modules/puzzle/grid-generator";
import { WordPlacer } from "@/modules/puzzle/word-placer";
import { PuzzleValidator } from "@/modules/puzzle/puzzle-validator";
import { DuplicateDetector } from "@/modules/puzzle/duplicate-detector";
import { SolutionGenerator } from "@/modules/puzzle/solution-generator";
import { Prisma } from "@prisma/client";
import { DifficultyScorer } from "@/modules/puzzle";
import { QualityReportService } from "@/modules/quality";

export interface GenerationResult {
  bookId: string;
  totalPuzzles: number;
  generatedPuzzles: number;
  failedPuzzles: number;
  totalAttempts: number;
  errors: string[];
  warnings: string[];
  regeneratedPuzzles: number;
  qualityScore: number;
}

export interface GenerationSettings {
  gridSize: number;
  wordsPerPuzzle: number;
  targetWordsPerPuzzle: number;
  minWordsPerPuzzle: number;
  maxWordsPerPuzzle: number;
  minWordLength: number;
  maxWordLength: number;
  directions: number;
  allowReverse: boolean;
  overlap: "low" | "medium" | "high";
  vocabularyLevels: string[];
}

export class GenerationService {
  /**
   * Generate puzzles for a book
   */
  static async generateBook(bookId: string): Promise<GenerationResult> {
    const result: GenerationResult = {
      bookId,
      totalPuzzles: 0,
      generatedPuzzles: 0,
      failedPuzzles: 0,
      totalAttempts: 0,
      errors: [],
      warnings: [],
      regeneratedPuzzles: 0,
      qualityScore: 0,
    };

    try {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (!book) {
        throw new Error("Book not found");
      }

      await prisma.book.update({
        where: { id: bookId },
        data: {
          status: "generating",
        },
      });

      result.totalPuzzles = book.puzzleCount;

      const settings = this.getGenerationSettings(book);

      console.log(
        "[Generation] Using settings:",
        JSON.stringify(settings, null, 2),
      );

      if (settings.gridSize <= 0) {
        throw new Error(`Invalid grid size: ${settings.gridSize}`);
      }

      if (settings.targetWordsPerPuzzle <= 0) {
        throw new Error(
          `Invalid targetWordsPerPuzzle: ${settings.targetWordsPerPuzzle}`,
        );
      }

      if (settings.minWordLength > settings.maxWordLength) {
        throw new Error(
          `Invalid word length range: ${settings.minWordLength}-${settings.maxWordLength}`,
        );
      }

      if (settings.maxWordLength > settings.gridSize) {
        console.warn(
          `[Generation] maxWordLength (${settings.maxWordLength}) is greater than gridSize (${settings.gridSize}). ` +
            `Words longer than the grid will be excluded.`,
        );
      }

      const allThemeWords = WordSelectionService.getThemeWordsByLevel(
        book.theme,
        settings.vocabularyLevels,
      );

      const normalizedThemeWords = [
        ...new Set(
          allThemeWords
            .map((word) => word.trim().toUpperCase())
            .filter(Boolean),
        ),
      ];

      console.log(
        `[Generation] Normalized theme words: ${normalizedThemeWords.length}`,
      );

      const eligibleWords = normalizedThemeWords.filter((word) => {
        const validLength =
          word.length >= settings.minWordLength &&
          word.length <= settings.maxWordLength;
        const fitsGrid = word.length <= settings.gridSize;
        return validLength && fitsGrid;
      });

      console.log(`[Generation] Eligible words: ${eligibleWords.length}`);

      if (eligibleWords.length < settings.minWordsPerPuzzle) {
        throw new Error(
          `Not enough eligible words for theme "${book.theme}". ` +
            `Required minimum: ${settings.minWordsPerPuzzle}, ` +
            `available: ${eligibleWords.length}`,
        );
      }

      const allFingerprints: any[] = [];
      const targetDifficulty = book.difficultyLevel || "Medium";
      const usedWords: string[] = [];

      for (let puzzleIndex = 0; puzzleIndex < book.puzzleCount; puzzleIndex++) {
        let puzzleGenerated = false;
        let attempts = 0;
        const maxRegenerationAttempts = 15;

        console.log(
          `[Generation] Starting puzzle ${puzzleIndex + 1}/${book.puzzleCount}`,
        );

        while (!puzzleGenerated && attempts < maxRegenerationAttempts) {
          attempts++;
          console.log(
            `[Generation] Puzzle ${puzzleIndex + 1}, attempt ${attempts}/${maxRegenerationAttempts}`,
          );

          try {
            const availableWords = eligibleWords.filter(
              (word) => !usedWords.includes(word),
            );

            let wordCount = settings.targetWordsPerPuzzle;
            let puzzleWords: string[] = [];
            let placementSuccess = false;

            for (let wc = wordCount; wc >= settings.minWordsPerPuzzle; wc--) {
              const candidateWords = WordSelectionService.selectCandidateWords(
                availableWords,
                wc,
                settings.gridSize,
              );

              if (candidateWords.length < wc) {
                console.warn(
                  `[Generation] Not enough candidate words for ${wc}`,
                );
                continue;
              }

              // ✅ Pass bookId to generatePuzzleWithWords
              const result = await this.generatePuzzleWithWords(
                candidateWords,
                settings,
                targetDifficulty,
                allFingerprints,
                bookId, // ← Pass bookId here
              );

              if (result.success) {
                puzzleWords = candidateWords;
                placementSuccess = true;
                console.log(`[Generation] ✅ Success with ${wc} words`);
                break;
              }

              console.log(`[Generation] ❌ Failed with ${wc} words`);
            }

            if (!placementSuccess) {
              console.warn(
                `[Generation] Could not place words after trying from ${settings.targetWordsPerPuzzle} down to ${settings.minWordsPerPuzzle}`,
              );
              if (attempts < maxRegenerationAttempts) {
                result.regeneratedPuzzles++;
                continue;
              }
              result.failedPuzzles++;
              result.errors.push(
                `Puzzle ${puzzleIndex + 1} failed to place words after ${maxRegenerationAttempts} attempts`,
              );
              break;
            }

            usedWords.push(...puzzleWords);
            result.generatedPuzzles++;
            puzzleGenerated = true;

            console.log(
              `[Generation] Puzzle ${puzzleIndex + 1} generated successfully after ${attempts} attempt(s) with ${puzzleWords.length} words`,
            );
          } catch (error: any) {
            console.error(
              `[Generation] Puzzle ${puzzleIndex + 1} attempt ${attempts} failed:`,
              error,
            );

            if (attempts >= maxRegenerationAttempts) {
              result.errors.push(
                `Puzzle ${puzzleIndex + 1} generation failed after ${maxRegenerationAttempts} attempts: ${error.message}`,
              );
              result.failedPuzzles++;
            } else {
              result.regeneratedPuzzles++;
              console.log(`[Generation] Retrying puzzle ${puzzleIndex + 1}...`);
            }
          }
        }
      }

      let status = "ready";

      if (result.failedPuzzles > 0 && result.generatedPuzzles === 0) {
        status = "failed";
      } else if (result.failedPuzzles > 0) {
        status = "ready";
      }

      const qualityScore = this.calculateQualityScore(result);

      await prisma.book.update({
        where: { id: bookId },
        data: {
          status,
          qualityScore,
        },
      });

      result.qualityScore = qualityScore;

      try {
        console.log("[Generation] Generating quality report for book:", bookId);
        await QualityReportService.generateReport(bookId);
        console.log("[Generation] Quality report generated successfully");
      } catch (reportError) {
        console.error(
          "[Generation] Failed to generate quality report:",
          reportError,
        );
      }

      console.log(
        `[Generation] Book generation complete. ` +
          `Generated: ${result.generatedPuzzles}/${result.totalPuzzles}, ` +
          `Failed: ${result.failedPuzzles}, ` +
          `Regenerated: ${result.regeneratedPuzzles}, ` +
          `Quality Score: ${result.qualityScore}`,
      );

      if (result.errors.length > 0) {
        console.error("[Generation] Generation errors:");
        for (const error of result.errors) {
          console.error(`  - ${error}`);
        }
      }

      if (result.warnings.length > 0) {
        console.warn("[Generation] Generation warnings:");
        for (const warning of result.warnings) {
          console.warn(`  - ${warning}`);
        }
      }

      return result;
    } catch (error: any) {
      console.error("[Generation] Fatal generation error:", error);
      result.errors.push("Generation failed: " + error.message);

      await prisma.book.update({
        where: { id: bookId },
        data: { status: "failed" },
      });

      return result;
    }
  }

  /**
   * Generate a single puzzle with given words
   */
  private static async generatePuzzleWithWords(
    words: string[],
    settings: GenerationSettings,
    targetDifficulty: string,
    allFingerprints: any[],
    bookId: string, // ← Added bookId parameter
  ): Promise<{ success: boolean; puzzle?: any; error?: string }> {
    try {
      const gridResult = GridGenerator.generate({
        difficulty: "medium",
        size: settings.gridSize,
      });

      const grid = gridResult.grid;

      const allowedDirections = this.getAllowedDirections(settings.directions);

      const placement = WordPlacer.placeWords(grid, words, {
        maxAttempts: 100,
        allowBackwards: settings.allowReverse,
        randomizeDirection: true,
        directions: allowedDirections,
      });

      if (placement.failedWords.length > 0) {
        return {
          success: false,
          error: `Failed to place words: ${placement.failedWords.join(", ")}`,
        };
      }

      // ✅ CRITICAL FIX: Fill empty cells with random letters
      GridGenerator.fillGrid(placement.grid);

      const placedWords = placement.placedWords || [];

      const difficultyFactors = {
        gridSize: grid.length,
        wordCount: placedWords.length,
        minWordLength: Math.min(...words.map((word) => word.length)),
        maxWordLength: Math.max(...words.map((word) => word.length)),
        directions: this.getDirectionsCount(placedWords),
        allowReverse: settings.allowReverse,
        overlap: settings.overlap,
        vocabularyLevels: settings.vocabularyLevels,
      };

      const difficultyScore =
        DifficultyScorer.calculateScore(difficultyFactors);

      const meetsTarget = DifficultyScorer.meetsTarget(
        difficultyScore.score,
        targetDifficulty,
      );

      const validation = PuzzleValidator.validatePuzzle(
        placement.grid,
        words,
        placement.placedWords,
      );

      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(", ")}`,
        };
      }

      const fingerprint = DuplicateDetector.createFingerprint(
        placement.grid,
        words,
        placement.placedWords,
      );

      const duplicateCheck = DuplicateDetector.isDuplicate(
        fingerprint,
        allFingerprints,
      );

      if (duplicateCheck && duplicateCheck.isDuplicate) {
        return {
          success: false,
          error: "Duplicate puzzle detected",
        };
      }

      allFingerprints.push(fingerprint);

      const solution = SolutionGenerator.generateSolution(
        placement.grid,
        placement.placedWords,
      );

      const verification = SolutionGenerator.verifySolution(
        solution,
        placement.grid,
        words,
      );

      if (!verification.valid) {
        return {
          success: false,
          error: `Solution verification failed: ${verification.errors.join(", ")}`,
        };
      }

      // ✅ Save puzzle with actual bookId
      await this.savePuzzle(
        bookId, // ← Use the actual bookId
        placement,
        words,
        solution,
        validation.score,
        difficultyScore,
      );

      return {
        success: true,
        puzzle: placement,
      };
    } catch (error: any) {
      console.error("[Generation] generatePuzzleWithWords error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Normalize book difficulty
   */
  private static normalizeDifficulty(
    difficulty: string | null | undefined,
  ): "easy" | "medium" | "hard" {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "easy";
      case "hard":
        return "hard";
      default:
        return "medium";
    }
  }

  /**
   * Get generation settings from book
   */
  public static getGenerationSettings(book: any): GenerationSettings {
    const defaults: GenerationSettings = {
      gridSize: 10,
      wordsPerPuzzle: 10,
      targetWordsPerPuzzle: 10,
      minWordsPerPuzzle: 6,
      maxWordsPerPuzzle: 12,
      minWordLength: 3,
      maxWordLength: 8,
      directions: 4,
      allowReverse: false,
      overlap: "medium" as const,
      vocabularyLevels: ["simple"],
    };

    if (!book.generationSettings) {
      console.log("[Generation] No generation settings found, using defaults");
      return defaults;
    }

    const settings = book.generationSettings as any;

    let vocabularyLevels: string[] = defaults.vocabularyLevels;

    if (settings.vocabularyLevels && Array.isArray(settings.vocabularyLevels)) {
      vocabularyLevels = settings.vocabularyLevels;
    } else if (settings.vocabularyLevel) {
      vocabularyLevels = [settings.vocabularyLevel];
    } else if (settings.vocabulary) {
      vocabularyLevels = [settings.vocabulary];
    }

    return {
      gridSize: Number(settings.gridSize) || defaults.gridSize,
      wordsPerPuzzle:
        Number(settings.wordsPerPuzzle) || defaults.wordsPerPuzzle,
      targetWordsPerPuzzle:
        Number(settings.targetWordsPerPuzzle) ||
        Number(settings.wordsPerPuzzle) ||
        defaults.targetWordsPerPuzzle,
      minWordsPerPuzzle:
        Number(settings.minWordsPerPuzzle) ||
        Math.max(3, Math.floor((Number(settings.wordsPerPuzzle) || 10) * 0.6)),
      maxWordsPerPuzzle:
        Number(settings.maxWordsPerPuzzle) ||
        Number(settings.wordsPerPuzzle) ||
        defaults.maxWordsPerPuzzle,
      minWordLength: Number(settings.minWordLength) || defaults.minWordLength,
      maxWordLength: Number(settings.maxWordLength) || defaults.maxWordLength,
      directions: Number(settings.directions) || defaults.directions,
      allowReverse:
        settings.allowReverse !== undefined
          ? Boolean(settings.allowReverse)
          : defaults.allowReverse,
      overlap: settings.overlap || defaults.overlap,
      vocabularyLevels,
    };
  }

  /**
   * Save a puzzle to the database
   */
  private static async savePuzzle(
    bookId: string,
    placement: any,
    words: string[],
    solution: any,
    qualityScore: number,
    difficultyScore: any,
  ): Promise<void> {
    // ✅ Verify the book exists before saving
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      console.error(
        `[Generation] Book ${bookId} not found, cannot save puzzle`,
      );
      throw new Error(`Book ${bookId} not found`);
    }

    const puzzle = await prisma.puzzle.create({
      data: {
        type: "wordsearch",
        data: {
          grid: placement.grid,
          words,
          placedWords: placement.placedWords,
          size: placement.grid.length,
        },
        difficulty: difficultyScore.label.toLowerCase(),
        difficultyScore: difficultyScore.score,
        difficultyLabel: difficultyScore.label,
        qualityMetrics: difficultyScore.breakdown,
        qualityScore,
      },
    });

    const puzzleVersion = await prisma.puzzleVersion.create({
      data: {
        puzzleId: puzzle.id,
        versionNumber: 1,
        data: puzzle.data === null ? Prisma.JsonNull : puzzle.data,
        isActive: true,
      },
    });

    const existingCount = await prisma.bookPuzzle.count({
      where: { bookId },
    });

    const bookPuzzle = await prisma.bookPuzzle.create({
      data: {
        bookId,
        puzzleId: puzzle.id,
        puzzleVersionId: puzzleVersion.id,
        position: existingCount,
        displayNumber: existingCount + 1,
      },
    });

    await prisma.solution.create({
      data: {
        bookPuzzleId: bookPuzzle.id,
        data: {
          grid: solution.grid,
          words: solution.words,
        },
        validatedAt: new Date(),
        isValid: true,
      },
    });
  }

  /**
   * Calculate quality score for the book
   */
  private static calculateQualityScore(result: GenerationResult): number {
    if (result.totalPuzzles === 0) {
      return 0;
    }

    const successRate = result.generatedPuzzles / result.totalPuzzles;
    const baseScore = successRate * 100;
    const errorPenalty = result.errors.length * 2;
    const warningPenalty = result.warnings.length * 0.5;

    return Math.max(
      0,
      Math.min(100, baseScore - errorPenalty - warningPenalty),
    );
  }

  /**
   * Count the number of unique directions used
   */
  public static getDirectionsCount(placedWords: any[]): number {
    const directions = new Set<string>();
    for (const placedWord of placedWords) {
      if (placedWord.direction?.name) {
        directions.add(placedWord.direction.name);
      }
    }
    return directions.size;
  }

  /**
   * Get allowed directions based on direction count
   */
  public static getAllowedDirections(directionCount: number): Array<{
    dr: number;
    dc: number;
    name: string;
  }> {
    const allDirections = [
      { dr: 0, dc: 1, name: "right" },
      { dr: 0, dc: -1, name: "left" },
      { dr: 1, dc: 0, name: "down" },
      { dr: -1, dc: 0, name: "up" },
      { dr: 1, dc: 1, name: "down-right" },
      { dr: -1, dc: -1, name: "up-left" },
      { dr: 1, dc: -1, name: "down-left" },
      { dr: -1, dc: 1, name: "up-right" },
    ];

    if (directionCount === 4) {
      return allDirections.slice(0, 4);
    }
    if (directionCount === 6) {
      return allDirections.slice(0, 6);
    }
    return allDirections;
  }
}
