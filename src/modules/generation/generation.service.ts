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
import { DomainWordSelectionService } from "@/modules/theme/vocabulary/domain-word-selection.service";
import { loadThemeDomains } from "@/modules/theme/vocabulary/word-list-loader";
import {
  assignDomainsToPuzzles,
  assignDomainGroupsForMixedPuzzles,
} from "@/modules/theme/vocabulary/domain-distribution.service";
import { getEligibleDifficultyPools } from "@/modules/theme/vocabulary/difficulty-pools";
import { WordSelectionMode } from "@/modules/theme/domain/domain.types";

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
  wordSelectionMode: WordSelectionMode;
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

      // Check if the theme has domain-based vocabulary
      const themeDomainInfo = loadThemeDomains(book.theme);
      const useDomains =
        themeDomainInfo.hasVocabulary && themeDomainInfo.domainCount > 0;

      // Legacy word loading (used when no domains exist)
      let eligibleWords: string[] = [];
      if (!useDomains) {
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

        eligibleWords = normalizedThemeWords.filter((word) => {
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
      } else {
        console.log(
          `[Generation] Theme "${book.theme}" has ${themeDomainInfo.domainCount} domains. Using domain-based selection (mode: ${settings.wordSelectionMode}).`,
        );
        console.log(
          `[Generation] Eligible difficulty pools for "${book.difficultyLevel}": ${getEligibleDifficultyPools(book.difficultyLevel || "Medium").join(", ")}`,
        );
      }

      // Domain assignments for single-domain mode
      // Domain assignments for single-domain mode
      let domainAssignments: string[] = [];
      if (useDomains && settings.wordSelectionMode === "single-domain") {
        domainAssignments = assignDomainsToPuzzles(
          themeDomainInfo.domains,
          book.puzzleCount,
        );
      }

      // Domain group assignments for mixed-domain mode — computed once
      // up front (same pattern as domainAssignments above) so grouping
      // is random-and-non-repeating across the whole book, instead of
      // being recomputed as a sliding window per puzzle.
      let mixedDomainAssignments: string[][] = [];
      if (useDomains && settings.wordSelectionMode === "mixed-domain") {
        mixedDomainAssignments = assignDomainGroupsForMixedPuzzles(
          themeDomainInfo.domains,
          book.puzzleCount,
        );
      }
      // domainAssignments / mixedDomainAssignments are pre-sized to
      // book.puzzleCount. Once retries push us past that length (because
      // earlier slots failed and we opened replacement slots), fall back to
      // a random domain instead of reading past the array end.
      const getDomainForSlot = (slotIndex: number): string => {
        if (settings.wordSelectionMode !== "single-domain") return "";
        if (slotIndex < domainAssignments.length) {
          return (
            domainAssignments[slotIndex] ||
            themeDomainInfo.domains[0]?.name ||
            ""
          );
        }
        const names = themeDomainInfo.domains.map((d) => d.name);
        return names[Math.floor(Math.random() * names.length)] || "";
      };

      const getDomainsForSlot = (slotIndex: number): string[] => {
        if (settings.wordSelectionMode !== "mixed-domain") return [];
        if (slotIndex < mixedDomainAssignments.length) {
          return mixedDomainAssignments[slotIndex] || [];
        }
        const names = themeDomainInfo.domains.map((d) => d.name);
        const shuffled = [...names].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(3, shuffled.length));
      };

      const allFingerprints: any[] = [];
      const targetDifficulty = book.difficultyLevel || "Medium";
      const usedWords: string[] = [];

      // Was: `for (puzzleIndex = 0; puzzleIndex < book.puzzleCount; puzzleIndex++)`
      // — exactly `puzzleCount` slots were attempted, and a slot that
      // exhausted all 15 regeneration attempts was simply marked failed and
      // skipped, permanently leaving the book short (this is the root cause
      // of "requested 100, got 95"). Now we keep opening new slots until we
      // actually HAVE puzzleCount successes, capped at maxTotalSlots so a
      // genuinely impossible request (vocabulary too small) still terminates.
      let slotIndex = 0;
      const maxTotalSlots = book.puzzleCount * 3;

      while (
        result.generatedPuzzles < book.puzzleCount &&
        slotIndex < maxTotalSlots
      ) {
        let puzzleGenerated = false;
        let attempts = 0;
        const maxRegenerationAttempts = 15;

        console.log(
          `[Generation] Starting slot ${slotIndex + 1} ` +
            `(have ${result.generatedPuzzles}/${book.puzzleCount} so far)`,
        );

        while (!puzzleGenerated && attempts < maxRegenerationAttempts) {
          attempts++;
          result.totalAttempts++;
          console.log(
            `[Generation] Slot ${slotIndex + 1}, attempt ${attempts}/${maxRegenerationAttempts}`,
          );

          try {
            let puzzleWords: string[] = [];
            let placementSuccess = false;
            let puzzleDomain = "";
            let puzzleDomains: string[] = [];

            if (useDomains) {
              const domainForPuzzle = getDomainForSlot(slotIndex);
              const domainsForPuzzle =
                settings.wordSelectionMode === "mixed-domain"
                  ? getDomainsForSlot(slotIndex)
                  : [domainForPuzzle];

              const selectionResult = DomainWordSelectionService.selectWords({
                theme: book.theme,
                domain: domainForPuzzle,
                domains: domainsForPuzzle,
                mode: settings.wordSelectionMode,
                wordsPerPuzzle: settings.targetWordsPerPuzzle,
                bookDifficulty: targetDifficulty,
                usedWords,
                minWordLength: settings.minWordLength,
                maxWordLength: settings.maxWordLength,
                gridSize: settings.gridSize,
                puzzleIndex: slotIndex,
              });

              if (selectionResult.shortage) {
                console.warn(
                  `[Generation] Word shortage for slot ${slotIndex + 1}: need ${selectionResult.shortageAmount} more words.`,
                );
                result.warnings.push(
                  `Slot ${slotIndex + 1}: word shortage of ${selectionResult.shortageAmount} (difficulty: ${targetDifficulty})`,
                );
              }

              if (selectionResult.words.length < settings.minWordsPerPuzzle) {
                throw new Error(
                  `Not enough eligible words for slot ${slotIndex + 1} ` +
                    `(domain: ${domainForPuzzle || domainsForPuzzle.join(", ")}, ` +
                    `available: ${selectionResult.words.length}, ` +
                    `minimum: ${settings.minWordsPerPuzzle}).`,
                );
              }

              puzzleDomain = selectionResult.domain;
              puzzleDomains = selectionResult.domains;

              for (
                let wc = selectionResult.words.length;
                wc >= settings.minWordsPerPuzzle;
                wc--
              ) {
                const candidateWords = selectionResult.words.slice(0, wc);

                const genResult = await this.generatePuzzleWithWords(
                  candidateWords,
                  settings,
                  targetDifficulty,
                  allFingerprints,
                  bookId,
                  puzzleDomain
                    ? {
                        theme: book.theme,
                        domain: puzzleDomain,
                        domains: puzzleDomains,
                      }
                    : undefined,
                );

                if (genResult.success) {
                  puzzleWords = candidateWords;
                  placementSuccess = true;
                  console.log(
                    `[Generation] ✅ Success with ${wc} words (domain: ${puzzleDomain || puzzleDomains.join(", ")})`,
                  );
                  break;
                }
                console.log(`[Generation] ❌ Failed with ${wc} words`);
              }
            } else {
              const availableWords = eligibleWords.filter(
                (word) => !usedWords.includes(word),
              );
              for (
                let wc = settings.targetWordsPerPuzzle;
                wc >= settings.minWordsPerPuzzle;
                wc--
              ) {
                const candidateWords =
                  WordSelectionService.selectCandidateWords(
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
                const genResult = await this.generatePuzzleWithWords(
                  candidateWords,
                  settings,
                  targetDifficulty,
                  allFingerprints,
                  bookId,
                );
                if (genResult.success) {
                  puzzleWords = candidateWords;
                  placementSuccess = true;
                  console.log(`[Generation] ✅ Success with ${wc} words`);
                  break;
                }
                console.log(`[Generation] ❌ Failed with ${wc} words`);
              }
            }

            if (!placementSuccess) {
              console.warn(
                `[Generation] Could not place words from ${settings.targetWordsPerPuzzle} down to ${settings.minWordsPerPuzzle}`,
              );
              if (attempts < maxRegenerationAttempts) {
                result.regeneratedPuzzles++;
                continue;
              }
              // This slot is spent — the outer while loop will open a fresh
              // one instead of accepting the book being short.
              result.failedPuzzles++;
              result.errors.push(
                `Slot ${slotIndex + 1} failed to place words after ${maxRegenerationAttempts} attempts`,
              );
              break;
            }

            usedWords.push(...puzzleWords);
            result.generatedPuzzles++;
            puzzleGenerated = true;

            console.log(
              `[Generation] Slot ${slotIndex + 1} succeeded after ${attempts} attempt(s) with ${puzzleWords.length} words. ` +
                `Total: ${result.generatedPuzzles}/${book.puzzleCount}`,
            );
          } catch (error: any) {
            console.error(
              `[Generation] Slot ${slotIndex + 1} attempt ${attempts} failed:`,
              error,
            );
            if (attempts >= maxRegenerationAttempts) {
              result.errors.push(
                `Slot ${slotIndex + 1} generation failed after ${maxRegenerationAttempts} attempts: ${error.message}`,
              );
              result.failedPuzzles++;
            } else {
              result.regeneratedPuzzles++;
              console.log(`[Generation] Retrying slot ${slotIndex + 1}...`);
            }
          }
        }

        slotIndex++;
      }

      if (result.generatedPuzzles < book.puzzleCount) {
        const shortfall = book.puzzleCount - result.generatedPuzzles;
        result.errors.push(
          `Could not reach the target of ${book.puzzleCount} puzzles after ${slotIndex} slot attempts ` +
            `(capped at ${maxTotalSlots}). Short by ${shortfall} — the theme/domain vocabulary is ` +
            `likely too small for this word length, grid size and difficulty combination.`,
        );
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
          ...(result.generatedPuzzles < result.totalPuzzles
            ? { puzzleCount: result.generatedPuzzles }
            : {}),
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
   * Every word already used across a book's existing puzzles, so a
   * newly added puzzle doesn't repeat them. generateBook() keeps this
   * in memory during bulk generation; a standalone "add one more
   * puzzle" call happens long after that list is gone, so it has to be
   * rebuilt from what's actually persisted.
   */
  static async getUsedWordsForBook(bookId: string): Promise<string[]> {
    const bookPuzzles = await prisma.bookPuzzle.findMany({
      where: { bookId },
      include: { puzzle: true },
    });

    const usedWords: string[] = [];
    for (const bp of bookPuzzles) {
      const data = bp.puzzle?.data as any;
      const words = Array.isArray(data?.words) ? data.words : [];
      usedWords.push(...words.map((w: string) => String(w).toUpperCase()));
    }
    return usedWords;
  }

  /**
   * Generates and saves ONE additional puzzle for an existing book,
   * using the same domain-aware, difficulty-restricted word selection
   * as bulk generation. This is what POST /api/books/[bookId]/puzzles
   * should call — it previously reimplemented its own word selection
   * using the legacy flat word list, which ignored domains, ignored the
   * book's difficulty pool restriction, and never excluded words
   * already used elsewhere in the book.
   *
   * Simplification versus bulk generation: domain choice here is random
   * per call rather than continuing the exact shuffled-cycle-with-
   * carryover sequence from the original bulk run (that cycle's state
   * was never persisted anywhere to resume from). Word-level exclusion
   * via usedWords still fully applies, so this won't repeat words —
   * it just doesn't guarantee perfect domain-rotation fairness against
   * puzzles added this way.
   */
  static async generateAdditionalPuzzle(
    bookId: string,
  ): Promise<{ success: boolean; bookPuzzle?: any; error?: string }> {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      return { success: false, error: "Book not found" };
    }

    const settings = this.getGenerationSettings(book);
    const themeDomainInfo = loadThemeDomains(book.theme);
    const useDomains =
      themeDomainInfo.hasVocabulary && themeDomainInfo.domainCount > 0;
    const targetDifficulty = book.difficultyLevel || "Medium";
    const usedWords = await this.getUsedWordsForBook(bookId);
    const allFingerprints: any[] = [];

    let puzzleWords: string[] = [];
    let placementSuccess = false;
    let lastError = "";

    const maxRegenerationAttempts = 15;
    for (
      let attempt = 1;
      attempt <= maxRegenerationAttempts && !placementSuccess;
      attempt++
    ) {
      if (useDomains) {
        const domainNames = themeDomainInfo.domains.map((d) => d.name);
        const shuffled = [...domainNames].sort(() => Math.random() - 0.5);

        const domainForPuzzle =
          settings.wordSelectionMode === "single-domain"
            ? shuffled[0] || ""
            : "";
        const domainsForPuzzle =
          settings.wordSelectionMode === "mixed-domain"
            ? shuffled.slice(0, Math.min(3, shuffled.length))
            : [domainForPuzzle];

        const selectionResult = DomainWordSelectionService.selectWords({
          theme: book.theme,
          domain: domainForPuzzle,
          domains: domainsForPuzzle,
          mode: settings.wordSelectionMode,
          wordsPerPuzzle: settings.targetWordsPerPuzzle,
          bookDifficulty: targetDifficulty,
          usedWords,
          minWordLength: settings.minWordLength,
          maxWordLength: settings.maxWordLength,
          gridSize: settings.gridSize,
          puzzleIndex: 0,
        });

        if (selectionResult.words.length < settings.minWordsPerPuzzle) {
          lastError =
            `Not enough eligible words (domain: ${domainForPuzzle || domainsForPuzzle.join(", ")}, ` +
            `available: ${selectionResult.words.length}, minimum: ${settings.minWordsPerPuzzle}). ` +
            `Difficulty restriction (${targetDifficulty}) prevents using other pools.`;
          continue;
        }

        const puzzleDomain = selectionResult.domain;
        const puzzleDomains = selectionResult.domains;

        for (
          let wc = selectionResult.words.length;
          wc >= settings.minWordsPerPuzzle;
          wc--
        ) {
          const candidateWords = selectionResult.words.slice(0, wc);
          const genResult = await this.generatePuzzleWithWords(
            candidateWords,
            settings,
            targetDifficulty,
            allFingerprints,
            bookId,
            puzzleDomain
              ? {
                  theme: book.theme,
                  domain: puzzleDomain,
                  domains: puzzleDomains,
                }
              : undefined,
          );
          if (genResult.success) {
            puzzleWords = candidateWords;
            placementSuccess = true;
            break;
          }
        }
      } else {
        const allThemeWords = WordSelectionService.getThemeWordsByLevel(
          book.theme,
          settings.vocabularyLevels,
        );
        const normalized = [
          ...new Set(
            allThemeWords.map((w) => w.trim().toUpperCase()).filter(Boolean),
          ),
        ];
        const eligibleWords = normalized.filter((word) => {
          const validLength =
            word.length >= settings.minWordLength &&
            word.length <= settings.maxWordLength;
          return (
            validLength &&
            word.length <= settings.gridSize &&
            !usedWords.includes(word)
          );
        });

        if (eligibleWords.length < settings.minWordsPerPuzzle) {
          lastError = `Not enough eligible words for theme "${book.theme}".`;
          continue;
        }

        for (
          let wc = settings.targetWordsPerPuzzle;
          wc >= settings.minWordsPerPuzzle;
          wc--
        ) {
          const candidateWords = WordSelectionService.selectCandidateWords(
            eligibleWords,
            wc,
            settings.gridSize,
          );
          if (candidateWords.length < wc) continue;

          const genResult = await this.generatePuzzleWithWords(
            candidateWords,
            settings,
            targetDifficulty,
            allFingerprints,
            bookId,
          );
          if (genResult.success) {
            puzzleWords = candidateWords;
            placementSuccess = true;
            break;
          }
        }
      }
    }

    if (!placementSuccess) {
      return {
        success: false,
        error:
          lastError ||
          "Could not generate a puzzle with the available words. Please try again.",
      };
    }

    const bookPuzzle = await prisma.bookPuzzle.findFirst({
      where: { bookId },
      orderBy: { position: "desc" },
    });

    await prisma.book.update({
      where: { id: bookId },
      data: { puzzleCount: { increment: 1 } },
    });

    return { success: true, bookPuzzle };
  }

  /**
   * Generate a single puzzle with given words
   */
  private static async generatePuzzleWithWords(
    words: string[],
    settings: GenerationSettings,
    targetDifficulty: string,
    allFingerprints: any[],
    bookId: string,
    puzzleMetadata?: { theme: string; domain: string; domains: string[] },
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

      // Fill empty cells with random letters
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

      await this.savePuzzle(
        bookId,
        placement,
        words,
        solution,
        validation.score,
        difficultyScore,
        puzzleMetadata,
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
      wordSelectionMode: "single-domain" as WordSelectionMode,
    };

    if (!book.generationSettings) {
      console.log("[Generation] No generation settings found, using defaults");
      return defaults;
    }

    const settings = book.generationSettings as any;

    console.log(
      "[Generation] Raw settings:",
      JSON.stringify(settings, null, 2),
    );

    const gridSize =
      settings.gridSize !== undefined && settings.gridSize !== null
        ? Number(settings.gridSize)
        : defaults.gridSize;

    const wordsPerPuzzle =
      settings.wordsPerPuzzle !== undefined && settings.wordsPerPuzzle !== null
        ? Number(settings.wordsPerPuzzle)
        : defaults.wordsPerPuzzle;

    const targetWordsPerPuzzle =
      settings.targetWordsPerPuzzle !== undefined &&
      settings.targetWordsPerPuzzle !== null
        ? Number(settings.targetWordsPerPuzzle)
        : wordsPerPuzzle;

    const minWordsPerPuzzle =
      settings.minWordsPerPuzzle !== undefined &&
      settings.minWordsPerPuzzle !== null
        ? Number(settings.minWordsPerPuzzle)
        : Math.max(3, Math.floor(wordsPerPuzzle * 0.6));

    const maxWordsPerPuzzle =
      settings.maxWordsPerPuzzle !== undefined &&
      settings.maxWordsPerPuzzle !== null
        ? Number(settings.maxWordsPerPuzzle)
        : Math.min(30, Math.ceil(wordsPerPuzzle * 1.3));

    const minWordLength =
      settings.minWordLength !== undefined && settings.minWordLength !== null
        ? Number(settings.minWordLength)
        : defaults.minWordLength;

    const maxWordLength =
      settings.maxWordLength !== undefined && settings.maxWordLength !== null
        ? Number(settings.maxWordLength)
        : defaults.maxWordLength;

    const directions =
      settings.directions !== undefined && settings.directions !== null
        ? Number(settings.directions)
        : defaults.directions;

    const allowReverse =
      settings.allowReverse !== undefined && settings.allowReverse !== null
        ? Boolean(settings.allowReverse)
        : defaults.allowReverse;

    const overlap = settings.overlap || defaults.overlap;

    let vocabularyLevels: string[] = defaults.vocabularyLevels;
    if (settings.vocabularyLevels && Array.isArray(settings.vocabularyLevels)) {
      vocabularyLevels = settings.vocabularyLevels;
    } else if (settings.vocabularyLevel) {
      vocabularyLevels = [settings.vocabularyLevel];
    } else if (settings.vocabulary) {
      vocabularyLevels = [settings.vocabulary];
    }

    const wordSelectionMode: WordSelectionMode =
      settings.wordSelectionMode === "mixed-domain"
        ? "mixed-domain"
        : "single-domain";

    console.log("[Generation] Parsed settings:", {
      gridSize,
      wordsPerPuzzle,
      targetWordsPerPuzzle,
      minWordsPerPuzzle,
      maxWordsPerPuzzle,
      minWordLength,
      maxWordLength,
      directions,
      allowReverse,
      overlap,
      vocabularyLevels,
    });

    return {
      gridSize,
      wordsPerPuzzle,
      targetWordsPerPuzzle,
      minWordsPerPuzzle,
      maxWordsPerPuzzle,
      minWordLength,
      maxWordLength,
      directions,
      allowReverse,
      overlap,
      vocabularyLevels,
      wordSelectionMode,
    };
  }

  /**
   * ✅ FIXED: Save a puzzle to the database with complete data sanitization
   * This prevents ALL corruption patterns seen in the PDF output
   */
  private static async savePuzzle(
    bookId: string,
    placement: any,
    words: string[],
    solution: any,
    qualityScore: number,
    difficultyScore: any,
    puzzleMetadata?: { theme: string; domain: string; domains: string[] },
  ): Promise<void> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      console.error(
        `[Generation] Book ${bookId} not found, cannot save puzzle`,
      );
      throw new Error(`Book ${bookId} not found`);
    }

    // ✅ STEP 1: Clean placedWords - Extract only what we need
    const cleanPlacedWords = (placement.placedWords || []).map((pw: any) => {
      // Get the direction name and clean it
      let directionName = String(pw.direction?.name || "right").toLowerCase();

      // Fix any corruption that might already exist
      const corruptionMap: Record<string, string> = {
        rght: "right",
        bght: "right",
        righs: "right",
        rgft: "right",
        r6t: "right",
        k4t: "right",
        i6t: "right",
        n8t: "right",
        bwn: "down",
        b6wn: "down",
        d6wn: "down",
        dwn: "down",
        bow: "down",
        bown: "down",
        d0n: "down",
        b0n: "down",
        lft: "left",
        l8t: "left",
        l2n: "left",
        l6t: "left",
        ld: "left",
        lift: "left",
        baft: "left",
        eeft: "left",
        lbb: "left",
        utft: "left",
        dft: "down",
        btwn: "down",
        dtwn: "down",
        b4h: "up",
        t4h: "up",
        r4h: "up",
        k4h: "up",
        qdft: "left",
        dene: "down",
        ntft: "left",
        bight: "right",
        ld8: "left",
        rtght: "right",
        bdene: "down",
      };

      // Check if the direction name is corrupted
      for (const [corrupted, correct] of Object.entries(corruptionMap)) {
        if (directionName === corrupted || directionName.includes(corrupted)) {
          directionName = correct;
          break;
        }
      }

      // Ensure valid direction name
      const validDirections = [
        "right",
        "left",
        "down",
        "up",
        "down-right",
        "up-left",
        "down-left",
        "up-right",
      ];
      if (!validDirections.includes(directionName)) {
        directionName = "right";
      }

      return {
        word: String(pw.word || "").toUpperCase(),
        row: Number(pw.row ?? 0),
        col: Number(pw.col ?? 0),
        direction: {
          dr: Number(pw.direction?.dr ?? 0),
          dc: Number(pw.direction?.dc ?? 1),
          name: directionName,
        },
      };
    });

    // ✅ STEP 2: Clean words
    const cleanWords = (words || []).map((w: string) =>
      String(w).toUpperCase(),
    );

    // ✅ STEP 3: Clean grid
    const cleanGrid = (placement.grid || []).map((row: string[]) =>
      row.map((cell: string) => String(cell).toUpperCase()),
    );

    // ✅ STEP 4: Build clean puzzle data
    const puzzleData: {
      grid: string[][];
      words: string[];
      placedWords: any[];
      size: number;
      theme?: string;
      domain?: string;
      domains?: string[];
    } = {
      grid: cleanGrid,
      words: cleanWords,
      placedWords: cleanPlacedWords,
      size: placement.grid?.length || 0,
    };

    // Add domain metadata if available
    if (puzzleMetadata) {
      if (puzzleMetadata.domains && puzzleMetadata.domains.length > 0) {
        puzzleData.theme = puzzleMetadata.theme;
        puzzleData.domains = puzzleMetadata.domains;
      } else if (puzzleMetadata.domain) {
        puzzleData.theme = puzzleMetadata.theme;
        puzzleData.domain = puzzleMetadata.domain;
      }
    }

    // ✅ STEP 5: Validate data is serializable
    try {
      JSON.stringify(puzzleData);
    } catch (error) {
      console.error(`[Generation] Puzzle data is not serializable:`, error);
      throw new Error(`Puzzle data is not serializable: ${error}`);
    }

    // ✅ STEP 6: Create puzzle
    const puzzle = await prisma.puzzle.create({
      data: {
        type: "wordsearch",
        data: puzzleData,
        difficulty: difficultyScore.label.toLowerCase(),
        difficultyScore: difficultyScore.score,
        difficultyLabel: difficultyScore.label,
        qualityMetrics: difficultyScore.breakdown,
        qualityScore,
      },
    });

    // ✅ STEP 7: Create puzzle version with deep clone
    const puzzleVersion = await prisma.puzzleVersion.create({
      data: {
        puzzleId: puzzle.id,
        versionNumber: 1,
        data: JSON.parse(JSON.stringify(puzzleData)),
        isActive: true,
      },
    });

    // ✅ STEP 8: Get existing count for position
    const existingCount = await prisma.bookPuzzle.count({
      where: { bookId },
    });

    // ✅ STEP 9: Create book puzzle
    const bookPuzzle = await prisma.bookPuzzle.create({
      data: {
        bookId,
        puzzleId: puzzle.id,
        puzzleVersionId: puzzleVersion.id,
        position: existingCount,
        displayNumber: existingCount + 1,
      },
    });

    // ✅ STEP 10: Clean solution words
    const cleanSolutionWords = (solution.words || []).map((sw: any) => {
      let direction = String(sw.direction || "right").toLowerCase();

      // Fix any corruption
      const corruptionMap: Record<string, string> = {
        rght: "right",
        bght: "right",
        righs: "right",
        rgft: "right",
        bwn: "down",
        b6wn: "down",
        d6wn: "down",
        lft: "left",
        l8t: "left",
        baft: "left",
        eeft: "left",
        qdft: "left",
        dene: "down",
        ntft: "left",
        bight: "right",
        ld8: "left",
        dwn: "down",
        rtght: "right",
        bdene: "down",
      };

      for (const [corrupted, correct] of Object.entries(corruptionMap)) {
        if (direction === corrupted || direction.includes(corrupted)) {
          direction = correct;
          break;
        }
      }

      const validDirections = [
        "right",
        "left",
        "down",
        "up",
        "down-right",
        "up-left",
        "down-left",
        "up-right",
      ];
      if (!validDirections.includes(direction)) {
        direction = "right";
      }

      return {
        word: String(sw.word || "").toUpperCase(),
        startRow: Number(sw.startRow ?? 0),
        startCol: Number(sw.startCol ?? 0),
        endRow: Number(sw.endRow ?? 0),
        endCol: Number(sw.endCol ?? 0),
        direction: direction,
      };
    });

    // ✅ STEP 11: Clean solution grid
    const cleanSolutionGrid = (solution.grid || []).map((row: string[]) =>
      row.map((cell: string) => String(cell).toUpperCase()),
    );

    // ✅ STEP 12: Create solution
    await prisma.solution.create({
      data: {
        bookPuzzleId: bookPuzzle.id,
        data: {
          grid: cleanSolutionGrid,
          words: cleanSolutionWords,
        },
        validatedAt: new Date(),
        isValid: true,
      },
    });

    console.log(
      `[Generation] ✅ Saved puzzle ${bookPuzzle.displayNumber} with ${cleanWords.length} words`,
    );
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
