import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RecommendationService } from "@/modules/quality";
import { z } from "zod";

const applyFixSchema = z.object({
  puzzleId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { bookId: string; id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validationResult = applyFixSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const result = await RecommendationService.applyFix(
      params.bookId,
      params.id,
      validationResult.data.puzzleId,
    );

    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    console.error("[API] Error applying fix:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to apply fix",
      },
      { status: 500 },
    );
  }
}
