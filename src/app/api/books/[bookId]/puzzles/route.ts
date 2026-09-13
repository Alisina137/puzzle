import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  apiResponse,
  withApiHandler,
  validateSchema,
  bookIdSchema,
} from "@/lib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function verifyBookOwnership(bookId: string, userId: string) {
  const book = await prisma.book.findUnique({
    where: {
      id: bookId,
    },
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

  return {
    book,
  };
}

async function getPuzzles(
  req: NextRequest,
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

  const bookPuzzles = await prisma.bookPuzzle.findMany({
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
    puzzles: bookPuzzles,
    count: bookPuzzles.length,
  });
}

async function createPuzzle(
  req: NextRequest,
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
    const { GenerationService } =
      await import("@/modules/generation/generation.service");

    const result = await GenerationService.generateAdditionalPuzzle(bookId);

    if (!result.success) {
      return apiResponse.badRequest(
        result.error ||
          "Could not generate a puzzle with the available words. Please try again.",
      );
    }

    return apiResponse.created(
      { bookPuzzle: result.bookPuzzle },
      "New puzzle generated successfully 🧩",
    );
  } catch (error: any) {
    console.error("[API] Error generating puzzle:", error);
    return apiResponse.internalError(
      error.message || "Failed to generate puzzle",
    );
  }
}

export const GET = withApiHandler(getPuzzles);
export const POST = withApiHandler(createPuzzle);
