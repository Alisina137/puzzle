import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RecommendationService } from "@/modules/quality";

export async function POST(
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

    const result = await RecommendationService.applyAllCriticalFixes(params.bookId);
    
    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    console.error("[API] Error applying all fixes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to apply fixes",
      },
      { status: 500 }
    );
  }
}
