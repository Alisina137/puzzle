import { describe, it, expect, vi, beforeEach } from "vitest";
import { QualityReportService } from "../quality-report.service";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    book: {
      findUnique: vi.fn(),
    },
    bookQualityReport: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("QualityReportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getReport", () => {
    it("should return a quality report for a book", async () => {
      const mockReport = {
        id: "report-1",
        bookId: "book-1",
        score: new Decimal(85),
        totalPuzzles: 10,
        validPuzzles: 9,
        verifiedSolutions: 10,
        duplicates: 0,
        difficultyConsistency: new Decimal(80),
        warnings: [],
        recommendations: [],
        generatedAt: new Date(),
      };

      vi.mocked(prisma.bookQualityReport.findUnique).mockResolvedValue(mockReport);

      const result = await QualityReportService.getReport("book-1");

      expect(result).toEqual(mockReport);
      expect(prisma.bookQualityReport.findUnique).toHaveBeenCalledWith({
        where: { bookId: "book-1" },
      });
    });

    it("should return null if report not found", async () => {
      vi.mocked(prisma.bookQualityReport.findUnique).mockResolvedValue(null);

      const result = await QualityReportService.getReport("book-1");

      expect(result).toBeNull();
    });
  });
});
