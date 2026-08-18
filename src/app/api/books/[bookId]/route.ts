import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: { bookId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId } = context.params;

    if (!bookId) {
      return Response.json({ error: "Book ID is required" }, { status: 400 });
    }

    // Optimized: Select only needed fields
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        userId: true,
        title: true,
        theme: true,
        puzzleCount: true,
        status: true,
        qualityScore: true,
        createdAt: true,

        // Only select necessary puzzle data
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
      return Response.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.userId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json({
      success: true,
      data: book,
    });
  } catch (error: any) {
    console.error("Error fetching book:", error);

    return Response.json(
      { error: error.message || "Failed to fetch book" },
      { status: 500 },
    );
  }
}
