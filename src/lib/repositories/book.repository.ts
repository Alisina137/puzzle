import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const bookRepository = {
  // Create a new book
  async create(data: { title: string; userId: string; theme: string; puzzleCount: number }) {
    return prisma.book.create({
      data: {
        title: data.title,
        userId: data.userId,
        theme: data.theme,
        puzzleCount: data.puzzleCount,
        status: 'pending',
      },
    });
  },

  // Get a book by ID
  async findById(id: string) {
    return prisma.book.findUnique({
      where: { id },
      include: {
        bookPuzzles: {
          include: {
            puzzle: true,
            puzzleVersion: true,
            solution: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });
  },

  // Get all books for a user
  async findByUserId(userId: string) {
    return prisma.book.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Update book status
  async updateStatus(id: string, status: string) {
    return prisma.book.update({
      where: { id },
      data: { status },
    });
  },

  // Delete a book
  async delete(id: string) {
    return prisma.book.delete({
      where: { id },
    });
  },
};