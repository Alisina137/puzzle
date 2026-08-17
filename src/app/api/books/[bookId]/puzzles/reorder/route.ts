import { prisma } from "@/lib/prisma";
import {
  apiResponse,
  withApiHandler,
  validateSchema,
  bookIdSchema,
  reorderPuzzlesSchema,
} from "@/lib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Helper to verify book ownership
async function verifyBookOwnership(bookId: string, userId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { userId: true },
  });

  if (!book) {
    return {
      error: apiResponse.notFound("Book not found"),
    };
  }

  if (book.userId !== userId) {
    return {
      error: apiResponse.forbidden(
        "You do not have permission to access this book",
      ),
    };
  }

  return { book };
}

// PATCH /api/books/[bookId]/puzzles/reorder
// Reorder puzzles in a book
async function reorderPuzzles(
  req: Request,
  context: { params: { bookId: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiResponse.unauthorized("Please sign in");
  }

  const { bookId } = context.params;
  const body = await req.json();

  // Validate book ID
  const bookValidation = validateSchema(bookIdSchema, { bookId });

  if (!bookValidation.success) {
    return apiResponse.badRequest("Invalid book ID", bookValidation.errors);
  }

  // Validate reorder data
  const validation = validateSchema(reorderPuzzlesSchema, body);

  if (!validation.success) {
    return apiResponse.badRequest("Validation failed", validation.errors);
  }

  // Verify book ownership
  const ownership = await verifyBookOwnership(bookId, session.user.id);

  if (ownership.error) {
    return ownership.error;
  }

  const { order } = validation.data;

  // Verify all puzzles belong to the book
  const existingPuzzles = await prisma.bookPuzzle.findMany({
    where: {
      bookId,
      id: {
        in: order,
      },
    },
    select: {
      id: true,
    },
  });

  const existingIds = existingPuzzles.map((puzzle) => puzzle.id);

  const missingIds = order.filter((id) => !existingIds.includes(id));

  if (missingIds.length > 0) {
    return apiResponse.badRequest("Some puzzles do not belong to this book", {
      missingIds,
    });
  }

  // Update positions in a transaction
  // Correct - using $transaction
  await prisma.$transaction(
    order.map((puzzleId, index) =>
      prisma.bookPuzzle.update({
        where: {
          id: puzzleId,
        },
        data: {
          position: index,
          displayNumber: index + 1,
        },
      }),
    ),
  );

  // Get the updated book puzzles
  const updatedPuzzles = await prisma.bookPuzzle.findMany({
    where: {
      bookId,
    },
    include: {
      puzzle: true,
      puzzleVersion: true,
      solution: true,
    },
    orderBy: {
      position: "asc",
    },
  });

  return apiResponse.success({
    puzzles: updatedPuzzles,
    message: "Puzzles reordered successfully",
  });
}

export const PATCH = withApiHandler(reorderPuzzles);
