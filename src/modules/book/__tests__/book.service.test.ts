import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookService } from "../book.service";
import { prisma } from "@/lib/prisma";
import { ConfigTemplateService } from "../../config/config-template.service";
import { Decimal } from "@prisma/client/runtime/library";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    book: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../../config/config-template.service", () => ({
  ConfigTemplateService: {
    validateConfig: vi.fn(),
    getRecommendation: vi.fn(),
  },
}));

describe("BookService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createBook", () => {
    it("should create a book with valid data", async () => {
      const userId = "user-1";
      const data = {
        title: "Test Book",
        theme: "Animals",
        puzzleCount: 5,
        targetAudience: "Adults",
        difficultyLevel: "Medium",
      };

      const mockUser = {
        id: userId,
        email: "test@example.com",
        name: null,
        password: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockBook = {
        id: "book-1",
        userId: userId,
        status: "pending",
        title: data.title,
        theme: data.theme,
        puzzleCount: data.puzzleCount,
        targetAudience: data.targetAudience,
        difficultyLevel: data.difficultyLevel,
        generationSettings: null,
        qualityScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(ConfigTemplateService.validateConfig).mockReturnValue({
        valid: true,
        errors: [],
      });
      vi.mocked(ConfigTemplateService.getRecommendation).mockResolvedValue({
        gridSize: 12,
        wordsPerPuzzle: 14,
        targetWordsPerPuzzle: 14,
        minWordsPerPuzzle: 10,
        maxWordsPerPuzzle: 16,
        minWordLength: 4,
        maxWordLength: 10,
        directions: 6,
        allowReverse: true,
        overlap: "medium",
        vocabularyLevels: ["simple", "intermediate"], // ✅ CHANGED HERE
      });
      vi.mocked(prisma.book.create).mockResolvedValue(mockBook);

      const result = await BookService.createBook(userId, data);

      expect(result).toEqual(mockBook);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prisma.book.create).toHaveBeenCalled();
    });

    it("should throw error if user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const userId = "user-1";
      const data = {
        title: "Test Book",
        theme: "Animals",
        puzzleCount: 5,
        targetAudience: "Adults",
        difficultyLevel: "Medium",
      };

      await expect(BookService.createBook(userId, data)).rejects.toThrow(
        "User with ID user-1 not found",
      );
    });
  });

  describe("getUserBooks", () => {
    it("should return books for a user", async () => {
      const userId = "user-1";
      const mockBooks = [
        {
          id: "book-1",
          title: "Book 1",
          userId: userId,
          theme: "Animals",
          puzzleCount: 5,
          status: "ready",
          targetAudience: "Adults",
          difficultyLevel: "Medium",
          generationSettings: null,
          qualityScore: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "book-2",
          title: "Book 2",
          userId: userId,
          theme: "Space",
          puzzleCount: 3,
          status: "ready",
          targetAudience: "Children",
          difficultyLevel: "Easy",
          generationSettings: null,
          qualityScore: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.book.findMany).mockResolvedValue(mockBooks);

      const result = await BookService.getUserBooks(userId);

      expect(result).toEqual(mockBooks);
      expect(prisma.book.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          bookPuzzles: { select: { id: true } },
          qualityReport: true,
        },
      });
    });

    it("should return empty array if no books", async () => {
      vi.mocked(prisma.book.findMany).mockResolvedValue([]);

      const result = await BookService.getUserBooks("user-1");

      expect(result).toEqual([]);
    });
  });
});
