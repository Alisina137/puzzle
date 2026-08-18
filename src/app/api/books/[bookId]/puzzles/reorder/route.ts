import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
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
      return Response.json({ error: "Book ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { order } = body;

    if (!Array.isArray(order) || order.length === 0) {
      return Response.json(
        { error: "Valid order array is required" },
        { status: 400 },
      );
    }

    // Prevent duplicate IDs
    const uniqueOrder = new Set(order);

    if (uniqueOrder.size !== order.length) {
      return Response.json(
        { error: "Order contains duplicate puzzle IDs" },
        { status: 400 },
      );
    }

    // Verify book ownership
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { userId: true },
    });

    if (!book) {
      return Response.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.userId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get every puzzle in the book
    const existingPuzzles = await prisma.bookPuzzle.findMany({
      where: { bookId },
      select: {
        id: true,
      },
    });

    // The frontend must send the complete order
    if (order.length !== existingPuzzles.length) {
      return Response.json(
        {
          error: "The order must contain every puzzle in the book",
          expected: existingPuzzles.length,
          received: order.length,
        },
        { status: 400 },
      );
    }

    const existingIds = new Set(existingPuzzles.map((puzzle) => puzzle.id));

    const invalidIds = order.filter((id: string) => !existingIds.has(id));

    if (invalidIds.length > 0) {
      return Response.json(
        {
          error: "Some puzzles do not belong to this book",
          invalidIds,
        },
        { status: 400 },
      );
    }

    /*
     * IMPORTANT
     *
     * BookPuzzle has unique constraints on:
     *
     *   (bookId, position)
     *   (bookId, displayNumber)
     *
     * Therefore we first move BOTH fields into
     * temporary unique ranges.
     *
     * Then we assign the final values.
     */

    const TEMP_POSITION_OFFSET = 1000000;
    const TEMP_DISPLAY_OFFSET = 2000000;

    await prisma.$transaction(
      async (tx) => {
        /*
         * STEP 1
         *
         * Move every puzzle to temporary values.
         *
         * We use updateMany instead of individual updates
         * to keep the transaction short.
         */
        for (let i = 0; i < existingPuzzles.length; i++) {
          await tx.bookPuzzle.update({
            where: {
              id: existingPuzzles[i].id,
            },
            data: {
              position: TEMP_POSITION_OFFSET + i,
              displayNumber: TEMP_DISPLAY_OFFSET + i,
            },
          });
        }

        /*
         * STEP 2
         *
         * Assign final position/displayNumber.
         */
        for (let i = 0; i < order.length; i++) {
          await tx.bookPuzzle.update({
            where: {
              id: order[i],
            },
            data: {
              position: i,
              displayNumber: i + 1,
            },
          });
        }
      },
      {
        timeout: 30000,
      },
    );

    /*
     * IMPORTANT:
     *
     * Fetch AFTER the transaction has committed.
     * This avoids P2028 caused by querying through
     * an expired/closed transaction.
     */
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

    return Response.json({
      success: true,
      data: {
        puzzles: updatedPuzzles,
        message: "Puzzles reordered successfully",
      },
    });
  } catch (error: any) {
    console.error("Reorder error:", error);

    if (error?.code === "P2002") {
      return Response.json(
        {
          error: "Conflict: Duplicate position or display number.",
        },
        { status: 409 },
      );
    }

    if (error?.code === "P2028") {
      return Response.json(
        {
          error: "The reorder operation timed out. Please try again.",
        },
        { status: 408 },
      );
    }

    return Response.json(
      {
        error: error?.message || "Failed to reorder puzzles",
      },
      { status: 500 },
    );
  }
}
