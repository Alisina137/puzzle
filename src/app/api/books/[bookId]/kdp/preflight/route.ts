import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { KDPPreflightService } from "@/modules/kdp";

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

    const result = await KDPPreflightService.runPreflight(
      params.bookId,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      data: result,
      statusText: KDPPreflightService.getStatusText(result),
    });
  } catch (error) {
    console.error("[API] Error running preflight:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to run preflight",
      },
      { status: 500 }
    );
  }
}
