import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadThemeDomains } from "@/modules/theme/vocabulary/word-list-loader";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const theme = decodeURIComponent(params.id);
    const domainInfo = loadThemeDomains(theme);

    return NextResponse.json({
      success: true,
      data: domainInfo,
    });
  } catch (error) {
    console.error("[API] Error fetching domains:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch domains" },
      { status: 500 },
    );
  }
}
