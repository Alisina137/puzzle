import { prisma } from "@/lib/prisma";
import { QualityReportService } from "./quality-report.service";

export interface Recommendation {
  id: string;
  type: "regenerate" | "adjust" | "review" | "info";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  action: string;
  puzzleId?: string;
  bookId?: string;
  metadata?: any;
}

export interface RecommendationResult {
  bookId: string;
  recommendations: Recommendation[];
  summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
}

export class RecommendationService {
  /**
   * Generate recommendations for a book
   */
  static async generateRecommendations(bookId: string): Promise<RecommendationResult | null> {
    try {
      // Get the quality report
      const report = await QualityReportService.getReport(bookId);
      if (!report) {
        return null;
      }

      // Get the book with puzzles
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          bookPuzzles: {
            include: {
              puzzle: true,
            },
            orderBy: {
              position: "asc",
            },
          },
        },
      });

      if (!book) {
        return null;
      }

      const recommendations: Recommendation[] = [];
      let criticalCount = 0;
      let warningCount = 0;
      let infoCount = 0;

      // Helper to add recommendation
      const addRecommendation = (
        type: Recommendation["type"],
        severity: Recommendation["severity"],
        title: string,
        description: string,
        action: string,
        puzzleId?: string,
        metadata?: any
      ) => {
        recommendations.push({
          id: `rec-${Date.now()}-${recommendations.length}`,
          type,
          severity,
          title,
          description,
          action,
          puzzleId,
          bookId,
          metadata,
        });

        if (severity === "critical") criticalCount++;
        else if (severity === "warning") warningCount++;
        else infoCount++;
      };

      // Check for puzzles with validation issues
      const reportDetails = report.details as any[];
      if (reportDetails && Array.isArray(reportDetails)) {
        for (const detail of reportDetails) {
          const puzzleId = detail.puzzleId;
          const displayNumber = detail.displayNumber;

          if (detail.status === "error") {
            addRecommendation(
              "regenerate",
              "critical",
              `Puzzle #${displayNumber} needs regeneration`,
              `This puzzle has validation errors: ${detail.issues.join(", ")}`,
              `Regenerate puzzle #${displayNumber}`,
              puzzleId,
              { displayNumber, issues: detail.issues }
            );
          } else if (detail.status === "warning") {
            addRecommendation(
              "adjust",
              "warning",
              `Puzzle #${displayNumber} has quality issues`,
              `Issues: ${detail.issues.join(", ")}`,
              `Review puzzle #${displayNumber}`,
              puzzleId,
              { displayNumber, issues: detail.issues }
            );
          }
        }
      }

      // Check for duplicate puzzles
      if (report.duplicates > 0) {
        addRecommendation(
          "regenerate",
          "warning",
          `${report.duplicates} duplicate puzzle(s) detected`,
          "Duplicate puzzles may frustrate users and reduce book quality",
          "Regenerate duplicate puzzles",
          undefined,
          { count: report.duplicates }
        );
      }

      // Check difficulty consistency
      if (report.difficultyConsistency < 50 && book.puzzleCount > 1) {
        const targetLabel = book.difficultyLevel || "Medium";
        addRecommendation(
          "adjust",
          "warning",
          "Difficulty consistency is low",
          `Puzzles vary significantly in difficulty. Target is ${targetLabel}.`,
          "Regenerate puzzles to improve consistency",
          undefined,
          { consistency: report.difficultyConsistency, target: targetLabel }
        );
      }

      // Check score
      if (report.score < 60) {
        addRecommendation(
          "review",
          "critical",
          "Overall quality score is low",
          `Score is ${Math.round(report.score)}/100. Multiple issues need attention.`,
          "Review all recommendations and regenerate problem puzzles",
          undefined,
          { score: report.score }
        );
      } else if (report.score < 80) {
        addRecommendation(
          "review",
          "warning",
          "Quality score could be improved",
          `Score is ${Math.round(report.score)}/100. Some puzzles need attention.`,
          "Review the specific issues listed above",
          undefined,
          { score: report.score }
        );
      }

      // Check for empty or incomplete report
      if (report.totalPuzzles === 0) {
        addRecommendation(
          "info",
          "info",
          "No puzzles in this book",
          "This book has no puzzles. Generate puzzles to create your book.",
          "Generate puzzles",
          undefined,
          {}
        );
      }

      // Check if book is still generating
      if (book.status === "generating") {
        addRecommendation(
          "info",
          "info",
          "Book is still generating",
          "Puzzles are being generated in the background. Check back soon.",
          "Refresh page",
          undefined,
          {}
        );
      }

      // If no issues found
      if (recommendations.length === 0) {
        addRecommendation(
          "info",
          "info",
          "No issues detected",
          "Your book looks great! All puzzles passed validation.",
          "Export your book",
          undefined,
          {}
        );
      }

      return {
        bookId,
        recommendations,
        summary: {
          critical: criticalCount,
          warning: warningCount,
          info: infoCount,
          total: recommendations.length,
        },
      };
    } catch (error) {
      console.error("[RecommendationService] Error generating recommendations:", error);
      return null;
    }
  }

  /**
   * Get recommendations for a book
   */
  static async getRecommendations(bookId: string): Promise<RecommendationResult | null> {
    return this.generateRecommendations(bookId);
  }

  /**
   * Apply a recommendation fix
   */
  static async applyFix(
    bookId: string,
    recommendationId: string,
    puzzleId?: string
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Get the recommendation
      const result = await this.getRecommendations(bookId);
      if (!result) {
        return {
          success: false,
          message: "Failed to get recommendations",
        };
      }

      const recommendation = result.recommendations.find(
        (r) => r.id === recommendationId
      );

      if (!recommendation) {
        return {
          success: false,
          message: "Recommendation not found",
        };
      }

      // Handle different recommendation types
      switch (recommendation.type) {
        case "regenerate":
         if (recommendation.puzzleId || puzzleId) {
  const targetPuzzleId = (recommendation.puzzleId || puzzleId) as string;
  if (targetPuzzleId) {
    await this.regeneratePuzzle(bookId, targetPuzzleId);
  }
            return {
              success: true,
              message: "Puzzle regeneration started. Please check back in a moment.",
            };
          } else {
            // Regenerate all problem puzzles
            await this.regenerateProblemPuzzles(bookId);
            return {
              success: true,
              message: "All problem puzzles queued for regeneration.",
            };
          }

        case "adjust":
          return {
            success: true,
            message: "Adjustment queued. Please regenerate the book to apply changes.",
          };

        case "review":
          return {
            success: true,
            message: "Issue marked for review. Please make adjustments manually.",
          };

        case "info":
          return {
            success: true,
            message: "This is informational. No action needed.",
          };

        default:
          return {
            success: false,
            message: "Unknown recommendation type",
          };
      }
    } catch (error) {
      console.error("[RecommendationService] Error applying fix:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to apply fix",
      };
    }
  }

  /**
   * Apply all critical fixes
   */
  static async applyAllCriticalFixes(bookId: string): Promise<{
    success: boolean;
    message: string;
    applied: number;
  }> {
    try {
      const result = await this.getRecommendations(bookId);
      if (!result) {
        return {
          success: false,
          message: "Failed to get recommendations",
          applied: 0,
        };
      }

      const criticalRecommendations = result.recommendations.filter(
        (r) => r.severity === "critical"
      );

      if (criticalRecommendations.length === 0) {
        return {
          success: true,
          message: "No critical issues to fix",
          applied: 0,
        };
      }

      // Apply all critical fixes
      let appliedCount = 0;
      for (const rec of criticalRecommendations) {
        const result = await this.applyFix(bookId, rec.id, rec.puzzleId);
        if (result.success) {
          appliedCount++;
        }
      }

      return {
        success: true,
        message: `Applied ${appliedCount} of ${criticalRecommendations.length} critical fixes.`,
        applied: appliedCount,
      };
    } catch (error) {
      console.error("[RecommendationService] Error applying critical fixes:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to apply fixes",
        applied: 0,
      };
    }
  }

  /**
   * Regenerate a specific puzzle
   */
  private static async regeneratePuzzle(bookId: string, puzzleId: string): Promise<void> {
    try {
      // Mark the puzzle for regeneration
      await prisma.regenerationRequest.create({
        data: {
          bookId,
          puzzleId,
          reason: "Quality recommendation",
          status: "pending",
          requestedAt: new Date(),
        },
      });

      // Update puzzle status
      await prisma.puzzle.update({
        where: { id: puzzleId },
        data: {
          validationStatus: "needs_regeneration",
        },
      });

      // Log the action
      console.log(`[RecommendationService] Queued regeneration for puzzle ${puzzleId} in book ${bookId}`);
    } catch (error) {
      console.error(`[RecommendationService] Error regenerating puzzle ${puzzleId}:`, error);
      throw error;
    }
  }

  /**
   * Regenerate all problem puzzles in a book
   */
  private static async regenerateProblemPuzzles(bookId: string): Promise<void> {
    try {
      // Get all puzzles that need regeneration
      const bookPuzzles = await prisma.bookPuzzle.findMany({
        where: { bookId },
        include: {
          puzzle: true,
        },
      });

      let regeneratedCount = 0;
      for (const bookPuzzle of bookPuzzles) {
        const puzzle = bookPuzzle.puzzle;
        // Check if puzzle needs regeneration
       const qualityScoreNum = puzzle.qualityScore ? Number(puzzle.qualityScore) : 0;
if (
  puzzle.validationStatus === "needs_regeneration" ||
  qualityScoreNum < 70
) {
          await this.regeneratePuzzle(bookId, puzzle.id);
          regeneratedCount++;
        }
      }

      console.log(`[RecommendationService] Queued regeneration for ${regeneratedCount} puzzles in book ${bookId}`);
    } catch (error) {
      console.error(`[RecommendationService] Error regenerating problem puzzles for ${bookId}:`, error);
      throw error;
    }
  }
}