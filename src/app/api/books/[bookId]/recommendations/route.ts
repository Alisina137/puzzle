import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RecommendationService } from "@/modules/quality";

export async function GET(
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

    const result = await RecommendationService.getRecommendations(params.bookId);
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Failed to generate recommendations" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[API] Error fetching recommendations:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch recommendations",
      },
      { status: 500 }
    );
  }
}
