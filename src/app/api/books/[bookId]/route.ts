import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId } = await context.params;

    if (!bookId) {
      return Response.json(
        { error: "Book ID is required" },
        { status: 400 },
      );
    }

    const book = await prisma.book.findUnique({
      where: {
        id: bookId,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        theme: true,
        puzzleCount: true,
        status: true,
        qualityScore: true,
        createdAt: true,

        bookPuzzles: {
          select: {
            id: true,
            position: true,
            displayNumber: true,

            puzzle: {
              select: {
                id: true,
                type: true,
                difficulty: true,
                qualityScore: true,
                data: true,
              },
            },

            puzzleVersion: {
              select: {
                id: true,
                versionNumber: true,
                data: true,
              },
            },

            solution: {
              select: {
                id: true,
                data: true,
              },
            },
          },

          orderBy: {
            position: "asc",
          },
        },
      },
    });

    if (!book) {
      return Response.json(
        { error: "Book not found" },
        { status: 404 },
      );
    }

    if (book.userId !== session.user.id) {
      return Response.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    return Response.json({
      success: true,
      data: book,
    });
  } catch (error: unknown) {
    console.error("Error fetching book:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch book",
      },
      { status: 500 },
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
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { bookId } = await context.params;

    if (!bookId) {
      return Response.json(
        { error: "Book ID is required" },
        { status: 400 },
      );
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!book) {
      return Response.json(
        { error: "Book not found" },
        { status: 404 },
      );
    }

    if (book.userId !== session.user.id) {
      return Response.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    await prisma.book.delete({
      where: { id: bookId },
    });

    return Response.json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting book:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete book",
      },
      { status: 500 },
    );
  }
}
