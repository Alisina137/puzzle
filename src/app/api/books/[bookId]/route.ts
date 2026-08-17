import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId } = await context.params;

    if (!bookId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 },
      );
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
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      {
        success: true,
        data: book,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching book:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
