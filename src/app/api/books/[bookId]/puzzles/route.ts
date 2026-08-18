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

  const book = await prisma.book.findUnique({
    where: {
      id: bookId,
    },
  });

  if (!book) {
    return apiResponse.notFound("Book not found");
  }

  // TODO: Replace this placeholder with the real puzzle generator.
  const puzzle = await prisma.puzzle.create({
    data: {
      type: "wordsearch",
      data: {
        grid: Array(10)
          .fill(null)
          .map(() => Array(10).fill("A")),
        words: ["TEST", "BOOK", "PUZZLE"],
        size: 10,
      },
      difficulty: "medium",
      qualityScore: 95,
    },
  });

  const puzzleVersion = await prisma.puzzleVersion.create({
    data: {
      puzzleId: puzzle.id,
      versionNumber: 1,
      data: puzzle.data === null ? Prisma.JsonNull : puzzle.data,
      isActive: true,
    },
  });

  const existingCount = await prisma.bookPuzzle.count({
    where: {
      bookId,
    },
  });

  const bookPuzzle = await prisma.bookPuzzle.create({
    data: {
      bookId,
      puzzleId: puzzle.id,
      puzzleVersionId: puzzleVersion.id,
      position: existingCount,
      displayNumber: existingCount + 1,
    },
  });

  return apiResponse.created(
    {
      bookPuzzle,
      puzzle,
      puzzleVersion,
    },
    "Puzzle generated successfully",
  );
}

export const GET = withApiHandler(getPuzzles);
export const POST = withApiHandler(createPuzzle);
