import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BookPuzzleService } from "@/modules/book";

export async function POST(
  request: NextRequest,
  { params }: { params: { bookId: string; puzzleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await BookPuzzleService.regeneratePuzzle(
      params.bookId,
      params.puzzleId,
      session.user.id
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: result.message === "Unauthorized" ? 401 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    console.error("[API] Error regenerating puzzle:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to regenerate puzzle",
      },
      { status: 500 }
    );
  }
}
