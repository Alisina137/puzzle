import { prisma } from '@/lib/prisma';

export const puzzleRepository = {
  // Create a new puzzle
  async create(data: { type: string; data: any; difficulty: string; qualityScore?: number }) {
    return prisma.puzzle.create({
      data: {
        type: data.type,
        data: data.data,
        difficulty: data.difficulty,
        qualityScore: data.qualityScore,
      },
    });
  },

  // Get a puzzle by ID
  async findById(id: string) {
    return prisma.puzzle.findUnique({
      where: { id },
      include: {
        versions: true,
      },
    });
  },

  // Create a puzzle version
  async createVersion(data: { puzzleId: string; versionNumber: number; data: any }) {
    return prisma.puzzleVersion.create({
      data: {
        puzzleId: data.puzzleId,
        versionNumber: data.versionNumber,
        data: data.data,
        isActive: true,
      },
    });
  },

  // Deactivate old versions
  async deactivateVersions(puzzleId: string) {
    return prisma.puzzleVersion.updateMany({
      where: { puzzleId },
      data: { isActive: false },
    });
  },

  // Create a BookPuzzle (link puzzle to book)
  async addToBook(data: {
    bookId: string;
    puzzleId: string;
    puzzleVersionId: string;
    position: number;
    displayNumber: number;
  }) {
    return prisma.bookPuzzle.create({
      data: {
        bookId: data.bookId,
        puzzleId: data.puzzleId,
        puzzleVersionId: data.puzzleVersionId,
        position: data.position,
        displayNumber: data.displayNumber,
      },
    });
  },

  // Update puzzle position
  async updatePosition(id: string, position: number, displayNumber: number) {
    return prisma.bookPuzzle.update({
      where: { id },
      data: { position, displayNumber },
    });
  },
};