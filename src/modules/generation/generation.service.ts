import { prisma } from "@/lib/prisma";
import { WordSelectionService } from "@/modules/theme/word-selection.service";
import { GridGenerator } from "@/modules/puzzle/grid-generator";
import { WordPlacer } from "@/modules/puzzle/word-placer";
import { PuzzleValidator } from "@/modules/puzzle/puzzle-validator";
import { DuplicateDetector } from "@/modules/puzzle/duplicate-detector";
import { SolutionGenerator } from "@/modules/puzzle/solution-generator";
import { Prisma } from "@prisma/client";

export interface GenerationResult {
  bookId: string;
  totalPuzzles: number;
  generatedPuzzles: number;
  failedPuzzles: number;
  totalAttempts: number;
  errors: string[];
  warnings: string[];
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

      // Generate each puzzle
      const allFingerprints: any[] = [];

      for (let i = 0; i < book.puzzleCount; i++) {
        try {
          // Generate grid
          const gridResult = GridGenerator.generate({ difficulty: "medium" });
          const grid = gridResult.grid;

          // Place words
          const placement = WordPlacer.placeWords(grid, words, {
            maxAttempts: 10,
          });

          result.totalAttempts += placement.attempts;

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
            continue;
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
            continue;
          }

          // Save puzzle to database
          await this.savePuzzle(
            bookId,
            placement,
            words,
            solution,
            validation.score,
          );

          result.generatedPuzzles++;
        } catch (error: any) {
          result.errors.push(
            "Puzzle " + (i + 1) + " generation failed: " + error.message,
          );
          result.failedPuzzles++;
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
   * Save a puzzle to the database
   */
  private static async savePuzzle(
    bookId: string,
    placement: any,
    words: string[],
    solution: any,
    qualityScore: number,
  ): Promise<void> {
    // Create puzzle
    const puzzle = await prisma.puzzle.create({
      data: {
        type: "wordsearch",
        data: {
          grid: placement.grid,
          words: words,
          placedWords: placement.placedWords,
          size: placement.grid.length,
        },
        difficulty: "medium",
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
}
