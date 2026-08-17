import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
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

    const body = await req.json();
    const { order } = body;

    if (!Array.isArray(order) || order.length === 0) {
      return Response.json(
        { error: "Valid order array is required" },
        { status: 400 },
      );
    }

    // Prevent duplicate IDs in the submitted order
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

    // Get ALL puzzles belonging to this book
    const existingPuzzles = await prisma.bookPuzzle.findMany({
      where: { bookId },
      select: {
        id: true,
        position: true,
      },
      orderBy: {
        position: "asc",
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
     * IMPORTANT:
     *
     * The database has a unique constraint:
     *
     *   (bookId, position)
     *
     * Therefore we cannot directly change:
     *
     *   A: 0 -> 1
     *   B: 1 -> 0
     *
     * because the first update would temporarily create:
     *
     *   A: 1
     *   B: 1
     *
     * Instead:
     *
     *   Step 1: move everything to temporary positions
     *   Step 2: assign the final positions
     */

    const updatedPuzzles = await prisma.$transaction(async (tx) => {
      // Step 1: Move every puzzle to a unique temporary position.
      //
      // Negative positions are safe because normal positions
      // start at 0.
      for (let i = 0; i < existingPuzzles.length; i++) {
        await tx.bookPuzzle.update({
          where: {
            id: existingPuzzles[i].id,
          },
          data: {
            position: -(i + 1),
          },
        });
      }

      // Step 2: Assign final positions.
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

      // Return the final order
      return tx.bookPuzzle.findMany({
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

    if (error.code === "P2002") {
      return Response.json(
        {
          error: "Conflict: Duplicate position. Please try again.",
        },
        { status: 409 },
      );
    }

    return Response.json(
      {
        error: error.message || "Failed to reorder puzzles",
      },
      { status: 500 },
    );
  }
}
