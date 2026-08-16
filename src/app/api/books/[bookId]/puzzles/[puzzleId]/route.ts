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

// GET /api/books/[bookId]/puzzles/[puzzleId]
async function getPuzzle(
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
  const puzzleValidation = validateSchema(puzzleIdSchema, { puzzleId });

  if (!puzzleValidation.success) {
    return apiResponse.badRequest(
      'Invalid puzzle ID',
      puzzleValidation.errors
    );
  }

  // Verify ownership
  const ownership = await verifyBookOwnership(
    bookId,
    session.user.id
  );

  if (ownership.error) {
    return ownership.error;
  }

  // Get the book puzzle
  const bookPuzzle = await prisma.bookPuzzle.findFirst({
    where: {
      bookId,
      id: puzzleId,
    },
    include: {
      puzzle: {
        include: {
          versions: true,
        },
      },
      puzzleVersion: true,
      solution: true,
    },
  });

  if (!bookPuzzle) {
    return apiResponse.notFound(
      'Puzzle not found in this book'
    );
  }

  return apiResponse.success(bookPuzzle);
}

// DELETE /api/books/[bookId]/puzzles/[puzzleId]
async function deletePuzzle(
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
  const puzzleValidation = validateSchema(puzzleIdSchema, { puzzleId });

  if (!puzzleValidation.success) {
    return apiResponse.badRequest(
      'Invalid puzzle ID',
      puzzleValidation.errors
    );
  }

  // Verify ownership
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
  });

  if (!bookPuzzle) {
    return apiResponse.notFound(
      'Puzzle not found in this book'
    );
  }

  // Remember the position before deletion
  const positionToDelete = bookPuzzle.position;

  // Delete the book-puzzle relationship
  await prisma.bookPuzzle.delete({
    where: {
      id: puzzleId,
    },
  });

  // Reorder remaining puzzles
  await prisma.bookPuzzle.updateMany({
    where: {
      bookId,
      position: {
        gt: positionToDelete,
      },
    },
    data: {
      position: {
        decrement: 1,
      },
      displayNumber: {
        decrement: 1,
      },
    },
  });

  return apiResponse.success(
    null,
    'Puzzle removed from book'
  );
}

export const GET = withApiHandler(getPuzzle);
export const DELETE = withApiHandler(deletePuzzle);