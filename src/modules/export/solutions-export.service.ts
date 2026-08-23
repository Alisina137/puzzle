
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";

export interface SolutionsExportOptions {
  format: "pdf" | "txt";
  includeWordList?: boolean;
  includeCoordinates?: boolean;
}

export interface SolutionsExportResult {
  success: boolean;
  buffer?: Buffer;
  fileName?: string;
  error?: string;
}

export class SolutionsExportService {
  /**
   * Export solutions for a book
   */
  static async exportSolutions(
    bookId: string,
    userId: string,
    options: SolutionsExportOptions = { format: "pdf" }
  ): Promise<SolutionsExportResult> {
    try {
      // Verify book ownership
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          bookPuzzles: {
            include: {
              puzzle: true,
              solution: true,
            },
            orderBy: { position: "asc" },
          },
        },
      });

      if (!book || book.userId !== userId) {
        return {
          success: false,
          error: "Book not found or unauthorized",
        };
      }

      if (book.bookPuzzles.length === 0) {
        return {
          success: false,
          error: "No puzzles found in this book",
        };
      }

      const opts = {
        format: options.format || "pdf",
        includeWordList: options.includeWordList ?? true,
        includeCoordinates: options.includeCoordinates ?? true,
      };

      if (opts.format === "txt") {
        return this.exportSolutionsTXT(book, opts);
      } else {
        return this.exportSolutionsPDF(book, opts);
      }
    } catch (error) {
      console.error("[SolutionsExportService] Error exporting solutions:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to export solutions",
      };
    }
  }

  /**
   * Export solutions as TXT
   */
  private static async exportSolutionsTXT(
    book: any,
    options: any
  ): Promise<SolutionsExportResult> {
    const lines: string[] = [];

    lines.push(`=== SOLUTIONS FOR: ${book.title} ===`);
    lines.push(`Theme: ${book.theme}`);
    lines.push(`Total Puzzles: ${book.bookPuzzles.length}`);
    lines.push("");
    lines.push("=".repeat(60));
    lines.push("");

    for (const bookPuzzle of book.bookPuzzles) {
      const puzzle = bookPuzzle.puzzle;
      const puzzleData = puzzle.data as any;
      const solutionData = bookPuzzle.solution?.data as any;

      lines.push(`PUZZLE #${bookPuzzle.displayNumber}`);
      lines.push("-".repeat(40));

      // Solution grid
      const solutionGrid = solutionData?.grid || [];
      if (solutionGrid.length > 0) {
        for (const row of solutionGrid) {
          lines.push(row.map((cell: string) => cell || ".").join(" "));
        }
        lines.push("");
      }

      // Word list with coordinates
      if (options.includeWordList && puzzleData?.words) {
        lines.push("Words:");
        for (const word of puzzleData.words) {
          // Find word in solution
          const wordInfo = solutionData?.words?.find(
            (w: any) => w.word === word || w === word
          );
          if (wordInfo && options.includeCoordinates) {
            const startRow = (wordInfo.startRow ?? 0) + 1;
            const startCol = (wordInfo.startCol ?? 0) + 1;
            const endRow = (wordInfo.endRow ?? wordInfo.startRow ?? 0) + 1;
            const endCol = (wordInfo.endCol ?? wordInfo.startCol ?? 0) + 1;
            lines.push(`  ${word}: (${startRow},${startCol}) -> (${endRow},${endCol})`);
          } else {
            lines.push(`  ${word}`);
          }
        }
        lines.push("");
      }

      lines.push("=".repeat(60));
      lines.push("");
    }

    // Create TXT buffer
    const txtContent = lines.join("\n");
    const buffer = Buffer.from(txtContent, "utf-8");

    return {
      success: true,
      buffer,
      fileName: `${book.title.replace(/\s+/g, "_")}_solutions.txt`,
    };
  }

  /**
   * Export solutions as PDF
   */
  private static async exportSolutionsPDF(
    book: any,
    options: any
  ): Promise<SolutionsExportResult> {
    return new Promise((resolve) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margins: { top: 72, bottom: 72, left: 72, right: 72 },
          autoFirstPage: true,
        });

        const chunks: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            success: true,
            buffer,
            fileName: `${book.title.replace(/\s+/g, "_")}_solutions.pdf`,
          });
        });
        doc.on("error", (error: Error) => {
          resolve({
            success: false,
            error: error.message || "Failed to generate PDF",
          });
        });

        // Title
        doc.fontSize(24).text(`SOLUTIONS FOR: ${book.title}`, { align: "center" });
        doc.moveDown();
        doc.fontSize(14).text(`Theme: ${book.theme}`, { align: "center" });
        doc.text(`Total Puzzles: ${book.bookPuzzles.length}`, { align: "center" });
        doc.moveDown(2);

        for (const bookPuzzle of book.bookPuzzles) {
          const puzzle = bookPuzzle.puzzle;
          const puzzleData = puzzle.data as any;
          const solutionData = bookPuzzle.solution?.data as any;

          doc.addPage();
          doc.fontSize(18).text(`PUZZLE #${bookPuzzle.displayNumber}`, { align: "center" });
          doc.moveDown(0.5);

          // Solution grid
          const solutionGrid = solutionData?.grid || [];
          if (solutionGrid.length > 0) {
            const cellSize = Math.min(40, 520 / solutionGrid.length);
            const startX = (doc.page.width - (solutionGrid[0]?.length || 0) * cellSize) / 2;
            let startY = doc.y;

            for (const row of solutionGrid) {
              let x = startX;
              for (const cell of row) {
                doc.rect(x, startY, cellSize, cellSize).stroke();
                doc.fontSize(Math.min(12, cellSize * 0.6))
                   .text(cell || "", x + cellSize / 2, startY + cellSize / 2, {
                     align: "center",
                     width: cellSize,
                     height: cellSize,
                   });
                x += cellSize;
              }
              startY += cellSize;
            }
            doc.moveDown();
          }

          // Word list
          if (options.includeWordList && puzzleData?.words) {
            doc.fontSize(12).text("Words:", { underline: true });
            doc.moveDown(0.5);

            for (const word of puzzleData.words) {
              const wordInfo = solutionData?.words?.find(
                (w: any) => w.word === word || w === word
              );
              let line = `  • ${word}`;
              if (wordInfo && options.includeCoordinates) {
                const startRow = (wordInfo.startRow ?? 0) + 1;
                const startCol = (wordInfo.startCol ?? 0) + 1;
                const endRow = (wordInfo.endRow ?? wordInfo.startRow ?? 0) + 1;
                const endCol = (wordInfo.endCol ?? wordInfo.startCol ?? 0) + 1;
                line += ` → (${startRow},${startCol}) to (${endRow},${endCol})`;
              }
              doc.fontSize(11).text(line);
            }
          }

          doc.moveDown();
        }

        doc.end();
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : "Failed to generate PDF",
        });
      }
    });
  }
}
