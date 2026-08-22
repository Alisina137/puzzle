import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface QualityReport {
  bookId: string;
  score: number;
  totalPuzzles: number;
  validPuzzles: number;
  verifiedSolutions: number;
  duplicates: number;
  difficultyConsistency: number;
  warnings: string[];
  recommendations: string[];
  details: {
    puzzleId: string;
    displayNumber: number;
    score: number;
    status: "valid" | "warning" | "error";
    issues: string[];
  }[];
}

export interface QualityReportData {
  score: number;
  totalPuzzles: number;
  validPuzzles: number;
  verifiedSolutions: number;
  duplicates: number;
  difficultyConsistency: number;
  warnings: string[];
  recommendations: string[];
  details: any[];
}

export class QualityReportService {
  /**
   * Generate a quality report for a book
   */
  static async generateReport(bookId: string): Promise<QualityReport | null> {
    try {
      // Get the book with all puzzles
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          bookPuzzles: {
            include: {
              puzzle: true,
              solution: true,
            },
            orderBy: {
              position: "asc",
            },
          },
        },
      });

      if (!book) {
        throw new Error("Book not found");
      }

      const totalPuzzles = book.bookPuzzles.length;
      if (totalPuzzles === 0) {
        return {
          bookId,
          score: 0,
          totalPuzzles: 0,
          validPuzzles: 0,
          verifiedSolutions: 0,
          duplicates: 0,
          difficultyConsistency: 0,
          warnings: ["No puzzles found in this book"],
          recommendations: ["Generate puzzles for this book"],
          details: [],
        };
      }

      let validPuzzles = 0;
      let verifiedSolutions = 0;
      let duplicateCount = 0;
      const warnings: string[] = [];
      const recommendations: string[] = [];
      const details: any[] = [];
      const scores: number[] = [];
      const fingerprints: string[] = [];

      // Validate each puzzle
      for (const bookPuzzle of book.bookPuzzles) {
        const puzzle = bookPuzzle.puzzle;
        const solution = bookPuzzle.solution;
        const issues: string[] = [];
        let status: "valid" | "warning" | "error" = "valid";

        // Validate puzzle data
        if (!puzzle.data || typeof puzzle.data !== "object") {
          issues.push("Puzzle data is missing or invalid");
          status = "error";
        }

        // Validate grid exists
        if (puzzle.data && !(puzzle.data as any).grid) {
          issues.push("Puzzle grid is missing");
          status = "error";
        }

        // Validate words exist
        if (puzzle.data && !(puzzle.data as any).words) {
          issues.push("Puzzle words are missing");
          status = "error";
        }

        // Validate solution exists
        if (!solution) {
          issues.push("Solution is missing");
          status = "error";
        } else {
          verifiedSolutions++;
        }

        // Check puzzle quality score
        const qualityScoreNum = puzzle.qualityScore
          ? Number(puzzle.qualityScore)
          : 0;
        if (qualityScoreNum < 70) {
          issues.push(`Quality score is low (${puzzle.qualityScore}/100)`);
          status = status === "error" ? "error" : "warning";
        }

        // Check difficulty label
        if (!puzzle.difficultyLabel) {
          issues.push("Difficulty label is missing");
          status = status === "error" ? "error" : "warning";
        }

        // Collect scores for consistency check
        if (puzzle.difficultyScore !== null) {
          scores.push(puzzle.difficultyScore);
        }

        // Check for duplicates
        const fingerprint = puzzle.fingerprint;
        if (fingerprint) {
          if (fingerprints.includes(fingerprint)) {
            duplicateCount++;
            issues.push("Duplicate puzzle detected");
            status = status === "error" ? "error" : "warning";
          }
          fingerprints.push(fingerprint);
        }

        if (issues.length === 0) {
          validPuzzles++;
        }

        details.push({
          puzzleId: puzzle.id,
          displayNumber: bookPuzzle.displayNumber,
          score: puzzle.qualityScore ? Number(puzzle.qualityScore) : 0,
          status,
          issues,
        });
      }

      // Calculate difficulty consistency
      let difficultyConsistency = 0;
      if (scores.length > 1) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance =
          scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        difficultyConsistency = Math.max(0, 100 - stdDev * 2);
        if (difficultyConsistency < 50) {
          warnings.push("Difficulty consistency is low across puzzles");
          recommendations.push(
            "Regenerate some puzzles to improve difficulty consistency",
          );
        }
      }

      // Add warnings and recommendations
      if (validPuzzles < totalPuzzles) {
        warnings.push(
          `${totalPuzzles - validPuzzles} puzzles failed validation`,
        );
        recommendations.push("Review and regenerate invalid puzzles");
      }

      if (duplicateCount > 0) {
        warnings.push(`${duplicateCount} duplicate puzzles detected`);
        recommendations.push("Regenerate duplicate puzzles");
      }

      if (scores.length > 0) {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avgScore < 40) {
          warnings.push(
            `Average difficulty score is low (${Math.round(avgScore)}/100)`,
          );
          recommendations.push("Consider generating more challenging puzzles");
        }
        if (avgScore > 80) {
          warnings.push(
            `Average difficulty score is high (${Math.round(avgScore)}/100)`,
          );
          recommendations.push(
            "Consider generating easier puzzles for accessibility",
          );
        }
      }

      // Calculate overall score
      const validationRate = totalPuzzles > 0 ? validPuzzles / totalPuzzles : 0;
      const solutionRate =
        totalPuzzles > 0 ? verifiedSolutions / totalPuzzles : 0;
      const duplicatePenalty = Math.min(duplicateCount * 5, 30);
      const consistencyBonus = difficultyConsistency > 80 ? 5 : 0;

      const baseScore =
        validationRate * 50 + solutionRate * 30 + difficultyConsistency * 0.15;
      const finalScore = Math.max(
        0,
        Math.min(100, baseScore - duplicatePenalty + consistencyBonus),
      );

      // Save the report to the database
      const reportData = {
        bookId: bookId,
        score: new Prisma.Decimal(finalScore),
        totalPuzzles,
        validPuzzles,
        verifiedSolutions,
        duplicates: duplicateCount,
        difficultyConsistency: new Prisma.Decimal(difficultyConsistency),
        warnings: warnings,
        recommendations: recommendations,
      };

      // Check if a report already exists
      const existingReport = await prisma.bookQualityReport.findUnique({
        where: { bookId },
      });

      if (existingReport) {
        await prisma.bookQualityReport.update({
          where: { bookId },
          data: reportData,
        });
      } else {
        await prisma.bookQualityReport.create({
          data: reportData,
        });
      }

      return {
        bookId,
        score: finalScore,
        totalPuzzles,
        validPuzzles,
        verifiedSolutions,
        duplicates: duplicateCount,
        difficultyConsistency,
        warnings,
        recommendations,
        details,
      };
    } catch (error) {
      console.error("[QualityReportService] Error generating report:", error);
      return null;
    }
  }

  /**
   * Get a quality report for a book
   */
  static async getReport(bookId: string): Promise<any | null> {
    try {
      const report = await prisma.bookQualityReport.findUnique({
        where: { bookId },
      });
      return report;
    } catch (error) {
      console.error("[QualityReportService] Error fetching report:", error);
      return null;
    }
  }

  /**
   * Delete a quality report
   */
  static async deleteReport(bookId: string): Promise<boolean> {
    try {
      await prisma.bookQualityReport.delete({
        where: { bookId },
      });
      return true;
    } catch (error) {
      console.error("[QualityReportService] Error deleting report:", error);
      return false;
    }
  }
}
