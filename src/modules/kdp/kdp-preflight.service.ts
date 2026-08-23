import { prisma } from "@/lib/prisma";

export interface PreflightResult {
  passed: boolean;
  checks: PreflightCheck[];
  errors: string[];
  warnings: string[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface PreflightCheck {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  message?: string;
  details?: any;
}

export interface PreflightOptions {
  trimSize: string;
  hasBleed: boolean;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  gutter: number;
  largePrint: boolean;
  pageNumbering: boolean;
  solutionPlacement: string;
  includeSolution: boolean;
}

export class KDPPreflightService {
  /**
   * Run preflight checks on a book
   */
  static async runPreflight(bookId: string, userId: string): Promise<PreflightResult> {
    try {
      // Verify book ownership and include puzzles with their data
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          kdpConfig: true,
          bookPuzzles: {
            include: {
              puzzle: {
                select: {
                  id: true,
                  qualityScore: true,
                  fingerprint: true,
                }
              }
            }
          },
        },
      });

      if (!book || book.userId !== userId) {
        throw new Error("Book not found or unauthorized");
      }

      // Get KDP config or use defaults
      const config = book.kdpConfig;
      const options: PreflightOptions = {
        trimSize: config?.trimSize || "6x9",
        hasBleed: config?.hasBleed ?? false,
        marginTop: config?.marginTop ?? 72,
        marginBottom: config?.marginBottom ?? 72,
        marginLeft: config?.marginLeft ?? 72,
        marginRight: config?.marginRight ?? 72,
        gutter: config?.gutter ?? 0,
        largePrint: config?.largePrint ?? false,
        pageNumbering: config?.pageNumbering ?? true,
        solutionPlacement: config?.solutionPlacement || "end",
        includeSolution: config?.includeSolution ?? true,
      };

      const checks: PreflightCheck[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Get puzzles with quality scores
      const puzzlesWithScores = book.bookPuzzles
        .filter(bp => bp.puzzle)
        .map(bp => bp.puzzle!);

      // 1. Check if book has puzzles
      checks.push({
        id: "puzzles-exist",
        name: "Puzzles Exist",
        description: "Book must have at least one puzzle",
        passed: puzzlesWithScores.length > 0,
        severity: "error",
        message: puzzlesWithScores.length === 0 ? "No puzzles found in this book" : undefined,
      });
      if (puzzlesWithScores.length === 0) {
        errors.push("No puzzles found in this book");
      }

      // 2. Check puzzle quality - convert Decimal to number
      const lowQualityPuzzles = puzzlesWithScores.filter((p) => {
        const score = p.qualityScore ? Number(p.qualityScore) : 0;
        return score < 60;
      });
      
      checks.push({
        id: "puzzle-quality",
        name: "Puzzle Quality",
        description: "All puzzles should have a quality score of 60 or higher",
        passed: lowQualityPuzzles.length === 0,
        severity: "warning",
        message: lowQualityPuzzles.length > 0 
          ? `${lowQualityPuzzles.length} puzzles have low quality scores (< 60)` 
          : undefined,
      });
      if (lowQualityPuzzles.length > 0) {
        warnings.push(`${lowQualityPuzzles.length} puzzles have low quality scores (< 60)`);
      }

      // 3. Check trim size is valid
      const validTrimSizes = ["5x8", "5.5x8.5", "6x9", "7x10", "8.5x11"];
      const isValidTrim = validTrimSizes.includes(options.trimSize);
      checks.push({
        id: "trim-size",
        name: "Trim Size",
        description: "Trim size must be a valid KDP size",
        passed: isValidTrim,
        severity: "error",
        message: isValidTrim ? undefined : `Invalid trim size: ${options.trimSize}`,
      });
      if (!isValidTrim) {
        errors.push(`Invalid trim size: ${options.trimSize}`);
      }

      // 4. Check margins
      const minMargin = options.largePrint ? 60 : 36;
      const maxMargin = 150;
      const marginChecks = [
        { name: "Top", value: options.marginTop },
        { name: "Bottom", value: options.marginBottom },
        { name: "Left", value: options.marginLeft },
        { name: "Right", value: options.marginRight },
      ];

      let marginErrors = 0;
      for (const margin of marginChecks) {
        if (margin.value < minMargin || margin.value > maxMargin) {
          marginErrors++;
          errors.push(`${margin.name} margin (${margin.value}pts) is outside the valid range (${minMargin}-${maxMargin}pts)`);
        }
      }

      checks.push({
        id: "margins",
        name: "Margins",
        description: `All margins must be between ${minMargin} and ${maxMargin} points`,
        passed: marginErrors === 0,
        severity: "error",
        message: marginErrors > 0 ? `${marginErrors} margin(s) are outside valid range` : undefined,
      });

      // 5. Check bleed settings
      if (options.hasBleed) {
        const hasBleedMargin = 
          options.marginTop >= 72 &&
          options.marginBottom >= 72 &&
          options.marginLeft >= 72 &&
          options.marginRight >= 72;
        checks.push({
          id: "bleed-margins",
          name: "Bleed Margins",
          description: "When bleed is enabled, all margins should be at least 72pts",
          passed: hasBleedMargin,
          severity: "warning",
          message: hasBleedMargin ? undefined : "Some margins are too small for bleed",
        });
        if (!hasBleedMargin) {
          warnings.push("Some margins are too small for bleed");
        }
      }

      // 6. Check page count
      const pageCount = this.estimatePageCount(puzzlesWithScores.length, options);
      const isPageCountValid = pageCount >= 24 && pageCount <= 800;
      checks.push({
        id: "page-count",
        name: "Page Count",
        description: "KDP requires 24-800 pages for print books",
        passed: isPageCountValid,
        severity: "error",
        message: isPageCountValid 
          ? `${pageCount} pages (within KDP requirements)` 
          : `${pageCount} pages (KDP requires 24-800 pages)`,
        details: { pageCount },
      });
      if (!isPageCountValid) {
        errors.push(`Page count (${pageCount}) is outside KDP requirements (24-800 pages)`);
      }

      // 7. Check for duplicates (fingerprint detection)
      const fingerprints = puzzlesWithScores
        .filter(p => p.fingerprint)
        .map(p => p.fingerprint);
      const uniqueFingerprints = new Set(fingerprints);
      const duplicateCount = fingerprints.length - uniqueFingerprints.size;
      
      checks.push({
        id: "duplicates",
        name: "Duplicate Puzzles",
        description: "Book should have unique puzzles",
        passed: duplicateCount === 0,
        severity: "warning",
        message: duplicateCount > 0 ? `${duplicateCount} duplicate puzzles detected` : undefined,
      });
      if (duplicateCount > 0) {
        warnings.push(`${duplicateCount} duplicate puzzles detected`);
      }

      // Calculate summary
      const passed = checks.filter(c => c.passed).length;
      const failed = checks.filter(c => !c.passed && c.severity === "error").length;
      const warningCount = checks.filter(c => !c.passed && c.severity === "warning").length;

      return {
        passed: errors.length === 0,
        checks,
        errors,
        warnings,
        summary: {
          total: checks.length,
          passed,
          failed,
          warnings: warningCount,
        },
      };
    } catch (error) {
      console.error("[KDPPreflightService] Error running preflight:", error);
      throw error;
    }
  }

  /**
   * Estimate page count for the book
   */
  private static estimatePageCount(puzzleCount: number, options: PreflightOptions): number {
    // Base pages: title, copyright, etc.
    let pages = 4;
    
    // Each puzzle takes 1-2 pages (grid + solution)
    const pagesPerPuzzle = options.includeSolution ? 2 : 1;
    pages += puzzleCount * pagesPerPuzzle;
    
    // Solutions at the end take additional pages
    if (options.solutionPlacement === "end" && options.includeSolution) {
      pages += Math.ceil(puzzleCount / 2);
    }
    
    // Large print takes more pages
    if (options.largePrint) {
      pages = Math.ceil(pages * 1.3);
    }
    
    return Math.max(24, Math.min(800, pages));
  }

  /**
   * Get preflight status text
   */
  static getStatusText(result: PreflightResult): string {
    if (result.passed) {
      return "✅ All checks passed! Your book is ready for KDP.";
    }
    if (result.errors.length > 0) {
      return `❌ ${result.errors.length} critical issue(s) found. Please fix them before exporting.`;
    }
    return `⚠️ ${result.warnings.length} warning(s) found. Your book can be exported but may have issues.`;
  }
}
