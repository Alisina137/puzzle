import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, convertInchesToTwip } from "docx";
import { prisma } from "@/lib/prisma";

export interface DOCXExportOptions {
  includeSolutions?: boolean;
  solutionPlacement?: "end" | "after_each" | "none";
  largePrint?: boolean;
  pageNumbering?: boolean;
  title?: string;
  author?: string;
}

export interface DOCXExportResult {
  success: boolean;
  buffer?: Buffer;
  fileName?: string;
  error?: string;
}

export class DOCXGenerator {
  /**
   * Generate a DOCX file for a book
   */
  static async generateBookDOCX(
    bookId: string,
    userId: string,
    options: DOCXExportOptions = {}
  ): Promise<DOCXExportResult> {
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
        includeSolutions: options.includeSolutions ?? true,
        solutionPlacement: options.solutionPlacement ?? "end",
        largePrint: options.largePrint ?? false,
        pageNumbering: options.pageNumbering ?? true,
        title: options.title || book.title,
        author: options.author || "Puzzle Generator",
      };

      // Build document children
      const children: any[] = [];

      // 1. Title Page
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: opts.title,
              size: opts.largePrint ? 48 : 36,
              bold: true,
              font: "Arial",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 800, after: 400 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Theme: ${book.theme}`,
              size: opts.largePrint ? 32 : 24,
              font: "Arial",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${book.bookPuzzles.length} Puzzles`,
              size: opts.largePrint ? 28 : 20,
              font: "Arial",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Difficulty: ${book.difficultyLevel || "Medium"}`,
              size: opts.largePrint ? 28 : 20,
              font: "Arial",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );

      // 2. Puzzles
      const solutionWords: any[] = [];

      for (const bookPuzzle of book.bookPuzzles) {
        const puzzle = bookPuzzle.puzzle;
        const puzzleData = puzzle.data as any;
        const solutionData = bookPuzzle.solution?.data as any;

        // Puzzle heading
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Puzzle ${bookPuzzle.displayNumber}`,
                size: opts.largePrint ? 32 : 24,
                bold: true,
                font: "Arial",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
          })
        );

        // Difficulty badge
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Difficulty: ${puzzle.difficultyLabel || "Medium"} ${puzzle.difficultyScore !== null ? `(${puzzle.difficultyScore}/100)` : ""}`,
                size: opts.largePrint ? 20 : 14,
                font: "Arial",
                color: "666666",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          })
        );

        // Grid as table
        const grid = puzzleData?.grid || [];
        if (grid.length > 0) {
          const cellSize = opts.largePrint ? 40 : 24;
          const tableRows: TableRow[] = [];

          for (const row of grid) {
            const cells: TableCell[] = [];
            for (const cell of row) {
              cells.push(
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell || "",
                          size: opts.largePrint ? 20 : 14,
                          font: "Courier New",
                          bold: true,
                        }),
                      ],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  width: {
                    size: cellSize,
                    type: "dxa",
                  },
                })
              );
            }
            tableRows.push(new TableRow({ children: cells }));
          }

          children.push(
            new Table({
              rows: tableRows,
              width: {
                size: 100,
                type: "pct",
              },
              alignment: AlignmentType.CENTER,
            })
          );
        }

        // Words list
        const words = puzzleData?.words || [];
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Words to Find: ${words.join(", ")}`,
                size: opts.largePrint ? 20 : 14,
                font: "Arial",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 200 },
          })
        );

        // Solution after each puzzle if enabled
        if (opts.includeSolutions && opts.solutionPlacement === "after_each") {
          const solutionGrid = solutionData?.grid || [];
          if (solutionGrid.length > 0) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "--- Solution ---",
                    size: opts.largePrint ? 18 : 12,
                    font: "Arial",
                    color: "999999",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 100, after: 100 },
              })
            );

            // Solution grid as table (smaller)
            const solCellSize = opts.largePrint ? 28 : 16;
            const solTableRows: TableRow[] = [];

            for (const row of solutionGrid) {
              const cells: TableCell[] = [];
              for (const cell of row) {
                cells.push(
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: cell || "",
                            size: opts.largePrint ? 14 : 10,
                            font: "Courier New",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: {
                      size: solCellSize,
                      type: "dxa",
                    },
                  })
                );
              }
              solTableRows.push(new TableRow({ children: cells }));
            }

            children.push(
              new Table({
                rows: solTableRows,
                width: {
                  size: 80,
                  type: "pct",
                },
                alignment: AlignmentType.CENTER,
              })
            );
          }

          // Store solution words for end placement
          solutionWords.push({
            displayNumber: bookPuzzle.displayNumber,
            words: puzzleData?.words || [],
          });
        }

        // Page break after each puzzle (except last)
        if (bookPuzzle.position < book.bookPuzzles.length - 1) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "",
                  break: 1,
                }),
              ],
              spacing: { after: 400 },
            })
          );
        }
      }

      // Solutions at the end
      if (opts.includeSolutions && opts.solutionPlacement === "end") {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "--- SOLUTIONS ---",
                size: opts.largePrint ? 28 : 20,
                bold: true,
                font: "Arial",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 400 },
          })
        );

        for (const bookPuzzle of book.bookPuzzles) {
          const puzzleData = bookPuzzle.puzzle.data as any;
          const solutionData = bookPuzzle.solution?.data as any;
          const solutionGrid = solutionData?.grid || [];

          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Puzzle ${bookPuzzle.displayNumber} Solution`,
                  size: opts.largePrint ? 24 : 18,
                  bold: true,
                  font: "Arial",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 300, after: 100 },
            })
          );

          if (solutionGrid.length > 0) {
            const solCellSize = opts.largePrint ? 32 : 20;
            const solTableRows: TableRow[] = [];

            for (const row of solutionGrid) {
              const cells: TableCell[] = [];
              for (const cell of row) {
                cells.push(
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: cell || "",
                            size: opts.largePrint ? 16 : 12,
                            font: "Courier New",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: {
                      size: solCellSize,
                      type: "dxa",
                    },
                  })
                );
              }
              solTableRows.push(new TableRow({ children: cells }));
            }

            children.push(
              new Table({
                rows: solTableRows,
                width: {
                  size: 80,
                  type: "pct",
                },
                alignment: AlignmentType.CENTER,
              })
            );
          }

          // Words for this solution
          const words = puzzleData?.words || [];
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Words: ${words.join(", ")}`,
                  size: opts.largePrint ? 16 : 12,
                  font: "Arial",
                  color: "555555",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 200 },
            })
          );
        }
      }

      // Create document
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: convertInchesToTwip(1),
                  bottom: convertInchesToTwip(1),
                  left: convertInchesToTwip(0.75),
                  right: convertInchesToTwip(0.75),
                },
              },
            },
            children: children,
          },
        ],
      });

      // Generate buffer
      const buffer = await Packer.toBuffer(doc);

      // Create export record
      await prisma.export.create({
        data: {
          bookId,
          userId,
          format: "docx",
          status: "completed",
          filesize: buffer.length,
          options: {
            includeSolutions: opts.includeSolutions,
            solutionPlacement: opts.solutionPlacement,
            largePrint: opts.largePrint,
            pageNumbering: opts.pageNumbering,
          },
          completedAt: new Date(),
        },
      });

      return {
        success: true,
        buffer,
        fileName: `${book.title.replace(/\s+/g, "_")}.docx`,
      };
    } catch (error) {
      console.error("[DOCXGenerator] Error generating DOCX:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate DOCX",
      };
    }
  }
}
