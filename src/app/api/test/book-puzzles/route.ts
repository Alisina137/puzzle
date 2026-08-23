import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.bookPuzzle.findMany({
      where: {
        bookId: "cmt4dft930001137gd2g4ntpo",
      },
      orderBy: {
        position: "asc",
      },
      select: {
        id: true,
        bookId: true,
        puzzleId: true,
        puzzleVersionId: true,
        position: true,
        displayNumber: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: rows.length,
      rows,
    });
  } catch (error) {
    console.error("[TEST] BookPuzzle query failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
