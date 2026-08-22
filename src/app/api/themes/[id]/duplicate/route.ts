import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ThemeService } from "@/modules/theme";
import { z } from "zod";

const duplicateThemeSchema = z.object({
  newName: z.string().min(1).max(100),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const validationResult = duplicateThemeSchema.safeParse(body);

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

    const theme = await ThemeService.duplicateTheme(
      params.id,
      validationResult.data.newName
    );

    if (!theme) {
      return NextResponse.json(
        { success: false, error: "Theme not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: theme,
      message: "Theme duplicated successfully",
    });
  } catch (error) {
    console.error("[API] Error duplicating theme:", error);

    return NextResponse.json(
      {
        message: "Failed to duplicate theme",
      },
      { status: 500 }
    );
  }
}
