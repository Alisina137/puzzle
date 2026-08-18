import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  apiResponse,
  withApiHandler,
  validateSchema,
  bookIdSchema,
} from "@/lib";
import { authOptions } from "@/lib/auth";
import { ProgressService } from "@/modules/generation/progress.service";

// Helper to verify book ownership
async function verifyBookOwnership(bookId: string, userId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      userId: true,
    },
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

// GET /api/books/[bookId]/progress
async function getProgress(
  req: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiResponse.unauthorized("Please sign in");
  }

  const { bookId } = await context.params;

  const idValidation = validateSchema(bookIdSchema, { bookId });

  if (!idValidation.success) {
    return apiResponse.badRequest("Invalid book ID", idValidation.errors);
  }

  const ownership = await verifyBookOwnership(bookId, session.user.id);

  if (ownership.error) {
    return ownership.error;
  }

  try {
    const progress = await ProgressService.getProgress(bookId);

    return apiResponse.success(progress);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get progress";

    return apiResponse.internalError(message);
  }
}

// DELETE /api/books/[bookId]/progress
async function cancelGeneration(
  req: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiResponse.unauthorized("Please sign in");
  }

  const { bookId } = await context.params;

  const idValidation = validateSchema(bookIdSchema, { bookId });

  if (!idValidation.success) {
    return apiResponse.badRequest("Invalid book ID", idValidation.errors);
  }

  const ownership = await verifyBookOwnership(bookId, session.user.id);

  if (ownership.error) {
    return ownership.error;
  }

  try {
    const cancelled = await ProgressService.cancelGeneration(bookId);

    if (!cancelled) {
      return apiResponse.notFound("No active generation job found");
    }

    await prisma.book.update({
      where: { id: bookId },
      data: { status: "failed" },
    });

    return apiResponse.success(null, "Generation cancelled");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel generation";

    return apiResponse.internalError(message);
  }
}

export const GET = withApiHandler(getProgress);
export const DELETE = withApiHandler(cancelGeneration);
