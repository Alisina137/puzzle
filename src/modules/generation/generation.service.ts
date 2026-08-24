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
      // ---------------------------------------------------------
      // 1. GET BOOK
      // ---------------------------------------------------------

      const book = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (!book) {
        throw new Error("Book not found");
      }

      // ---------------------------------------------------------
      // 2. UPDATE STATUS
      // ---------------------------------------------------------

      await prisma.book.update({
        where: { id: bookId },
        data: {
          status: "generating",
        },
      });

      result.totalPuzzles = book.puzzleCount;

      // ---------------------------------------------------------
      // 3. GET GENERATION SETTINGS
      // ---------------------------------------------------------

      const settings = this.getGenerationSettings(book);

      console.log(
        "[Generation] Using settings:",
        JSON.stringify(settings, null, 2),
      );

      // ---------------------------------------------------------
      // 4. VALIDATE BASIC CONFIGURATION
      // ---------------------------------------------------------

      if (settings.gridSize <= 0) {
        throw new Error(`Invalid grid size: ${settings.gridSize}`);
      }

      if (settings.wordsPerPuzzle <= 0) {
        throw new Error(`Invalid wordsPerPuzzle: ${settings.wordsPerPuzzle}`);
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

      // ---------------------------------------------------------
      // 5. SELECT VALID WORDS
      // ---------------------------------------------------------

      let wordResult: {
        words: string[];
        theme: string;
        difficulty: string;
        totalAvailable: number;
      };

      try {
        const totalThemeWords = WordSelectionService.getThemeWordCount(
          book.theme,
        );

        console.log(
          `[Generation] Selecting ${settings.wordsPerPuzzle} words for theme: ${book.theme}`,
        );

        console.log(`[Generation] Theme has ${totalThemeWords} total words`);

        console.log(
          `[Generation] Required word length: ${settings.minWordLength}-${settings.maxWordLength}`,
        );

        console.log(
          `[Generation] Maximum grid-compatible word length: ${settings.gridSize}`,
        );

        // Get all theme words.
        const allThemeWords = WordSelectionService.getThemeWords(book.theme);

        // Normalize and remove duplicates.
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

        // IMPORTANT:
        // Only words satisfying BOTH conditions are allowed:
        //
        // 1. configured min/max word length
        // 2. word can physically fit in the grid
        //
        const eligibleWords = normalizedThemeWords.filter((word) => {
          const validLength =
            word.length >= settings.minWordLength &&
            word.length <= settings.maxWordLength;

          const fitsGrid = word.length <= settings.gridSize;

          return validLength && fitsGrid;
        });

        console.log(`[Generation] Eligible words: ${eligibleWords.length}`);

        console.log(`[Generation] Eligible words:`, eligibleWords.join(", "));

        console.log(
          `[Generation] Eligible word lengths:`,
          eligibleWords.map((word) => `${word}(${word.length})`).join(", "),
        );

        // We need enough words to construct one puzzle.
        if (eligibleWords.length < settings.wordsPerPuzzle) {
          throw new Error(
            `Not enough eligible words for theme "${book.theme}". ` +
              `Required: ${settings.wordsPerPuzzle}, ` +
              `available: ${eligibleWords.length}, ` +
              `configured length: ${settings.minWordLength}-${settings.maxWordLength}, ` +
              `grid size: ${settings.gridSize}`,
          );
        }

        /*
         * Use WordSelectionService as the central selector.
         *
         * This ensures the selection logic remains consistent
         * with the rest of the application.
         */
        const selectedResult = WordSelectionService.selectWords({
          theme: book.theme,
          count: settings.wordsPerPuzzle,
          difficulty: this.normalizeDifficulty(book.difficultyLevel),
          minWordLength: settings.minWordLength,
          maxWordLength: Math.min(settings.maxWordLength, settings.gridSize),
        });

        /*
         * Safety filter.
         *
         * Even though selectWords already receives the constraints,
         * we verify the result before allowing it into generation.
         */
        const validSelectedWords = selectedResult.words
          .map((word) => word.trim().toUpperCase())
          .filter(
            (word) =>
              word.length >= settings.minWordLength &&
              word.length <= settings.maxWordLength &&
              word.length <= settings.gridSize,
          );

        if (validSelectedWords.length !== settings.wordsPerPuzzle) {
          throw new Error(
            `Word selection returned ${validSelectedWords.length} valid words, ` +
              `but ${settings.wordsPerPuzzle} are required.`,
          );
        }

        wordResult = {
          words: validSelectedWords,
          theme: book.theme,
          difficulty: book.difficultyLevel || "medium",
          totalAvailable: eligibleWords.length,
        };

        console.log(
          `[Generation] Selected ${wordResult.words.length} words:`,
          wordResult.words.join(", "),
        );

        console.log(
          `[Generation] Selected word lengths:`,
          wordResult.words.map((word) => `${word}(${word.length})`).join(", "),
        );

        // Final safety assertion.
        for (const word of wordResult.words) {
          if (word.length > settings.gridSize) {
            throw new Error(
              `Unsafe word selected: "${word}" has ${word.length} letters ` +
                `but grid size is ${settings.gridSize}.`,
            );
          }

          if (
            word.length < settings.minWordLength ||
            word.length > settings.maxWordLength
          ) {
            throw new Error(
              `Word "${word}" violates configured length ` +
                `${settings.minWordLength}-${settings.maxWordLength}.`,
            );
          }
        }
      } catch (error: any) {
        console.error("[Generation] Failed to select valid words:", error);

        result.errors.push("Failed to select words: " + error.message);

        await prisma.book.update({
          where: { id: bookId },
          data: { status: "failed" },
        });

        return result;
      }

      const words = wordResult.words;

      // ---------------------------------------------------------
      // 6. GENERATE PUZZLES
      // ---------------------------------------------------------

      const allFingerprints: any[] = [];

      const targetDifficulty = book.difficultyLevel || "Medium";

      for (let puzzleIndex = 0; puzzleIndex < book.puzzleCount; puzzleIndex++) {
        let puzzleGenerated = false;

        let attempts = 0;

        const maxRegenerationAttempts = 5;

        console.log(
          `[Generation] Starting puzzle ${puzzleIndex + 1}/${book.puzzleCount}`,
        );

        // -------------------------------------------------------
        // Puzzle regeneration loop
        // -------------------------------------------------------

        while (!puzzleGenerated && attempts < maxRegenerationAttempts) {
          attempts++;

          console.log(
            `[Generation] Puzzle ${puzzleIndex + 1}, attempt ${attempts}/${maxRegenerationAttempts}`,
          );

          try {
            // ---------------------------------------------------
            // Generate grid
            // ---------------------------------------------------

            console.log(
              `[Generation] Generating grid with size: ${settings.gridSize}`,
            );

            const gridResult = GridGenerator.generate({
              difficulty: "medium",
              size: settings.gridSize,
            });

            const grid = gridResult.grid;

            console.log(
              `[Generation] Grid generated: ${grid.length}x${
                grid[0]?.length || 0
              }`,
            );

            // ---------------------------------------------------
            // Get allowed directions
            // ---------------------------------------------------

            const allowedDirections = this.getAllowedDirections(
              settings.directions,
            );

            console.log(
              `[Generation] Allowed directions for puzzle ${puzzleIndex + 1}:`,
              allowedDirections.map((direction) => direction.name).join(", "),
            );

            // ---------------------------------------------------
            // Place words
            // ---------------------------------------------------

            const placement = WordPlacer.placeWords(grid, words, {
              maxAttempts: 100,
              allowBackwards: settings.allowReverse,
              randomizeDirection: true,
              directions: allowedDirections,
            });

            result.totalAttempts += placement.attempts;

            console.log(
              `[Generation] Placement result for puzzle ${
                puzzleIndex + 1
              }: placed=${placement.placedWords.length}, failed=${placement.failedWords.length}`,
            );

            if (placement.failedWords.length > 0) {
              console.warn(
                `[Generation] Puzzle ${
                  puzzleIndex + 1
                } failed words on attempt ${attempts}:`,
                placement.failedWords.join(", "),
              );
            }

            // ---------------------------------------------------
            // If placement failed, regenerate
            // ---------------------------------------------------

            if (placement.failedWords.length > 0) {
              if (attempts < maxRegenerationAttempts) {
                result.regeneratedPuzzles++;

                console.log(
                  `[Generation] Placement incomplete. Regenerating puzzle ${
                    puzzleIndex + 1
                  }...`,
                );

                continue;
              }

              result.errors.push(
                `Puzzle ${
                  puzzleIndex + 1
                } failed to place words after ${maxRegenerationAttempts} attempts: ` +
                  placement.failedWords.join(", "),
              );

              result.failedPuzzles++;

              break;
            }

            // ---------------------------------------------------
            // Calculate difficulty
            // ---------------------------------------------------

            const placedWords = placement.placedWords || [];

            const difficultyFactors = {
              gridSize: grid.length,

              wordCount: placedWords.length,

              minWordLength: Math.min(...words.map((word) => word.length)),

              maxWordLength: Math.max(...words.map((word) => word.length)),

              directions: this.getDirectionsCount(placedWords),

              allowReverse: settings.allowReverse,

              overlap: settings.overlap,

              vocabularyLevel: settings.vocabularyLevel,
            };

            const difficultyScore =
              DifficultyScorer.calculateScore(difficultyFactors);

            console.log(
              `[Generation] Puzzle ${
                puzzleIndex + 1
              } attempt ${attempts}: ${difficultyScore.score} - ${difficultyScore.label}`,
            );

            const meetsTarget = DifficultyScorer.meetsTarget(
              difficultyScore.score,
              targetDifficulty,
            );

            // ---------------------------------------------------
            // Regenerate if difficulty doesn't match
            // ---------------------------------------------------

            if (!meetsTarget && attempts < maxRegenerationAttempts) {
              console.log(
                `[Generation] Puzzle ${
                  puzzleIndex + 1
                } score ${difficultyScore.score} does not meet target ${targetDifficulty}. Regenerating...`,
              );

              result.regeneratedPuzzles++;

              continue;
            }

            // ---------------------------------------------------
            // Validate puzzle
            // ---------------------------------------------------

            const validation = PuzzleValidator.validatePuzzle(
              placement.grid,
              words,
              placement.placedWords,
            );

            if (!validation.valid) {
              console.warn(
                `[Generation] Puzzle ${
                  puzzleIndex + 1
                } validation failed on attempt ${attempts}:`,
                validation.errors,
              );

              if (attempts < maxRegenerationAttempts) {
                result.regeneratedPuzzles++;

                console.log(
                  `[Generation] Regenerating puzzle ${
                    puzzleIndex + 1
                  } because validation failed...`,
                );

                continue;
              }

              result.errors.push(
                `Puzzle ${
                  puzzleIndex + 1
                } validation failed after ${maxRegenerationAttempts} attempts: ` +
                  validation.errors.join(", "),
              );

              result.failedPuzzles++;

              break;
            }

            // ---------------------------------------------------
            // Duplicate detection
            // ---------------------------------------------------

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
              console.warn(
                `[Generation] Puzzle ${
                  puzzleIndex + 1
                } appears to be a duplicate.`,
              );

              result.warnings.push(
                "Puzzle " +
                  (puzzleIndex + 1) +
                  " appears to be a duplicate (score: " +
                  (duplicateCheck.score * 100).toFixed(1) +
                  "%)",
              );

              /*
               * If duplicate, regenerate while attempts remain.
               */
              if (attempts < maxRegenerationAttempts) {
                result.regeneratedPuzzles++;

                console.log(
                  `[Generation] Regenerating duplicate puzzle ${
                    puzzleIndex + 1
                  }...`,
                );

                continue;
              }
            }

            allFingerprints.push(fingerprint);

            // ---------------------------------------------------
            // Generate solution
            // ---------------------------------------------------

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
              console.warn(
                `[Generation] Puzzle ${
                  puzzleIndex + 1
                } solution verification failed on attempt ${attempts}:`,
                verification.errors,
              );

              if (attempts < maxRegenerationAttempts) {
                result.regeneratedPuzzles++;

                continue;
              }

              result.errors.push(
                `Puzzle ${
                  puzzleIndex + 1
                } solution verification failed after ${maxRegenerationAttempts} attempts: ` +
                  verification.errors.join(", "),
              );

              result.failedPuzzles++;

              break;
            }

            // ---------------------------------------------------
            // Save puzzle
            // ---------------------------------------------------

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

            if (!meetsTarget) {
              result.warnings.push(
                `Puzzle ${
                  puzzleIndex + 1
                } scored ${difficultyScore.score} (${difficultyScore.label}) but target was ${targetDifficulty}. Saved after ${attempts} attempts.`,
              );
            }

            console.log(
              `[Generation] Puzzle ${
                puzzleIndex + 1
              } generated successfully after ${attempts} attempt(s).`,
            );
          } catch (error: any) {
            console.error(
              `[Generation] Puzzle ${
                puzzleIndex + 1
              } attempt ${attempts} failed:`,
              error,
            );

            if (attempts >= maxRegenerationAttempts) {
              result.errors.push(
                `Puzzle ${
                  puzzleIndex + 1
                } generation failed after ${maxRegenerationAttempts} attempts: ${error.message}`,
              );

              result.failedPuzzles++;
            } else {
              result.regeneratedPuzzles++;

              console.log(`[Generation] Retrying puzzle ${puzzleIndex + 1}...`);
            }
          }
        }
      }

      // ---------------------------------------------------------
      // 7. DETERMINE FINAL BOOK STATUS
      // ---------------------------------------------------------

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

      // ---------------------------------------------------------
      // 8. GENERATE QUALITY REPORT
      // ---------------------------------------------------------

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

      // ---------------------------------------------------------
      // 9. FINAL LOG
      // ---------------------------------------------------------

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
   * Normalize book difficulty into the values supported
   * by WordSelectionService.
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
   * Get generation settings from book or use defaults
   */
  public static getGenerationSettings(book: any): {
    gridSize: number;
    wordsPerPuzzle: number;
    minWordLength: number;
    maxWordLength: number;
    directions: number;
    allowReverse: boolean;
    overlap: "low" | "medium" | "high";
    vocabularyLevel: "simple" | "common" | "intermediate" | "advanced";
  } {
    const defaults = {
      gridSize: 10,
      wordsPerPuzzle: 10,
      minWordLength: 3,
      maxWordLength: 8,
      directions: 4,
      allowReverse: false,
      overlap: "medium" as const,
      vocabularyLevel: "common" as const,
    };

    if (!book.generationSettings) {
      console.log("[Generation] No generation settings found, using defaults");

      return defaults;
    }

    const settings = book.generationSettings as any;

    console.log(
      "[Generation] Raw generationSettings:",
      JSON.stringify(settings, null, 2),
    );

    return {
      gridSize: Number(settings.gridSize) || defaults.gridSize,

      wordsPerPuzzle:
        Number(settings.wordsPerPuzzle) || defaults.wordsPerPuzzle,

      minWordLength: Number(settings.minWordLength) || defaults.minWordLength,

      maxWordLength: Number(settings.maxWordLength) || defaults.maxWordLength,

      directions: Number(settings.directions) || defaults.directions,

      allowReverse:
        settings.allowReverse !== undefined
          ? Boolean(settings.allowReverse)
          : defaults.allowReverse,

      overlap: settings.overlap || defaults.overlap,

      vocabularyLevel: settings.vocabularyLevel || defaults.vocabularyLevel,
    };
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
      console.log(
        "[Generation] calculateQualityScore: totalPuzzles is 0, returning 0",
      );

      return 0;
    }

    const successRate = result.generatedPuzzles / result.totalPuzzles;

    const baseScore = successRate * 100;

    const errorPenalty = result.errors.length * 2;

    const warningPenalty = result.warnings.length * 0.5;

    const finalScore = Math.max(
      0,
      Math.min(100, baseScore - errorPenalty - warningPenalty),
    );

    console.log("[Generation] calculateQualityScore:", {
      totalPuzzles: result.totalPuzzles,

      generatedPuzzles: result.generatedPuzzles,

      successRate,

      baseScore,

      errorPenalty,

      warningPenalty,

      finalScore,
    });

    return finalScore;
  }

  /**
   * Count the number of unique directions used
   * by placed words.
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
   * Get allowed directions based on the direction count
   */
  private static getAllowedDirections(directionCount: number): Array<{
    dr: number;
    dc: number;
    name: string;
  }> {
    const allDirections = [
      {
        dr: 0,
        dc: 1,
        name: "right",
      },
      {
        dr: 0,
        dc: -1,
        name: "left",
      },
      {
        dr: 1,
        dc: 0,
        name: "down",
      },
      {
        dr: -1,
        dc: 0,
        name: "up",
      },
      {
        dr: 1,
        dc: 1,
        name: "down-right",
      },
      {
        dr: -1,
        dc: -1,
        name: "up-left",
      },
      {
        dr: 1,
        dc: -1,
        name: "down-left",
      },
      {
        dr: -1,
        dc: 1,
        name: "up-right",
      },
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
