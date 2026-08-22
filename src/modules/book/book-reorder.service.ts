import { prisma } from "@/lib/prisma";

export interface ReorderResult {
  success: boolean;
  message: string;
  bookId: string;
  reorderedPuzzles: number;
}

export class BookReorderService {
  /**
   * Reorder puzzles in a book
   * @param bookId - The ID of the book
   * @param puzzleOrder - Array of puzzle IDs in the new order
   * @param userId - The ID of the user (for authorization)
   */
  static async reorderPuzzles(
    bookId: string,
    puzzleOrder: string[],
    userId: string
  ): Promise<ReorderResult> {
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
          reorderedPuzzles: 0,
        };
      }

      if (book.userId !== userId) {
        return {
          success: false,
          message: "Unauthorized",
          bookId,
          reorderedPuzzles: 0,
        };
      }

      // Get all book puzzles with their IDs
      const bookPuzzles = await prisma.bookPuzzle.findMany({
        where: { bookId },
        orderBy: { position: "asc" },
        select: {
          id: true,
          puzzleId: true,
        },
      });

      // Validate that all puzzle IDs exist in the book
      const existingPuzzleIds = bookPuzzles.map((bp) => bp.puzzleId);
      const invalidIds = puzzleOrder.filter(
        (id) => !existingPuzzleIds.includes(id)
      );

      if (invalidIds.length > 0) {
        return {
          success: false,
          message: `Invalid puzzle IDs: ${invalidIds.join(", ")}`,
          bookId,
          reorderedPuzzles: 0,
        };
      }

      // Create a map of puzzleId -> bookPuzzle id
      const puzzleIdToBookPuzzleId: Record<string, string> = {};
      for (const bp of bookPuzzles) {
        puzzleIdToBookPuzzleId[bp.puzzleId] = bp.id;
      }

      // Update positions using the bookPuzzle id
      for (let i = 0; i < puzzleOrder.length; i++) {
        const puzzleId = puzzleOrder[i];
        const bookPuzzleId = puzzleIdToBookPuzzleId[puzzleId];
        
        if (bookPuzzleId) {
          await prisma.bookPuzzle.update({
            where: {
              id: bookPuzzleId,
            },
            data: {
              position: i,
              displayNumber: i + 1,
            },
          });
        }
      }

      return {
        success: true,
        message: "Puzzles reordered successfully",
        bookId,
        reorderedPuzzles: puzzleOrder.length,
      };
    } catch (error) {
      console.error("[BookReorderService] Error reordering puzzles:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to reorder puzzles",
        bookId,
        reorderedPuzzles: 0,
      };
    }
  }

  /**
   * Get the current puzzle order for a book
   */
  static async getPuzzleOrder(bookId: string): Promise<string[]> {
    try {
      const bookPuzzles = await prisma.bookPuzzle.findMany({
        where: { bookId },
        orderBy: { position: "asc" },
        select: { puzzleId: true },
      });

      return bookPuzzles.map((bp) => bp.puzzleId);
    } catch (error) {
      console.error("[BookReorderService] Error getting puzzle order:", error);
      return [];
    }
  }

  /**
   * Move a puzzle to a new position
   */
  static async movePuzzleToPosition(
    bookId: string,
    puzzleId: string,
    newPosition: number,
    userId: string
  ): Promise<ReorderResult> {
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
          reorderedPuzzles: 0,
        };
      }

      if (book.userId !== userId) {
        return {
          success: false,
          message: "Unauthorized",
          bookId,
          reorderedPuzzles: 0,
        };
      }

      // Get all book puzzles
      const bookPuzzles = await prisma.bookPuzzle.findMany({
        where: { bookId },
        orderBy: { position: "asc" },
        select: {
          puzzleId: true,
        },
      });

      const puzzleIds = bookPuzzles.map((bp) => bp.puzzleId);
      const currentIndex = puzzleIds.indexOf(puzzleId);

      if (currentIndex === -1) {
        return {
          success: false,
          message: "Puzzle not found in this book",
          bookId,
          reorderedPuzzles: 0,
        };
      }

      // Remove puzzle from current position and insert at new position
      puzzleIds.splice(currentIndex, 1);
      puzzleIds.splice(newPosition, 0, puzzleId);

      // Update positions
      await this.reorderPuzzles(bookId, puzzleIds, userId);

      return {
        success: true,
        message: "Puzzle moved successfully",
        bookId,
        reorderedPuzzles: 1,
      };
    } catch (error) {
      console.error("[BookReorderService] Error moving puzzle:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to move puzzle",
        bookId,
        reorderedPuzzles: 0,
      };
    }
  }
}