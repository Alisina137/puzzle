import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { KDPConfigService, KDPConfigInput } from "@/modules/kdp";
import { z } from "zod";

const kdpConfigSchema = z.object({
  trimSize: z.string().min(1),
  hasBleed: z.boolean().optional(),
  marginTop: z.number().int().min(0).max(200).optional(),
  marginBottom: z.number().int().min(0).max(200).optional(),
  marginLeft: z.number().int().min(0).max(200).optional(),
  marginRight: z.number().int().min(0).max(200).optional(),
  gutter: z.number().int().min(0).max(100).optional(),
  largePrint: z.boolean().optional(),
  pageNumbering: z.boolean().optional(),
  solutionPlacement: z.enum(["end", "after_each", "none"]).optional(),
  includeSolution: z.boolean().optional(),
});

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

    const config = await KDPConfigService.getConfig(params.bookId, session.user.id);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("[API] Error fetching KDP config:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch KDP config",
      },
      { status: 500 }
    );
  }
}

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

    const validationResult = kdpConfigSchema.safeParse(body);
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

    const config = await KDPConfigService.upsertConfig(
      params.bookId,
      session.user.id,
      validationResult.data as KDPConfigInput
    );

    return NextResponse.json({
      success: true,
      data: config,
      message: "KDP configuration saved successfully",
    });
  } catch (error) {
    console.error("[API] Error saving KDP config:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save KDP config",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await KDPConfigService.deleteConfig(params.bookId, session.user.id);

    return NextResponse.json({
      success: true,
      message: "KDP configuration deleted successfully",
    });
  } catch (error) {
    console.error("[API] Error deleting KDP config:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete KDP config",
      },
      { status: 500 }
    );
  }
}
