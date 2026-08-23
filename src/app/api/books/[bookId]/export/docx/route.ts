import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DOCXGenerator } from "@/modules/docx/docx-generator";
import { z } from "zod";

const docxExportSchema = z.object({
  includeSolutions: z.boolean().optional(),
  solutionPlacement: z.enum(["end", "after_each", "none"]).optional(),
  largePrint: z.boolean().optional(),
  pageNumbering: z.boolean().optional(),
  title: z.string().optional(),
  author: z.string().optional(),
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

    const validationResult = docxExportSchema.safeParse(body);
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

    const result = await DOCXGenerator.generateBookDOCX(
      params.bookId,
      session.user.id,
      validationResult.data
    );

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        {
          success: false,
          error: result?.error || "Failed to generate DOCX",
        },
        { status: 500 }
      );
    }

    // Convert Buffer to Uint8Array for Response
    const buffer = result.buffer;
    const uint8Array = new Uint8Array(buffer);

    return new Response(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[API] Error exporting DOCX:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to export DOCX",
      },
      { status: 500 }
    );
  }
}
