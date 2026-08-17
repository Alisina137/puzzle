import {
  SolutionWord,
  PuzzleSolution,
  SolutionVerificationResult,
} from "./solution.types.js";
import { PlacedWord } from "./placement.types.js";
import { GridUtils } from "./grid-utils";

export class SolutionGenerator {
  static generateSolution(
    grid: string[][],
    placedWords: PlacedWord[],
  ): PuzzleSolution {
    const solutionWords: SolutionWord[] = placedWords.map((pw) => {
      const endRow = pw.row + (pw.word.length - 1) * pw.direction.dr;
      const endCol = pw.col + (pw.word.length - 1) * pw.direction.dc;
      return {
        word: pw.word,
        startRow: pw.row,
        startCol: pw.col,
        endRow: endRow,
        endCol: endCol,
        direction: pw.direction.name,
      };
    });

    const highlightedGrid = this.createHighlightedGrid(grid, placedWords);

    const content = placedWords
      .map(
        (pw) =>
          pw.word +
          ":" +
          pw.row +
          "," +
          pw.col +
          "," +
          pw.direction.dr +
          "," +
          pw.direction.dc,
      )
      .sort()
      .join("|");
    const solutionHash = this.simpleHash(content);

    return {
      grid: GridUtils.copyGrid(grid),
      words: solutionWords,
      highlightedGrid: highlightedGrid,
      solutionHash: solutionHash,
    };
  }

  private static createHighlightedGrid(
    grid: string[][],
    placedWords: PlacedWord[],
  ): string[][] {
    return GridUtils.copyGrid(grid);
  }

  static getSolutionText(solution: PuzzleSolution): string {
    const lines: string[] = [];
    lines.push("=== PUZZLE SOLUTION ===");
    lines.push("");
    lines.push("Grid:");
    lines.push(solution.grid.map((row) => row.join(" ")).join("\n"));
    lines.push("");
    lines.push("Words Found:");
    solution.words.forEach((w) => {
      lines.push(
        "  " +
          w.word +
          ": (" +
          w.startRow +
          "," +
          w.startCol +
          ") -> (" +
          w.endRow +
          "," +
          w.endCol +
          ") " +
          w.direction,
      );
    });
    lines.push("");
    lines.push("Solution Hash: " + solution.solutionHash);
    return lines.join("\n");
  }

  static verifySolution(
    solution: PuzzleSolution,
    originalGrid: string[][],
    originalWords: string[],
  ): SolutionVerificationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const foundWords: string[] = [];
    const missingWords: string[] = [];

    if (
      solution.grid.length !== originalGrid.length ||
      solution.grid[0].length !== originalGrid[0].length
    ) {
      errors.push("Grid dimensions do not match");
      return {
        valid: false,
        errors,
        warnings,
        foundWords,
        missingWords,
      };
    }

    const solutionWordSet = new Set(solution.words.map((w) => w.word));

    for (const word of originalWords) {
      if (solutionWordSet.has(word)) {
        foundWords.push(word);
      } else {
        missingWords.push(word);
      }
    }

    if (missingWords.length > 0) {
      errors.push("Missing words: " + missingWords.join(", "));
    }

    for (const word of solution.words) {
      if (!originalWords.includes(word.word)) {
        warnings.push("Extra word found in solution: " + word.word);
      }
    }

    for (let i = 0; i < solution.grid.length; i++) {
      for (let j = 0; j < solution.grid[i].length; j++) {
        if (solution.grid[i][j] !== originalGrid[i][j]) {
          errors.push(
            "Grid mismatch at (" +
              i +
              ", " +
              j +
              "): expected " +
              originalGrid[i][j] +
              ", got " +
              solution.grid[i][j],
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      foundWords,
      missingWords,
    };
  }

  static getVerificationSummary(result: SolutionVerificationResult): string {
    const status = result.valid ? "PASSED" : "FAILED";
    const lines = [
      "Verification: " + status,
      "Found Words: " + result.foundWords.length,
      "Missing Words: " + result.missingWords.length,
    ];

    if (result.missingWords.length > 0) {
      lines.push("Missing: " + result.missingWords.join(", "));
    }

    if (result.warnings.length > 0) {
      lines.push("Warnings:");
      result.warnings.forEach((w) => lines.push("  - " + w));
    }

    if (result.errors.length > 0) {
      lines.push("Errors:");
      result.errors.forEach((e) => lines.push("  - " + e));
    }

    return lines.join("\n");
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}
