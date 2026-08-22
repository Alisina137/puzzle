import { prisma } from "@/lib/prisma";

export interface PuzzlePreviewData {
  id: string;
  displayNumber: number;
  grid: string[][];
  words: string[];
  placedWords: any[];
  solution: any;
  difficultyScore?: number;
  difficultyLabel?: string;
}

export interface BookPreviewData {
  bookId: string;
  title: string;
  theme: string;
  puzzleCount: number;
  puzzles: PuzzlePreviewData[];
  targetAudience?: string;
  difficultyLevel?: string;
}

export class BookPreviewService {
  /**
   * Get preview data for a book
   */
  static async getPreview(bookId: string, userId: string): Promise<BookPreviewData | null> {
    try {
      // Verify book ownership
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          bookPuzzles: {
            include: {
              puzzle: {
                include: {
                  versions: {
                    where: { isActive: true },
                    take: 1,
                  },
                },
              },
              solution: true,
            },
            orderBy: { position: "asc" },
          },
        },
      });

      if (!book) {
        return null;
      }

      if (book.userId !== userId) {
        return null;
      }

      const puzzles: PuzzlePreviewData[] = book.bookPuzzles.map((bp) => {
        const puzzle = bp.puzzle;
        const puzzleData = puzzle.data as any;
        const solutionData = bp.solution?.data as any;

        return {
          id: puzzle.id,
          displayNumber: bp.displayNumber,
          grid: puzzleData?.grid || [],
          words: puzzleData?.words || [],
          placedWords: puzzleData?.placedWords || [],
          solution: solutionData || null,
          difficultyScore: puzzle.difficultyScore || undefined,
          difficultyLabel: puzzle.difficultyLabel || undefined,
        };
      });

      return {
        bookId: book.id,
        title: book.title,
        theme: book.theme,
        puzzleCount: book.puzzleCount,
        puzzles,
        targetAudience: book.targetAudience || undefined,
        difficultyLevel: book.difficultyLevel || undefined,
      };
    } catch (error) {
      console.error("[BookPreviewService] Error getting preview:", error);
      return null;
    }
  }

  /**
   * Get preview data with limited puzzle details (for quick preview)
   */
  static async getQuickPreview(bookId: string, userId: string): Promise<BookPreviewData | null> {
    try {
      // Verify book ownership
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          bookPuzzles: {
            include: {
              puzzle: {
                select: {
                  id: true,
                  data: true,
                  difficultyScore: true,
                  difficultyLabel: true,
                },
              },
              solution: {
                select: {
                  data: true,
                },
              },
            },
            orderBy: { position: "asc" },
          },
        },
      });

      if (!book) {
        return null;
      }

      if (book.userId !== userId) {
        return null;
      }

      const puzzles: PuzzlePreviewData[] = book.bookPuzzles.map((bp) => {
        const puzzle = bp.puzzle;
        const puzzleData = puzzle.data as any;
        const solutionData = bp.solution?.data as any;

        return {
          id: puzzle.id,
          displayNumber: bp.displayNumber,
          grid: puzzleData?.grid || [],
          words: puzzleData?.words || [],
          placedWords: puzzleData?.placedWords || [],
          solution: solutionData || null,
          difficultyScore: puzzle.difficultyScore || undefined,
          difficultyLabel: puzzle.difficultyLabel || undefined,
        };
      });

      return {
        bookId: book.id,
        title: book.title,
        theme: book.theme,
        puzzleCount: book.puzzleCount,
        puzzles,
        targetAudience: book.targetAudience || undefined,
        difficultyLevel: book.difficultyLevel || undefined,
      };
    } catch (error) {
      console.error("[BookPreviewService] Error getting quick preview:", error);
      return null;
    }
  }

  /**
   * Get preview data for a specific puzzle
   */
  static async getPuzzlePreview(bookId: string, puzzleId: string, userId: string): Promise<PuzzlePreviewData | null> {
    try {
      const bookPuzzle = await prisma.bookPuzzle.findFirst({
        where: {
          bookId,
          puzzleId,
          book: { userId },
        },
        include: {
          puzzle: {
            include: {
              versions: {
                where: { isActive: true },
                take: 1,
              },
            },
          },
          solution: true,
        },
      });

      if (!bookPuzzle) {
        return null;
      }

      const puzzle = bookPuzzle.puzzle;
      const puzzleData = puzzle.data as any;
      const solutionData = bookPuzzle.solution?.data as any;

      return {
        id: puzzle.id,
        displayNumber: bookPuzzle.displayNumber,
        grid: puzzleData?.grid || [],
        words: puzzleData?.words || [],
        placedWords: puzzleData?.placedWords || [],
        solution: solutionData || null,
        difficultyScore: puzzle.difficultyScore || undefined,
        difficultyLabel: puzzle.difficultyLabel || undefined,
      };
    } catch (error) {
      console.error("[BookPreviewService] Error getting puzzle preview:", error);
      return null;
    }
  }
}
