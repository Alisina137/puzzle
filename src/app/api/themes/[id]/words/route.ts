import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ThemeService } from "@/modules/theme";
import { z } from "zod";

const addWordsSchema = z.object({
  words: z.array(z.string().min(1).max(50)),
});

const removeWordsSchema = z.object({
  wordIds: z.array(z.string().min(1)),
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
    
    const validationResult = addWordsSchema.safeParse(body);
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

    const theme = await ThemeService.addWordsToTheme(
      params.id,
      validationResult.data.words
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
      message: `${validationResult.data.words.length} words added successfully`,
    });
  } catch (error) {
    console.error("[API] Error adding words to theme:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add words",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    
    const validationResult = removeWordsSchema.safeParse(body);
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

    const theme = await ThemeService.removeWordsFromTheme(
      params.id,
      validationResult.data.wordIds
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
      message: `${validationResult.data.wordIds.length} words removed successfully`,
    });
  } catch (error) {
    console.error("[API] Error removing words from theme:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to remove words",
      },
      { status: 500 }
    );
  }
}
