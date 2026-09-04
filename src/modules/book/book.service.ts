import { prisma } from "@/lib/prisma";
import { ConfigTemplateService } from "@/modules/config/config-template.service";
import { generationQueue } from "@/lib/queue";
import { Book, Prisma } from "@prisma/client";

export interface CreateBookInput {
  title: string;
  theme: string;
  puzzleCount: number;
  targetAudience: string;
  difficultyLevel: string;
  trimSize?: string;
  wordSelectionMode?: "single-domain" | "mixed-domain";
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
  static async createBook(
    userId: string,
    data: CreateBookInput,
  ): Promise<Book> {
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

      // ✅ Step 1: Get the full recommended configuration from the template
      const recommendation = await ConfigTemplateService.getRecommendation(
        data.targetAudience,
        data.difficultyLevel,
      );

      // ✅ Step 2: Build the full configuration
      let generationSettings: any = {};

      if (recommendation) {
        // Start with the full recommendation from the template
        generationSettings = {
          ...recommendation,
        };
        console.log("[BookService] Loaded recommendation from template:", {
          gridSize: generationSettings.gridSize,
          wordsPerPuzzle: generationSettings.wordsPerPuzzle,
          targetWordsPerPuzzle: generationSettings.targetWordsPerPuzzle,
        });
      } else {
        // Fallback: use data.generationSettings if available
        generationSettings = data.generationSettings || {};
        console.warn(
          "[BookService] No recommendation found, using provided settings",
        );
      }

      // ✅ Step 3: Merge user-provided generationSettings (if any)
      if (
        data.generationSettings &&
        Object.keys(data.generationSettings).length > 0
      ) {
        // Don't override the full config, just merge user overrides
        generationSettings = {
          ...generationSettings,
          ...data.generationSettings,
        };
        console.log("[BookService] Merged user settings");
      }

      // ✅ Step 4: Always include trimSize and wordSelectionMode
      generationSettings = {
        ...generationSettings,
        trimSize: data.trimSize || "6x9",
        wordSelectionMode: data.wordSelectionMode || "single-domain",
      };

      // ✅ Step 5: Ensure vocabularyLevels is set
      if (
        !generationSettings.vocabularyLevels ||
        generationSettings.vocabularyLevels.length === 0
      ) {
        const template = await ConfigTemplateService.getTemplate(
          data.targetAudience,
          data.difficultyLevel,
        );
        if (template) {
          generationSettings.vocabularyLevels =
            ConfigTemplateService.getVocabularyLevels(template);
        } else {
          generationSettings.vocabularyLevels = ["simple"];
        }
        console.log(
          "[BookService] Set vocabularyLevels:",
          generationSettings.vocabularyLevels,
        );
      }

      // ✅ Step 6: Ensure targetWordsPerPuzzle is set (use wordsPerPuzzle as fallback)
      if (
        !generationSettings.targetWordsPerPuzzle &&
        generationSettings.wordsPerPuzzle
      ) {
        generationSettings.targetWordsPerPuzzle =
          generationSettings.wordsPerPuzzle;
      }

      // ✅ Step 7: Ensure minWordsPerPuzzle and maxWordsPerPuzzle are set
      if (
        !generationSettings.minWordsPerPuzzle &&
        generationSettings.targetWordsPerPuzzle
      ) {
        generationSettings.minWordsPerPuzzle = Math.max(
          3,
          Math.floor(generationSettings.targetWordsPerPuzzle * 0.7),
        );
      }
      if (
        !generationSettings.maxWordsPerPuzzle &&
        generationSettings.targetWordsPerPuzzle
      ) {
        generationSettings.maxWordsPerPuzzle = Math.min(
          30,
          Math.ceil(generationSettings.targetWordsPerPuzzle * 1.3),
        );
      }

      console.log(
        "[BookService] Final generationSettings:",
        JSON.stringify(
          {
            gridSize: generationSettings.gridSize,
            wordsPerPuzzle: generationSettings.wordsPerPuzzle,
            targetWordsPerPuzzle: generationSettings.targetWordsPerPuzzle,
            minWordsPerPuzzle: generationSettings.minWordsPerPuzzle,
            maxWordsPerPuzzle: generationSettings.maxWordsPerPuzzle,
            trimSize: generationSettings.trimSize,
            vocabularyLevels: generationSettings.vocabularyLevels,
          },
          null,
          2,
        ),
      );

      // Validate the configuration
      const validation =
        ConfigTemplateService.validateConfig(generationSettings);
      if (!validation.valid) {
        console.error("[BookService] Validation errors:", validation.errors);
        throw new Error(
          `Invalid configuration: ${validation.errors.join(", ")}`,
        );
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
          },
        );
        console.log("[BookService] Generation job enqueued for book:", book.id);
      } catch (queueError) {
        console.error(
          "[BookService] Failed to enqueue generation job:",
          queueError,
        );
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
  static async getBookById(
    bookId: string,
    userId?: string,
  ): Promise<BookWithDetails | null> {
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
  static async updateBook(
    bookId: string,
    userId: string,
    data: UpdateBookInput,
  ): Promise<Book | null> {
    try {
      // Verify ownership
      const existing = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (!existing || existing.userId !== userId) {
        throw new Error("Book not found or unauthorized");
      }

      // Validate configuration if provided
      if (
        data.generationSettings &&
        Object.keys(data.generationSettings).length > 0
      ) {
        const validation = ConfigTemplateService.validateConfig(
          data.generationSettings,
        );
        if (!validation.valid) {
          throw new Error(
            `Invalid configuration: ${validation.errors.join(", ")}`,
          );
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
          generationSettings: data.generationSettings as
            | Prisma.InputJsonValue
            | undefined,
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
        book.difficultyLevel,
      );
    } catch (error) {
      console.error("[BookService] Error getting book recommendation:", error);
      return null;
    }
  }
}
