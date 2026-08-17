import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { bookId } = await context.params;

    if (!bookId) {
      return apiResponse.badRequest("Book ID is required");
    }

    const book = await prisma.book.findUnique({
      where: {
        id: bookId,
      },
      include: {
        bookPuzzles: {
          include: {
            puzzle: {
              include: {
                versions: true,
              },
            },
            puzzleVersion: true,
            solution: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    if (!book) {
      return apiResponse.notFound("Book not found");
    }

    if (book.userId !== session.user.id) {
      return apiResponse.forbidden(
        "You do not have permission to view this book",
      );
    }

    return apiResponse.success(book);
  } catch (error) {
    console.error("Error fetching book:", error);

    return apiResponse.internalError(
      error instanceof Error
        ? error.message
        : "Internal server error",
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { bookId } = await context.params;

    if (!bookId) {
      return apiResponse.badRequest("Book ID is required");
    }

    // Verify that the book exists and belongs to the current user
    const book = await prisma.book.findUnique({
      where: {
        id: bookId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!book) {
      return apiResponse.notFound("Book not found");
    }

    if (book.userId !== session.user.id) {
      return apiResponse.forbidden(
        "You do not have permission to delete this book",
      );
    }

    /*
     * Delete the book.
     *
     * bookPuzzles and their related records should be removed
     * through the database's configured cascade relationships.
     *
     * The actual Puzzle records are NOT deleted here because
     * they may be independent/shared records.
     */
    await prisma.book.delete({
      where: {
        id: bookId,
      },
    });

    return apiResponse.success({
      message: "Book deleted successfully",
      bookId,
    });
  } catch (error) {
    console.error("Error deleting book:", error);

    return apiResponse.internalError(
      error instanceof Error
        ? error.message
        : "Failed to delete book",
    );
  }
}