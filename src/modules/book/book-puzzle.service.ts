import { prisma } from "@/lib/prisma";

export interface PuzzleOperationResult {
  success: boolean;
  message: string;
  bookId: string;
  puzzleId?: string;
}

export class BookPuzzleService {
  /**
   * Delete a puzzle from a book
   */
  static async deletePuzzle(
    bookId: string,
    puzzleId: string,
    userId: string
  ): Promise<PuzzleOperationResult> {
    try {
      // Verify book ownership
      const book = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (!book) {
        return {
          success: false,
          message: "Book not found",
          bookId,
        };
      }

      if (book.userId !== userId) {
        return {
          success: false,
          message: "Unauthorized",
          bookId,
        };
      }

      // Find the bookPuzzle entry
      const bookPuzzle = await prisma.bookPuzzle.findFirst({
        where: {
          bookId,
          puzzleId,
        },
      });

      if (!bookPuzzle) {
        return {
          success: false,
          message: "Puzzle not found in this book",
          bookId,
          puzzleId,
        };
      }

      // Delete the bookPuzzle relationship
      await prisma.bookPuzzle.delete({
        where: {
          id: bookPuzzle.id,
        },
      });

      // Update book puzzle count
      await prisma.book.update({
        where: { id: bookId },
        data: {
          puzzleCount: {
            decrement: 1,
          },
        },
      });

      // Reorder remaining puzzles
      const remainingBookPuzzles = await prisma.bookPuzzle.findMany({
        where: { bookId },
        orderBy: { position: "asc" },
      });

      for (let i = 0; i < remainingBookPuzzles.length; i++) {
        await prisma.bookPuzzle.update({
          where: {
            id: remainingBookPuzzles[i].id,
          },
          data: {
            position: i,
            displayNumber: i + 1,
          },
        });
      }

      return {
        success: true,
        message: "Puzzle deleted successfully",
        bookId,
        puzzleId,
      };
    } catch (error) {
      console.error("[BookPuzzleService] Error deleting puzzle:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete puzzle",
        bookId,
        puzzleId,
      };
    }
  }

  /**
   * Delete multiple puzzles from a book
   */
  static async deletePuzzles(
    bookId: string,
    puzzleIds: string[],
    userId: string
  ): Promise<PuzzleOperationResult> {
    try {
      let deletedCount = 0;

      for (const puzzleId of puzzleIds) {
        const result = await this.deletePuzzle(bookId, puzzleId, userId);
        if (result.success) {
          deletedCount++;
        }
      }

      return {
        success: true,
        message: `${deletedCount} puzzles deleted successfully`,
        bookId,
      };
    } catch (error) {
      console.error("[BookPuzzleService] Error deleting puzzles:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete puzzles",
        bookId,
      };
    }
  }

  /**
   * Get a puzzle with its book context
   */
  static async getPuzzleWithBook(
    puzzleId: string,
    userId?: string
  ): Promise<any | null> {
    try {
      const bookPuzzle = await prisma.bookPuzzle.findFirst({
        where: {
          puzzleId,
          book: userId ? { userId } : {},
        },
        include: {
          book: true,
          puzzle: {
            include: {
              versions: true,
            },
          },
          solution: true,
        },
      });

      return bookPuzzle;
    } catch (error) {
      console.error("[BookPuzzleService] Error fetching puzzle with book:", error);
      return null;
    }
  }

  /**
   * Regenerate a puzzle in a book
   */
  static async regeneratePuzzle(
    bookId: string,
    puzzleId: string,
    userId: string
  ): Promise<PuzzleOperationResult> {
    try {
      // Verify book ownership
      const book = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (!book) {
        return {
          success: false,
          message: "Book not found",
          bookId,
        };
      }

      if (book.userId !== userId) {
        return {
          success: false,
          message: "Unauthorized",
          bookId,
        };
      }

      // Find the bookPuzzle entry
      const bookPuzzle = await prisma.bookPuzzle.findFirst({
        where: {
          bookId,
          puzzleId,
        },
        include: {
          puzzle: true,
          solution: true,
        },
      });

      if (!bookPuzzle) {
        return {
          success: false,
          message: "Puzzle not found in this book",
          bookId,
          puzzleId,
        };
      }

      // Create a regeneration request
      await prisma.regenerationRequest.create({
        data: {
          bookId,
          puzzleId,
          reason: "User requested regeneration",
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

      return {
        success: true,
        message: "Puzzle queued for regeneration",
        bookId,
        puzzleId,
      };
    } catch (error) {
      console.error("[BookPuzzleService] Error regenerating puzzle:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to regenerate puzzle",
        bookId,
        puzzleId,
      };
    }
  }

  /**
   * Regenerate multiple puzzles in a book
   */
  static async regeneratePuzzles(
    bookId: string,
    puzzleIds: string[],
    userId: string
  ): Promise<PuzzleOperationResult> {
    try {
      let queuedCount = 0;

      for (const puzzleId of puzzleIds) {
        const result = await this.regeneratePuzzle(bookId, puzzleId, userId);
        if (result.success) {
          queuedCount++;
        }
      }

      return {
        success: true,
        message: `${queuedCount} puzzles queued for regeneration`,
        bookId,
      };
    } catch (error) {
      console.error("[BookPuzzleService] Error regenerating puzzles:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to regenerate puzzles",
        bookId,
      };
    }
  }
}