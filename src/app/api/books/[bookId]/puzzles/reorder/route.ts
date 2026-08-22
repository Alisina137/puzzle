import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BookReorderService } from "@/modules/book";
import { z } from "zod";

const reorderSchema = z.object({
  puzzleOrder: z.array(z.string().min(1)),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validationResult = reorderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const result = await BookReorderService.reorderPuzzles(
      params.bookId,
      validationResult.data.puzzleOrder,
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
    console.error("[API] Error reordering puzzles:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to reorder puzzles",
      },
      { status: 500 }
    );
  }
}
