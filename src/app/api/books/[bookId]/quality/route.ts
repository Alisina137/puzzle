import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { QualityReportService } from "@/modules/quality";

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

    const report = await QualityReportService.getReport(params.bookId);
    
    if (!report) {
      return NextResponse.json(
        { success: false, error: "Quality report not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("[API] Error fetching quality report:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch quality report",
      },
      { status: 500 }
    );
  }
}

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

    const report = await QualityReportService.generateReport(params.bookId);
    
    if (!report) {
      return NextResponse.json(
        { success: false, error: "Failed to generate quality report" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: report,
      message: "Quality report generated successfully",
    });
  } catch (error) {
    console.error("[API] Error generating quality report:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate quality report",
      },
      { status: 500 }
    );
  }
}
