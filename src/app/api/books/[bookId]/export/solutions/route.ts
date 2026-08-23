import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SolutionsExportService } from "@/modules/export";
import { z } from "zod";

const solutionsExportSchema = z.object({
  format: z.enum(["pdf", "txt"]).default("pdf"),
  includeWordList: z.boolean().optional(),
  includeCoordinates: z.boolean().optional(),
});

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

    const body = await request.json();

    const validationResult = solutionsExportSchema.safeParse(body);
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

    const result = await SolutionsExportService.exportSolutions(
      params.bookId,
      session.user.id,
      validationResult.data
    );

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        {
          success: false,
          error: result?.error || "Failed to export solutions",
        },
        { status: 500 }
      );
    }

    const buffer = result.buffer;
    const uint8Array = new Uint8Array(buffer);
    const contentType = validationResult.data.format === "pdf"
      ? "application/pdf"
      : "text/plain";

    return new Response(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[API] Error exporting solutions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to export solutions",
      },
      { status: 500 }
    );
  }
}
