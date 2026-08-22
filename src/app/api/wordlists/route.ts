import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { WordListService, CreateWordListInput } from "@/modules/wordlist";
import { z } from "zod";

const createWordListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  words: z.array(z.string().min(1).max(50)),
  isPublic: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const wordLists = await WordListService.getUserWordLists(session.user.id);
    
    return NextResponse.json({
      success: true,
      data: wordLists,
      count: wordLists.length,
    });
  } catch (error) {
    console.error("[API] Error fetching word lists:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch word lists",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validationResult = createWordListSchema.safeParse(body);
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

    const data = validationResult.data as CreateWordListInput;
    const wordList = await WordListService.createWordList(session.user.id, data);
    
    return NextResponse.json({
      success: true,
      data: wordList,
    }, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating word list:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create word list",
      },
      { status: 500 }
    );
  }
}
