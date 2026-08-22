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
    };

    try {
      // Get book details
      const book = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (!book) {
        throw new Error("Book not found");
      }

      // Update book status to generating
      await prisma.book.update({
        where: { id: bookId },
        data: { status: "generating" },
      });

      result.totalPuzzles = book.puzzleCount;

      // Get theme words
      let wordResult;
      try {
        wordResult = WordSelectionService.selectWords({
          theme: book.theme,
          count: 12,
          difficulty: "medium",
        });
      } catch (error: any) {
        result.errors.push("Failed to select words: " + error.message);
        await prisma.book.update({
          where: { id: bookId },
          data: { status: "failed" },
        });
        return result;
      }

      const words = wordResult.words;
      const allFingerprints: any[] = [];
      const targetDifficulty = book.difficultyLevel || "Medium";

      // Generate each puzzle
      for (let i = 0; i < book.puzzleCount; i++) {
        let puzzleGenerated = false;
        let attempts = 0;
        const maxRegenerationAttempts = 5;

        while (!puzzleGenerated && attempts < maxRegenerationAttempts) {
          attempts++;
          try {
            // Generate grid
            const gridResult = GridGenerator.generate({ difficulty: "medium" });
            const grid = gridResult.grid;

            // Place words
            const placement = WordPlacer.placeWords(grid, words, {
              maxAttempts: 10,
            });

            result.totalAttempts += placement.attempts;

            // Calculate difficulty score
            const placedWords = placement.placedWords || [];
            const difficultyFactors = {
              gridSize: grid.length,
              wordCount: placedWords.length,
              minWordLength: Math.min(...words.map(w => w.length)),
              maxWordLength: Math.max(...words.map(w => w.length)),
              directions: this.getDirectionsCount(placedWords),
              allowReverse: true,
              overlap: "medium" as const,
              vocabularyLevel: "common" as const,
            };

            const difficultyScore = DifficultyScorer.calculateScore(difficultyFactors);
            console.log(`[Generation] Puzzle ${i + 1} attempt ${attempts}: ${difficultyScore.score} - ${difficultyScore.label}`);

            // Check if puzzle meets target difficulty
            const meetsTarget = DifficultyScorer.meetsTarget(
              difficultyScore.score,
              targetDifficulty
            );

            if (!meetsTarget && attempts < maxRegenerationAttempts) {
              console.log(`[Generation] Puzzle ${i + 1} score ${difficultyScore.score} does not meet target ${targetDifficulty}, regenerating...`);
              result.regeneratedPuzzles++;
              continue; // Regenerate this puzzle
            }

            // Track failed words
            if (placement.failedWords.length > 0) {
              result.warnings.push(
                "Puzzle " +
                  (i + 1) +
                  " failed words: " +
                  placement.failedWords.join(", "),
              );
            }

            // Validate puzzle
            const validation = PuzzleValidator.validatePuzzle(
              placement.grid,
              words,
              placement.placedWords,
            );

            if (!validation.valid) {
              result.errors.push(
                "Puzzle " +
                  (i + 1) +
                  " validation failed: " +
                  validation.errors.join(", "),
              );
              result.failedPuzzles++;
              break;
            }

            // Check for duplicates
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
              result.warnings.push(
                "Puzzle " +
                  (i + 1) +
                  " appears to be a duplicate (score: " +
                  (duplicateCheck.score * 100).toFixed(1) +
                  "%)",
              );
              // Allow duplicates but warn (for now)
            }
            allFingerprints.push(fingerprint);

            // Generate solution
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
              result.errors.push(
                "Puzzle " +
                  (i + 1) +
                  " solution verification failed: " +
                  verification.errors.join(", "),
              );
              result.failedPuzzles++;
              break;
            }

            // Save puzzle to database with difficulty score
            await this.savePuzzle(
              bookId,
              placement,
              words,
              solution,
              validation.score,
              difficultyScore,
            );

            result.generatedPuzzles++;
            puzzleGenerated = true;

            // Log warning if puzzle doesn't meet target but was saved anyway (last attempt)
            if (!meetsTarget) {
              result.warnings.push(
                `Puzzle ${i + 1} scored ${difficultyScore.score} (${difficultyScore.label}) but target was ${targetDifficulty}. Saved after ${attempts} attempts.`
              );
            }

          } catch (error: any) {
            if (attempts >= maxRegenerationAttempts) {
              result.errors.push(
                "Puzzle " + (i + 1) + " generation failed after " + maxRegenerationAttempts + " attempts: " + error.message,
              );
              result.failedPuzzles++;
            }
          }
        }
      }

      // Update book status
      let status = "ready";
      if (result.failedPuzzles > 0 && result.generatedPuzzles === 0) {
        status = "failed";
      } else if (result.failedPuzzles > 0) {
        status = "ready";
      }

      await prisma.book.update({
        where: { id: bookId },
        data: {
          status: status,
          qualityScore: this.calculateQualityScore(result),
        },
      });

      // Generate quality report
      try {
        console.log("[Generation] Generating quality report for book:", bookId);
        await QualityReportService.generateReport(bookId);
        console.log("[Generation] Quality report generated successfully");
      } catch (reportError) {
        console.error("[Generation] Failed to generate quality report:", reportError);
        // Don't fail the generation if report generation fails
      }

      console.log(`[Generation] Book generation complete. Generated: ${result.generatedPuzzles}/${result.totalPuzzles}, Failed: ${result.failedPuzzles}, Regenerated: ${result.regeneratedPuzzles}`);

      return result;
    } catch (error: any) {
      result.errors.push("Generation failed: " + error.message);
      await prisma.book.update({
        where: { id: bookId },
        data: { status: "failed" },
      });
      return result;
    }
  }

  /**
   * Save a puzzle to the database with difficulty score
   */
  private static async savePuzzle(
    bookId: string,
    placement: any,
    words: string[],
    solution: any,
    qualityScore: number,
    difficultyScore: any,
  ): Promise<void> {
    // Create puzzle with difficulty score
    const puzzle = await prisma.puzzle.create({
      data: {
        type: "wordsearch",
        data: {
          grid: placement.grid,
          words: words,
          placedWords: placement.placedWords,
          size: placement.grid.length,
        },
        difficulty: difficultyScore.label.toLowerCase(),
        difficultyScore: difficultyScore.score,
        difficultyLabel: difficultyScore.label,
        qualityMetrics: difficultyScore.breakdown,
        qualityScore: qualityScore,
      },
    });

    // Create puzzle version
    const puzzleVersion = await prisma.puzzleVersion.create({
      data: {
        puzzleId: puzzle.id,
        versionNumber: 1,
        data: puzzle.data === null ? Prisma.JsonNull : puzzle.data,
        isActive: true,
      },
    });

    // Get current position
    const existingCount = await prisma.bookPuzzle.count({
      where: { bookId },
    });

    // Create book-puzzle relationship
    const bookPuzzle = await prisma.bookPuzzle.create({
      data: {
        bookId,
        puzzleId: puzzle.id,
        puzzleVersionId: puzzleVersion.id,
        position: existingCount,
        displayNumber: existingCount + 1,
      },
    });

    // Create solution
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
    if (result.totalPuzzles === 0) return 0;

    const successRate = result.generatedPuzzles / result.totalPuzzles;
    const baseScore = successRate * 100;

    // Deduct for errors
    const errorPenalty = result.errors.length * 2;
    const warningPenalty = result.warnings.length * 0.5;

    return Math.max(
      0,
      Math.min(100, baseScore - errorPenalty - warningPenalty),
    );
  }

  /**
   * Count the number of directions used in placed words
   */
  private static getDirectionsCount(placedWords: any[]): number {
    const directions = new Set<string>();
    for (const word of placedWords) {
      if (word.direction) {
        directions.add(word.direction);
      }
    }
    return directions.size;
  }
}