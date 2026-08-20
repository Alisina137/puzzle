import { prisma } from "@/lib/prisma";
import { ConfigTemplateService } from "@/modules/config";
import { generationQueue } from "@/lib/queue";
import { Book, Prisma } from "@prisma/client";

export interface CreateBookInput {
  title: string;
  theme: string;
  puzzleCount: number;
  targetAudience: string;
  difficultyLevel: string;
  generationSettings?: any;
}

export interface UpdateBookInput {
  title?: string;
  theme?: string;
  puzzleCount?: number;
  targetAudience?: string;
  difficultyLevel?: string;
  generationSettings?: any;
}

export interface BookWithDetails extends Book {
  bookPuzzles?: any[];
  user?: any;
  qualityReport?: any;
  kdpConfig?: any;
}

export class BookService {
  /**
   * Create a new book with V2 fields
   */
  static async createBook(userId: string, data: CreateBookInput): Promise<Book> {
    try {
      console.log("[BookService] Creating book for userId:", userId);
      console.log("[BookService] Data:", JSON.stringify(data, null, 2));

      // Validate that the user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      console.log("[BookService] Found user:", user?.id, user?.email);

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Validate the configuration
      if (data.generationSettings) {
        const validation = ConfigTemplateService.validateConfig(data.generationSettings);
        if (!validation.valid) {
          throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
        }
      }

      // Get the recommended configuration if not provided
      let generationSettings = data.generationSettings;
      if (!generationSettings) {
        const recommendation = await ConfigTemplateService.getRecommendation(
          data.targetAudience,
          data.difficultyLevel
        );
        if (recommendation) {
          generationSettings = recommendation;
        }
      }

      // Create the book
      const book = await prisma.book.create({
        data: {
          title: data.title,
          theme: data.theme,
          puzzleCount: data.puzzleCount,
          status: "pending",
          targetAudience: data.targetAudience,
          difficultyLevel: data.difficultyLevel,
          generationSettings: generationSettings as Prisma.InputJsonValue,
          userId: userId,
        },
      });

      console.log("[BookService] Book created:", book.id);

      // Enqueue generation job
      try {
        await generationQueue.add(
          "puzzle-generation",
          {
            bookId: book.id,
            userId: userId,
          },
          {
            jobId: `generate-${book.id}`,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 5000,
            },
          }
        );
        console.log("[BookService] Generation job enqueued for book:", book.id);
      } catch (queueError) {
        console.error("[BookService] Failed to enqueue generation job:", queueError);
        // Don't throw - book is created, generation can be retried later
      }

      return book;
    } catch (error) {
      console.error("[BookService] Error creating book:", error);
      throw error;
    }
  }

  /**
   * Get a book by ID with all details
   */
  static async getBookById(bookId: string, userId?: string): Promise<BookWithDetails | null> {
    try {
      const where: any = { id: bookId };
      if (userId) {
        where.userId = userId;
      }

      const book = await prisma.book.findUnique({
        where: where,
        include: {
          bookPuzzles: {
            include: {
              puzzle: {
                include: {
                  versions: true,
                },
              },
              solution: true,
            },
            orderBy: {
              position: "asc",
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          qualityReport: true,
          kdpConfig: true,
        },
      });

      return book as BookWithDetails | null;
    } catch (error) {
      console.error("[BookService] Error fetching book:", error);
      return null;
    }
  }

  /**
   * Get all books for a user
   */
  static async getUserBooks(userId: string): Promise<Book[]> {
    try {
      const books = await prisma.book.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          bookPuzzles: {
            select: {
              id: true,
            },
          },
          qualityReport: true,
        },
      });

      return books;
    } catch (error) {
      console.error("[BookService] Error fetching user books:", error);
      return [];
    }
  }

  /**
   * Update a book
   */
  static async updateBook(bookId: string, userId: string, data: UpdateBookInput): Promise<Book | null> {
    try {
      // Verify ownership
      const existing = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (!existing || existing.userId !== userId) {
        throw new Error("Book not found or unauthorized");
      }

      // Validate configuration if provided
      if (data.generationSettings) {
        const validation = ConfigTemplateService.validateConfig(data.generationSettings);
        if (!validation.valid) {
          throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
        }
      }

      const book = await prisma.book.update({
        where: { id: bookId },
        data: {
          title: data.title,
          theme: data.theme,
          puzzleCount: data.puzzleCount,
          targetAudience: data.targetAudience,
          difficultyLevel: data.difficultyLevel,
          generationSettings: data.generationSettings as Prisma.InputJsonValue | undefined,
        },
      });

      return book;
    } catch (error) {
      console.error("[BookService] Error updating book:", error);
      throw error;
    }
  }

  /**
   * Delete a book
   */
  static async deleteBook(bookId: string, userId: string): Promise<boolean> {
    try {
      // Verify ownership
      const existing = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (!existing || existing.userId !== userId) {
        throw new Error("Book not found or unauthorized");
      }

      await prisma.book.delete({
        where: { id: bookId },
      });

      return true;
    } catch (error) {
      console.error("[BookService] Error deleting book:", error);
      return false;
    }
  }

  /**
   * Get a book with its generation settings
   */
  static async getBookWithConfig(bookId: string): Promise<Book | null> {
    try {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: {
          id: true,
          title: true,
          theme: true,
          puzzleCount: true,
          status: true,
          targetAudience: true,
          difficultyLevel: true,
          generationSettings: true,
          qualityScore: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return book;
    } catch (error) {
      console.error("[BookService] Error fetching book config:", error);
      return null;
    }
  }

  /**
   * Get the recommended configuration for a book based on its audience and difficulty
   */
  static async getBookRecommendation(bookId: string): Promise<any | null> {
    try {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: {
          targetAudience: true,
          difficultyLevel: true,
        },
      });

      if (!book || !book.targetAudience || !book.difficultyLevel) {
        return null;
      }

      return ConfigTemplateService.getRecommendation(
        book.targetAudience,
        book.difficultyLevel
      );
    } catch (error) {
      console.error("[BookService] Error getting book recommendation:", error);
      return null;
    }
  }
}
