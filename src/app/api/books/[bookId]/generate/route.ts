import { prisma } from '@/lib/prisma';
import {
  apiResponse,
  withApiHandler,
  validateSchema,
  bookIdSchema,
} from '@/lib';
import { auth } from '@/lib/auth';
import { GenerationService } from '@/modules/generation/generation.service.js';

// Helper to verify book ownership
async function verifyBookOwnership(bookId: string, userId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { userId: true },
  });

  if (!book) {
    return {
      error: apiResponse.notFound('Book not found'),
    };
  }

  if (book.userId !== userId) {
    return {
      error: apiResponse.forbidden(
        'You do not have permission to access this book',
      ),
    };
  }

  return { book };
}

// POST /api/books/[bookId]/generate - Start generation for a book
async function generateBook(
  req: Request,
  context: { params: { bookId: string } },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiResponse.unauthorized('Please sign in');
  }

  const { bookId } = context.params;

  // Validate book ID
  const idValidation = validateSchema(bookIdSchema, { bookId });

  if (!idValidation.success) {
    return apiResponse.badRequest(
      'Invalid book ID',
      idValidation.errors,
    );
  }

  // Verify ownership
  const ownership = await verifyBookOwnership(
    bookId,
    session.user.id,
  );

  if (ownership.error) {
    return ownership.error;
  }

  // Check if book is already generating
  if (ownership.book.status === 'generating') {
    return apiResponse.badRequest(
      'Book is already being generated',
    );
  }

  if (ownership.book.status === 'ready') {
    return apiResponse.badRequest(
      'Book already has generated puzzles',
    );
  }

  // Start generation
  try {
    const result = await GenerationService.generateBook(bookId);

    return apiResponse.success({
      bookId,
      generated: result.generatedPuzzles,
      total: result.totalPuzzles,
      failed: result.failedPuzzles,
      errors: result.errors,
      warnings: result.warnings,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Generation failed';

    return apiResponse.internalError(message);
  }
}

export const POST = withApiHandler(generateBook);