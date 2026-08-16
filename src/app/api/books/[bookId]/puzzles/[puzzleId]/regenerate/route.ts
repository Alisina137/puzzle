import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  apiResponse,
  withApiHandler,
  validateSchema,
  bookIdSchema,
  puzzleIdSchema,
} from '@/lib';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper to verify book ownership
async function verifyBookOwnership(bookId: string, userId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { userId: true },
  });

  if (!book) {
    return { error: apiResponse.notFound('Book not found') };
  }

  if (book.userId !== userId) {
    return {
      error: apiResponse.forbidden(
        'You do not have permission to access this book'
      ),
    };
  }

  return { book };
}

// POST /api/books/[bookId]/puzzles/[puzzleId]/regenerate
// Regenerate a puzzle
async function regeneratePuzzle(
  req: NextRequest,
  context: { params: { bookId: string; puzzleId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiResponse.unauthorized('Please sign in');
  }

  const { bookId, puzzleId } = context.params;

  // Validate book ID
  const bookValidation = validateSchema(bookIdSchema, { bookId });

  if (!bookValidation.success) {
    return apiResponse.badRequest(
      'Invalid book ID',
      bookValidation.errors
    );
  }

  // Validate puzzle ID
  const puzzleValidation = validateSchema(puzzleIdSchema, {
    puzzleId,
  });

  if (!puzzleValidation.success) {
    return apiResponse.badRequest(
      'Invalid puzzle ID',
      puzzleValidation.errors
    );
  }

  // Verify book ownership
  const ownership = await verifyBookOwnership(
    bookId,
    session.user.id
  );

  if (ownership.error) {
    return ownership.error;
  }

  // Find the book puzzle
  const bookPuzzle = await prisma.bookPuzzle.findFirst({
    where: {
      bookId,
      id: puzzleId,
    },
    include: {
      puzzle: true,
      puzzleVersion: true,
    },
  });

  if (!bookPuzzle) {
    return apiResponse.notFound(
      'Puzzle not found in this book'
    );
  }

  // Get the current version number
  const currentVersionNumber =
    bookPuzzle.puzzleVersion?.versionNumber || 0;

  const newVersionNumber = currentVersionNumber + 1;

  // TODO: Replace this placeholder with the actual
  // puzzle generation engine.
  const newPuzzleData = {
    grid: Array(10)
      .fill(null)
      .map(() => Array(10).fill('B')),
    words: ['REGENERATED', 'PUZZLE', 'BOOK'],
    size: 10,
    regeneratedAt: new Date().toISOString(),
  };

  // Update the main puzzle
  const updatedPuzzle = await prisma.puzzle.update({
    where: {
      id: bookPuzzle.puzzleId,
    },
    data: {
      data: newPuzzleData,
      qualityScore: 90,
    },
  });

  // Create the new puzzle version
  const newVersion = await prisma.puzzleVersion.create({
    data: {
      puzzleId: bookPuzzle.puzzleId,
      versionNumber: newVersionNumber,
      data: newPuzzleData,
      isActive: true,
    },
  });

  // Deactivate all previous versions
  await prisma.puzzleVersion.updateMany({
    where: {
      puzzleId: bookPuzzle.puzzleId,
      isActive: true,
      id: {
        not: newVersion.id,
      },
    },
    data: {
      isActive: false,
    },
  });

  // Update the book puzzle to use the new version
  const updatedBookPuzzle = await prisma.bookPuzzle.update({
    where: {
      id: bookPuzzle.id,
    },
    data: {
      puzzleVersionId: newVersion.id,
    },
    include: {
      puzzle: true,
      puzzleVersion: true,
      solution: true,
    },
  });

  return apiResponse.success(
    {
      bookPuzzle: updatedBookPuzzle,
      puzzle: updatedPuzzle,
      message: 'Puzzle regenerated successfully',
      version: newVersionNumber,
    }
  );
}

export const POST = withApiHandler(regeneratePuzzle);