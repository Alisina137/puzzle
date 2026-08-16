import { prisma, checkDatabaseConnection } from '@/lib/prisma';
import { bookRepository } from '@/lib/repositories/book.repository';
import { puzzleRepository } from '@/lib/repositories/puzzle.repository';
import { themeRepository } from '@/lib/repositories/theme.repository';

export const db = {
  client: prisma,
  checkConnection: checkDatabaseConnection,
  books: bookRepository,
  puzzles: puzzleRepository,
  themes: themeRepository,
};

export * from '@/lib/prisma';
export * from '@/lib/database-error';
export * from '@/lib/repositories';