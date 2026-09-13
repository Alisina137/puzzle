import { NextRequest, NextResponse } from "next/server";
import { TitleSuggestionService } from "@/modules/book/title-suggestion.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { theme, difficultyLevel, targetAudience, puzzleCount } = body;

    if (!theme || !difficultyLevel || !targetAudience || !puzzleCount) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: theme, difficultyLevel, targetAudience, puzzleCount",
        },
        { status: 400 },
      );
    }

    const result = await TitleSuggestionService.suggestTitles({
      theme: String(theme),
      difficultyLevel: String(difficultyLevel),
      targetAudience: String(targetAudience),
      puzzleCount: Number(puzzleCount),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[API] /books/suggest-titles error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate title suggestions" },
      { status: 502 },
    );
  }
}
