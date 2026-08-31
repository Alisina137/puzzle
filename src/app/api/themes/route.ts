import { NextRequest, NextResponse } from "next/server";
import {
  THEME_WORDS,
  themeLabels,
  themeCategories,
} from "@/modules/theme/word-lists";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";

    // Get all theme keys from word-lists
    const themeKeys = Object.keys(THEME_WORDS);

    // Build theme list with word counts
    let themes = themeKeys.map((key) => {
      const themeWords = THEME_WORDS[key as keyof typeof THEME_WORDS];

      // Count total words across all levels
      let totalCount = 0;
      const levels = ["simple", "intermediate", "hard"];
      levels.forEach((level) => {
        const levelKey = level as keyof typeof themeWords;
        if (themeWords[levelKey] && Array.isArray(themeWords[levelKey])) {
          totalCount += themeWords[levelKey].length;
        }
      });

      // Count words per level
      const levelCounts: Record<string, number> = {};
      levels.forEach((level) => {
        const levelKey = level as keyof typeof themeWords;
        if (themeWords[levelKey] && Array.isArray(themeWords[levelKey])) {
          levelCounts[level] = themeWords[levelKey].length;
        } else {
          levelCounts[level] = 0;
        }
      });

      return {
        value: key,
        label: themeLabels[key as keyof typeof themeLabels] || key,
        category:
          themeCategories[key as keyof typeof themeCategories] || "General",
        wordCount: totalCount,
        levelCounts: levelCounts,
      };
    });

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      themes = themes.filter(
        (theme) =>
          theme.label.toLowerCase().includes(searchLower) ||
          theme.category.toLowerCase().includes(searchLower) ||
          theme.value.toLowerCase().includes(searchLower),
      );
    }

    // Sort by label
    themes.sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({
      success: true,
      themes: themes,
      total: themes.length,
    });
  } catch (error) {
    console.error("[API] Error fetching themes from word-lists:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch themes",
      },
      { status: 500 },
    );
  }
}
