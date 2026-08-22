import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { WordListService, UpdateWordListInput } from "@/modules/wordlist";
import { z } from "zod";

const updateWordListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  words: z.array(z.string().min(1).max(50)).optional(),
  isPublic: z.boolean().optional(),
});

export async function GET(
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

    const wordList = await WordListService.getWordListById(params.id, session.user.id);
    
    if (!wordList) {
      return NextResponse.json(
        { success: false, error: "Word list not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: wordList,
    });
  } catch (error) {
    console.error("[API] Error fetching word list:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch word list",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    
    const validationResult = updateWordListSchema.safeParse(body);
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

    const data = validationResult.data as UpdateWordListInput;
    const wordList = await WordListService.updateWordList(params.id, session.user.id, data);
    
    if (!wordList) {
      return NextResponse.json(
        { success: false, error: "Word list not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: wordList,
    });
  } catch (error) {
    console.error("[API] Error updating word list:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update word list",
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

    const result = await WordListService.deleteWordList(params.id, session.user.id);
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Word list not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Word list deleted successfully",
    });
  } catch (error) {
    console.error("[API] Error deleting word list:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete word list",
      },
      { status: 500 }
    );
  }
}
