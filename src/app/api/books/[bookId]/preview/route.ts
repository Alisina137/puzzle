import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BookPreviewService } from "@/modules/book";

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

    const preview = await BookPreviewService.getPreview(
      params.bookId,
      session.user.id
    );

    if (!preview) {
      return NextResponse.json(
        { success: false, error: "Preview not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    console.error("[API] Error getting preview:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get preview",
      },
      { status: 500 }
    );
  }
}
